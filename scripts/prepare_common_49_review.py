"""Create a blank clinician-review sheet for the curated common-disease corpus."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from scripts.validate_common_49_readiness import REVIEW_FIELDS


def prepare(source: Path, destination: Path, *, force: bool = False) -> int:
    if destination.exists() and not force:
        raise FileExistsError(f"Refusing to overwrite existing review work: {destination}")
    entries = json.loads(source.read_text(encoding="utf-8"))
    if len(entries) != 49:
        raise ValueError(f"Expected 49 manual diseases, found {len(entries)}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=REVIEW_FIELDS)
        writer.writeheader()
        for index, entry in enumerate(entries, 604):
            writer.writerow({
                "disease_id": f"EXP_{index:03d}",
                "review_status": "",
                "reviewer_id": "",
                "content_accuracy": "",
                "red_flag_safety": "",
                "urgency_appropriate": "",
                "reviewed_at": "",
                "notes": f"Review: {entry['name_vi']}",
            })
    return len(entries)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="data/common_diseases_manual.json")
    parser.add_argument("--output", default="data/clinical_review/common_49_review.csv")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    count = prepare(ROOT / args.source, ROOT / args.output, force=args.force)
    print(f"Created {args.output} with {count} blank review rows.")
    print("No reviewer identity or clinical approval was invented.")


if __name__ == "__main__":
    main()
