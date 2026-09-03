"""Build the frozen final holdout from a completed human adjudication sheet."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def _boolean(value: str, field: str, row_number: int) -> bool:
    normalized = value.strip().casefold()
    if normalized in {"true", "1", "yes", "y", "có", "co"}:
        return True
    if normalized in {"false", "0", "no", "n", "không", "khong"}:
        return False
    raise ValueError(f"row {row_number}: {field} must be true or false")


def build_payload(path: Path, dataset_id: str, frozen_at: datetime) -> tuple[dict, dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    cases = []
    excluded = 0
    disagreements = 0
    for row_number, row in enumerate(rows, 1):
        status = (row.get("review_status") or "").strip().casefold()
        include_text = (row.get("adjudicated_include") or "").strip()
        if not include_text:
            raise ValueError(f"row {row_number}: adjudicated_include is blank")
        include = _boolean(include_text, "adjudicated_include", row_number)
        if not include:
            if not (row.get("exclusion_reason") or "").strip():
                raise ValueError(f"row {row_number}: excluded row requires exclusion_reason")
            excluded += 1
            continue
        if status != "adjudicated":
            raise ValueError(f"row {row_number}: included row must have review_status=adjudicated")
        required = [
            "deidentified_query", "adjudicated_is_emergency",
            "adjudicated_syndrome_category", "primary_reviewer_id",
            "secondary_reviewer_id", "adjudicator_id", "source_type",
            "source_reference", "primary_is_emergency", "secondary_is_emergency",
            "primary_include", "secondary_include", "primary_syndrome_category",
            "secondary_syndrome_category",
        ]
        missing = [field for field in required if not (row.get(field) or "").strip()]
        if missing:
            raise ValueError(f"row {row_number}: missing required fields {missing}")
        primary_emergency = _boolean(row["primary_is_emergency"], "primary_is_emergency", row_number)
        secondary_emergency = _boolean(row["secondary_is_emergency"], "secondary_is_emergency", row_number)
        final_emergency = _boolean(row["adjudicated_is_emergency"], "adjudicated_is_emergency", row_number)
        primary_include = _boolean(row["primary_include"], "primary_include", row_number)
        secondary_include = _boolean(row["secondary_include"], "secondary_include", row_number)
        if (
            primary_include != secondary_include
            or primary_emergency != secondary_emergency
            or (row.get("primary_disease_id") or "").strip() != (row.get("secondary_disease_id") or "").strip()
            or row["primary_syndrome_category"].strip() != row["secondary_syndrome_category"].strip()
        ):
            disagreements += 1
        cases.append({
            "case_id": f"HLD_{len(cases) + 1:04d}",
            "query": row["deidentified_query"].strip(),
            "is_emergency": final_emergency,
            "syndrome_category": row["adjudicated_syndrome_category"].strip(),
            "ground_truth_disease_id": (row.get("adjudicated_disease_id") or "").strip() or None,
            "source_type": row["source_type"].strip(),
            "source_reference": row["source_reference"].strip(),
            "primary_reviewer_id": row["primary_reviewer_id"].strip(),
            "secondary_reviewer_id": row["secondary_reviewer_id"].strip(),
            "adjudicator_id": row["adjudicator_id"].strip(),
            "review_status": "adjudicated",
            "split": "final_holdout",
            "notes": (row.get("notes") or "").strip() or None,
        })
    payload = {
        "schema_version": 1,
        "dataset_id": dataset_id,
        "intended_use": "final_evaluation_only",
        "frozen_at": frozen_at.astimezone(timezone.utc).isoformat(),
        "cases": cases,
    }
    summary = {
        "reviewed_rows": len(rows),
        "included": len(cases),
        "excluded": excluded,
        "primary_secondary_disagreements": disagreements,
    }
    return payload, summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/clinical_review/clinical_adjudication.csv")
    parser.add_argument("--output", default="data/test_cases/clinical_holdout.json")
    parser.add_argument("--summary", default="data/clinical_review/adjudication_summary.json")
    parser.add_argument("--dataset-id", required=True)
    parser.add_argument("--frozen-at", help="ISO-8601 UTC timestamp; defaults to now")
    args = parser.parse_args()
    frozen_at = datetime.fromisoformat(args.frozen_at.replace("Z", "+00:00")) if args.frozen_at else datetime.now(timezone.utc)
    payload, summary = build_payload(ROOT / args.input, args.dataset_id, frozen_at)

    # Validate fully before writing either artifact. This rejects fake/incomplete review rows.
    from src.evaluation.holdout_schema import ClinicalHoldoutDataset, validate_release_holdout

    dataset = ClinicalHoldoutDataset.model_validate(payload)
    validation = validate_release_holdout(dataset)
    if not validation["release_ready"]:
        raise SystemExit("Clinical holdout is not release-ready: " + "; ".join(validation["errors"]))
    output = ROOT / args.output
    summary_path = ROOT / args.summary
    output.parent.mkdir(parents=True, exist_ok=True)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    summary_path.write_text(json.dumps({**summary, **validation}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Frozen holdout: {output}")
    print(json.dumps({**summary, **validation}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
