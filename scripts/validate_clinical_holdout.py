"""Validate and fingerprint a frozen, independently reviewed clinical holdout."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from evaluation.holdout_schema import ClinicalHoldoutDataset, validate_release_holdout


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset")
    parser.add_argument("--min-emergencies", type=int, default=200)
    parser.add_argument("--min-non-emergencies", type=int, default=200)
    parser.add_argument("--manifest", default="artifacts/evaluation/clinical_holdout_manifest.json")
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    if not dataset_path.is_absolute():
        dataset_path = ROOT / dataset_path
    raw = dataset_path.read_bytes()
    dataset = ClinicalHoldoutDataset.model_validate_json(raw)
    result = validate_release_holdout(
        dataset,
        min_emergencies=args.min_emergencies,
        min_non_emergencies=args.min_non_emergencies,
    )
    manifest = {
        **result,
        "dataset": str(dataset_path.resolve()),
        "dataset_id": dataset.dataset_id,
        "frozen_at": dataset.frozen_at.isoformat(),
        "sha256": hashlib.sha256(raw).hexdigest(),
    }
    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = ROOT / manifest_path
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    if not result["release_ready"]:
        raise SystemExit("Clinical holdout is not release-ready")


if __name__ == "__main__":
    main()
