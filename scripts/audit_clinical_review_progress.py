"""Report human-adjudication progress without inventing or changing labels."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def audit(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    included = []
    excluded = 0
    incomplete = 0
    for row in rows:
        include = (row.get("adjudicated_include") or "").strip().casefold()
        status = (row.get("review_status") or "").strip().casefold()
        if include in {"false", "0", "no", "n", "không", "khong"}:
            excluded += 1
        elif include in {"true", "1", "yes", "y", "có", "co"} and status == "adjudicated":
            included.append(row)
        else:
            incomplete += 1
    emergency = sum(
        (row.get("adjudicated_is_emergency") or "").strip().casefold()
        in {"true", "1", "yes", "y", "có", "co"}
        for row in included
    )
    non_emergency = len(included) - emergency
    distinct_reviewers = {
        value.strip()
        for row in included
        for field in ("primary_reviewer_id", "secondary_reviewer_id", "adjudicator_id")
        if (value := (row.get(field) or "")).strip()
    }
    result = {
        "rows": len(rows),
        "adjudicated_included": len(included),
        "adjudicated_excluded": excluded,
        "incomplete": incomplete,
        "emergency": emergency,
        "non_emergency": non_emergency,
        "remaining_emergency_to_200": max(0, 200 - emergency),
        "remaining_non_emergency_to_200": max(0, 200 - non_emergency),
        "distinct_reviewer_ids": len(distinct_reviewers),
    }
    result["ready_to_build"] = (
        incomplete == 0 and emergency >= 200 and non_emergency >= 200
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input", default="data/clinical_review/clinical_adjudication.csv"
    )
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args()
    result = audit(ROOT / args.input)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.require_ready and not result["ready_to_build"]:
        raise SystemExit("Clinical adjudication is not ready to build")


if __name__ == "__main__":
    main()
