"""Create a blank, auditable adjudication sheet from real-query candidates.

This script never invents clinical labels or reviewer identities. Humans must
de-identify and independently review every included row before the holdout can
be built by ``build_clinical_holdout.py``.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FIELDS = [
    "source_row",
    "source_type",
    "source_reference",
    "raw_query",
    "deidentified_query",
    "primary_include",
    "primary_disease_id",
    "primary_is_emergency",
    "primary_syndrome_category",
    "primary_reviewer_id",
    "secondary_include",
    "secondary_disease_id",
    "secondary_is_emergency",
    "secondary_syndrome_category",
    "secondary_reviewer_id",
    "adjudicated_include",
    "adjudicated_disease_id",
    "adjudicated_is_emergency",
    "adjudicated_syndrome_category",
    "adjudicator_id",
    "review_status",
    "exclusion_reason",
    "notes",
]


def prepare(source: Path, destination: Path, *, force: bool = False) -> int:
    if destination.exists() and not force:
        raise FileExistsError(f"Refusing to overwrite existing review work: {destination}")
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        for index, row in enumerate(rows, 1):
            writer.writerow({
                "source_row": index,
                "source_type": "deidentified_real_case",
                "source_reference": f"{source.name}#row-{index:04d}",
                "raw_query": row.get("query", ""),
                "deidentified_query": "",
                **{field: "" for field in FIELDS[5:]},
            })
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="data/test_cases/real_benchmark_candidates.csv")
    parser.add_argument("--output", default="data/clinical_review/clinical_adjudication.csv")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    source = ROOT / args.source
    destination = ROOT / args.output
    count = prepare(source, destination, force=args.force)
    print(f"Created {destination} with {count} unlabeled rows.")
    print("No clinical labels or reviewer identities were generated.")


if __name__ == "__main__":
    main()
