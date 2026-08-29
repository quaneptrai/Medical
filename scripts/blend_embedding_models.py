"""Create a deployable model by scaling a fine-tuned weight delta."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import torch
from sentence_transformers import SentenceTransformer


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reconstruct_target_tensor(
    base_tensor: torch.Tensor,
    source_blend_tensor: torch.Tensor,
    *,
    source_alpha: float,
    target_alpha: float,
) -> torch.Tensor:
    """Extrapolate a target blend from a known linear blend.

    If the known blend is quantized, its rounding error is amplified by
    ``target_alpha / source_alpha``. Callers must preserve that limitation in
    the manifest and evaluate the reconstructed artifact before deployment.
    """
    if not 0.0 < source_alpha <= 1.0:
        raise ValueError("source_alpha must be in (0, 1]")
    if not 0.0 < target_alpha <= 1.0:
        raise ValueError("target_alpha must be in (0, 1]")
    source = source_blend_tensor.to(dtype=base_tensor.dtype)
    return base_tensor + (source - base_tensor) * (target_alpha / source_alpha)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="BAAI/bge-m3")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--tuned-model")
    source_group.add_argument(
        "--source-blend",
        help="Known linear blend to extrapolate from when the tuned checkpoint is unavailable",
    )
    parser.add_argument("--source-alpha", type=float)
    parser.add_argument("--output", required=True)
    parser.add_argument("--alpha", type=float, default=0.07)
    parser.add_argument("--output-dtype", choices=("float32", "float16"), default="float32")
    args = parser.parse_args()
    if not 0.0 < args.alpha <= 1.0:
        parser.error("--alpha must be in (0, 1]")

    output = Path(args.output)
    source_reference = args.source_blend or args.tuned_model
    source_path = Path(source_reference)
    if output.resolve() == source_path.resolve():
        parser.error("--output must differ from the source model")
    if args.source_blend and args.source_alpha is None:
        parser.error("--source-alpha is required with --source-blend")
    if args.tuned_model and args.source_alpha is not None:
        parser.error("--source-alpha is only valid with --source-blend")

    print(f"Loading base model: {args.base_model}")
    base = SentenceTransformer(args.base_model, device="cpu")
    source_kind = "known blend" if args.source_blend else "tuned model"
    print(f"Loading {source_kind}: {source_reference}")
    source_model = SentenceTransformer(source_reference, device="cpu")

    base_state = base.state_dict()
    source_state = source_model.state_dict()
    if base_state.keys() != source_state.keys():
        missing = sorted(base_state.keys() - source_state.keys())
        extra = sorted(source_state.keys() - base_state.keys())
        raise ValueError(f"Model state keys differ; missing={missing[:5]}, extra={extra[:5]}")

    with torch.no_grad():
        for name, base_tensor in base_state.items():
            source_tensor = source_state[name]
            if base_tensor.shape != source_tensor.shape:
                raise ValueError(f"Shape mismatch for {name}: {base_tensor.shape} vs {source_tensor.shape}")
            if base_tensor.is_floating_point():
                if args.source_blend:
                    recovered = reconstruct_target_tensor(
                        base_tensor,
                        source_tensor,
                        source_alpha=args.source_alpha,
                        target_alpha=args.alpha,
                    )
                    base_tensor.copy_(recovered)
                else:
                    base_tensor.lerp_(source_tensor.to(dtype=base_tensor.dtype), args.alpha)
            elif not torch.equal(base_tensor, source_tensor):
                raise ValueError(f"Non-floating state differs for {name}")

    if args.output_dtype == "float16":
        base.half()

    output.mkdir(parents=True, exist_ok=True)
    base.save_pretrained(str(output))
    model_file = output / "model.safetensors"
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "method": (
            "extrapolated_from_quantized_linear_blend"
            if args.source_blend
            else "linear_weight_delta_scaling"
        ),
        "base_model": args.base_model,
        "tuned_model": args.tuned_model,
        "source_blend": args.source_blend,
        "source_alpha": args.source_alpha,
        "alpha": args.alpha,
        "output_dtype": args.output_dtype,
        "model_sha256": _sha256(model_file),
        "selection_policy": "candidate only; requires paired evaluation before deployment",
        "limitations": (
            [
                "The original tuned checkpoint was unavailable.",
                "FP16 source-blend rounding error is amplified by target_alpha/source_alpha.",
                "This reconstructed candidate is not bit-equivalent to a blend made from the FP32 tuned checkpoint.",
            ]
            if args.source_blend
            else []
        ),
    }
    (output / "blend_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[SUCCESS] Blended model saved to {output}")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
