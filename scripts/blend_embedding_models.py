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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="BAAI/bge-m3")
    parser.add_argument("--tuned-model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--alpha", type=float, default=0.07)
    args = parser.parse_args()
    if not 0.0 < args.alpha <= 1.0:
        parser.error("--alpha must be in (0, 1]")

    output = Path(args.output)
    tuned_path = Path(args.tuned_model)
    if output.resolve() == tuned_path.resolve():
        parser.error("--output must differ from --tuned-model")

    print(f"Loading base model: {args.base_model}")
    base = SentenceTransformer(args.base_model, device="cpu")
    print(f"Loading tuned model: {args.tuned_model}")
    tuned = SentenceTransformer(args.tuned_model, device="cpu")

    base_state = base.state_dict()
    tuned_state = tuned.state_dict()
    if base_state.keys() != tuned_state.keys():
        missing = sorted(base_state.keys() - tuned_state.keys())
        extra = sorted(tuned_state.keys() - base_state.keys())
        raise ValueError(f"Model state keys differ; missing={missing[:5]}, extra={extra[:5]}")

    with torch.no_grad():
        for name, base_tensor in base_state.items():
            tuned_tensor = tuned_state[name]
            if base_tensor.shape != tuned_tensor.shape:
                raise ValueError(f"Shape mismatch for {name}: {base_tensor.shape} vs {tuned_tensor.shape}")
            if base_tensor.is_floating_point():
                base_tensor.lerp_(tuned_tensor.to(dtype=base_tensor.dtype), args.alpha)
            elif not torch.equal(base_tensor, tuned_tensor):
                raise ValueError(f"Non-floating state differs for {name}")

    output.mkdir(parents=True, exist_ok=True)
    base.save_pretrained(str(output))
    model_file = output / "model.safetensors"
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "method": "linear_weight_delta_scaling",
        "base_model": args.base_model,
        "tuned_model": args.tuned_model,
        "alpha": args.alpha,
        "model_sha256": _sha256(model_file),
        "selection_policy": "largest tested alpha with zero emergency_recall@5 regression",
    }
    (output / "blend_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[SUCCESS] Blended model saved to {output}")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
