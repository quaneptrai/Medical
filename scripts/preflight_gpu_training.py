"""Cheap, read-only gates that must pass before starting a paid GPU run."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from evaluation.holdout_schema import ClinicalHoldoutDataset, validate_release_holdout
from scripts.validate_common_49_readiness import validate_common_49


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_frozen_holdout(dataset_path: Path, manifest_path: Path) -> dict:
    if not dataset_path.exists():
        raise RuntimeError(
            f"Final clinical holdout is missing: {dataset_path}. Complete human adjudication first."
        )
    raw = dataset_path.read_bytes()
    dataset = ClinicalHoldoutDataset.model_validate_json(raw)
    result = validate_release_holdout(dataset)
    if not result["release_ready"]:
        raise RuntimeError("Final clinical holdout is not release-ready: " + "; ".join(result["errors"]))
    if not manifest_path.exists():
        raise RuntimeError(f"Frozen holdout manifest is missing: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    current_hash = hashlib.sha256(raw).hexdigest()
    if not manifest.get("release_ready") or manifest.get("sha256") != current_hash:
        raise RuntimeError("Clinical holdout manifest is stale or does not match the frozen dataset")
    if manifest.get("dataset_id") != dataset.dataset_id:
        raise RuntimeError("Clinical holdout dataset_id does not match its manifest")
    return {**result, "dataset_id": dataset.dataset_id, "sha256": current_hash}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--holdout", default="data/test_cases/clinical_holdout.json")
    parser.add_argument("--manifest", default="artifacts/evaluation/clinical_holdout_manifest.json")
    parser.add_argument("--base-revision", required=True)
    parser.add_argument("--incumbent", default="models/bge-m3-medical-v2-recovered-a050-fp16")
    parser.add_argument("--report", default="artifacts/evaluation/gpu_training_preflight.json")
    args = parser.parse_args()
    if len(args.base_revision) != 40 or any(c not in "0123456789abcdef" for c in args.base_revision.casefold()):
        raise SystemExit("--base-revision must be a full 40-character commit SHA")
    blockers = []
    holdout = None
    common_49 = None
    try:
        holdout = validate_frozen_holdout(ROOT / args.holdout, ROOT / args.manifest)
    except (RuntimeError, ValueError) as exc:
        blockers.append(str(exc))
    try:
        common_49 = validate_common_49(
            ROOT / "data" / "common_diseases_manual.json",
            ROOT / "data" / "diseases_expanded",
            ROOT / "data" / "test_cases" / "common_49_validation.json",
            ROOT / "data" / "clinical_review" / "common_49_review.csv",
            require_clinical_review=True,
        )
    except (RuntimeError, ValueError) as exc:
        blockers.append(str(exc))
    incumbent = ROOT / args.incumbent
    if not (incumbent / "model.safetensors").exists():
        blockers.append(f"Incumbent model is unavailable: {incumbent}")
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        commit = None
    try:
        dirty = subprocess.check_output(
            ["git", "status", "--porcelain"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        dirty = "git-status-unavailable"
    if dirty:
        blockers.append(
            "Git worktree is not clean. Commit the exact tested source/data before creating the GPU bundle."
        )
    result = {
        "preflight_passed": not blockers,
        "git_commit": commit,
        "base_revision": args.base_revision,
        "incumbent_model": str(incumbent),
        "incumbent_sha256": (
            sha256(incumbent / "model.safetensors")
            if (incumbent / "model.safetensors").exists()
            else None
        ),
        "frozen_holdout": holdout,
        "common_49": common_49,
        "git_worktree_clean": not bool(dirty),
        "blockers": blockers,
        "holdout_policy": "frozen before training; never used for tuning or model selection",
    }
    report = ROOT / args.report
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Preflight report: {report}")
    if blockers:
        raise SystemExit("Paid-run preflight blocked; see the structured report above")


if __name__ == "__main__":
    main()
