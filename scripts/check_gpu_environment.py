"""Fail fast when a paid GPU host cannot safely run the selected profile."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

PROFILE_REQUIREMENTS = {
    "cloud-a100": {"min_vram_gib": 38.0, "min_compute": (8, 0), "require_bf16": True},
    "cloud-a100-80": {"min_vram_gib": 75.0, "min_compute": (8, 0), "require_bf16": True},
    "cloud-48gb": {"min_vram_gib": 44.0, "min_compute": (7, 5), "require_bf16": False},
}


def validate_hardware(
    *,
    profile: str,
    gpu_name: str,
    vram_gib: float,
    compute_capability: tuple[int, int],
    bf16_supported: bool,
    free_disk_gib: float,
    min_free_disk_gib: float,
) -> list[str]:
    requirement = PROFILE_REQUIREMENTS[profile]
    errors = []
    if vram_gib < requirement["min_vram_gib"]:
        errors.append(
            f"{profile} requires >= {requirement['min_vram_gib']:.0f} GiB VRAM; "
            f"detected {vram_gib:.1f} GiB on {gpu_name}"
        )
    if compute_capability < requirement["min_compute"]:
        errors.append(
            f"{profile} requires compute capability >= "
            f"{requirement['min_compute'][0]}.{requirement['min_compute'][1]}; "
            f"detected {compute_capability[0]}.{compute_capability[1]}"
        )
    if requirement["require_bf16"] and not bf16_supported:
        errors.append(f"{profile} requires CUDA BF16 support")
    if free_disk_gib < min_free_disk_gib:
        errors.append(
            f"At least {min_free_disk_gib:.0f} GiB free disk is required; "
            f"detected {free_disk_gib:.1f} GiB"
        )
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=sorted(PROFILE_REQUIREMENTS), required=True)
    parser.add_argument("--min-free-disk-gib", type=float, default=75.0)
    args = parser.parse_args()

    import torch

    if not torch.cuda.is_available():
        raise SystemExit("GPU environment gate failed: CUDA-enabled PyTorch is unavailable")
    device = torch.cuda.current_device()
    properties = torch.cuda.get_device_properties(device)
    vram_gib = properties.total_memory / (1024**3)
    capability = torch.cuda.get_device_capability(device)
    free_disk_gib = shutil.disk_usage(ROOT).free / (1024**3)
    bf16_supported = bool(torch.cuda.is_bf16_supported())
    errors = validate_hardware(
        profile=args.profile,
        gpu_name=properties.name,
        vram_gib=vram_gib,
        compute_capability=capability,
        bf16_supported=bf16_supported,
        free_disk_gib=free_disk_gib,
        min_free_disk_gib=args.min_free_disk_gib,
    )
    print(json.dumps({
        "profile": args.profile,
        "gpu": properties.name,
        "vram_gib": round(vram_gib, 2),
        "compute_capability": f"{capability[0]}.{capability[1]}",
        "bf16_supported": bf16_supported,
        "torch": torch.__version__,
        "torch_cuda": torch.version.cuda,
        "free_disk_gib": round(free_disk_gib, 2),
    }, indent=2))
    if errors:
        raise SystemExit("GPU environment gate failed:\n- " + "\n- ".join(errors))


if __name__ == "__main__":
    main()
