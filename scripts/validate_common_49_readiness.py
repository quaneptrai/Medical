"""Validate the 49 common-disease corpus, reserved validation set, and human review."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import unicodedata
from collections import Counter
from pathlib import Path

from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from knowledge.schema import load_all_diseases

EXPECTED_IDS = {f"EXP_{index:03d}" for index in range(604, 653)}
REVIEW_FIELDS = (
    "disease_id",
    "review_status",
    "reviewer_id",
    "content_accuracy",
    "red_flag_safety",
    "urgency_appropriate",
    "reviewed_at",
    "notes",
)


def normalize(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_common_49(
    manual_path: Path,
    corpus_dir: Path,
    benchmark_path: Path,
    review_path: Path | None = None,
    *,
    require_clinical_review: bool = False,
) -> dict:
    manual = json.loads(manual_path.read_text(encoding="utf-8"))
    if not isinstance(manual, list) or len(manual) != 49:
        raise ValueError(f"Expected exactly 49 manual diseases, found {len(manual)}")

    all_diseases = load_all_diseases(corpus_dir)
    corpus = {disease.disease_id: disease for disease in all_diseases}
    missing_ids = sorted(EXPECTED_IDS - corpus.keys())
    if missing_ids:
        raise ValueError(f"Expanded corpus is missing common disease IDs: {missing_ids}")

    training_queries: set[str] = set()
    content_errors = []
    for offset, item in enumerate(manual, 604):
        disease_id = f"EXP_{offset:03d}"
        disease = corpus[disease_id]
        if disease.name_vi != item.get("name_vi"):
            content_errors.append(f"{disease_id}: manual/corpus name mismatch")
        if disease.tier != 1:
            content_errors.append(f"{disease_id}: tier must be 1")
        if disease.provenance is None or disease.provenance.reviewed_by is not None:
            content_errors.append(f"{disease_id}: provenance must honestly remain unreviewed")
        symptom_count = sum(len(group) for group in disease.symptoms.values())
        if symptom_count < 3:
            content_errors.append(f"{disease_id}: fewer than 3 symptoms")
        if len(disease.red_flags) < 1:
            content_errors.append(f"{disease_id}: missing red flags")
        if len(disease.differential_diagnoses) < 3:
            content_errors.append(f"{disease_id}: fewer than 3 differential diagnoses")
        if len(disease.user_language_variants) < 5:
            content_errors.append(f"{disease_id}: fewer than 5 training variants")
        for query in disease.user_language_variants:
            training_queries.add(normalize(query))
            training_queries.add(normalize(unidecode(query)))
    if content_errors:
        raise ValueError("Common-disease content gate failed: " + "; ".join(content_errors))

    payload = json.loads(benchmark_path.read_text(encoding="utf-8"))
    if payload.get("evaluation_role") != "model_selection_validation_not_clinical_holdout":
        raise ValueError("Common-49 benchmark must be marked as model-selection validation")
    cases = payload.get("cases")
    if not isinstance(cases, list):
        raise ValueError("Common-49 benchmark cases must be a list")
    counts = Counter()
    case_ids = set()
    normalized_queries = set()
    overlaps = []
    for row_number, case in enumerate(cases, 1):
        disease_id = case.get("disease_id")
        if disease_id not in EXPECTED_IDS:
            raise ValueError(f"benchmark row {row_number}: unexpected disease_id={disease_id}")
        disease = corpus[disease_id]
        if case.get("expected_disease") != disease.name_vi:
            raise ValueError(f"benchmark row {row_number}: expected name does not match corpus")
        case_id = case.get("case_id")
        if not case_id or case_id in case_ids:
            raise ValueError(f"benchmark row {row_number}: missing or duplicate case_id")
        case_ids.add(case_id)
        query = normalize(case.get("query", ""))
        if len(query) < 10 or query in normalized_queries:
            raise ValueError(f"benchmark row {row_number}: query is too short or duplicated")
        normalized_queries.add(query)
        if query in training_queries or normalize(unidecode(query)) in training_queries:
            overlaps.append(case_id)
        counts[disease_id] += 1
    if set(counts) != EXPECTED_IDS or any(count != 5 for count in counts.values()):
        raise ValueError(
            f"Common-49 benchmark must contain exactly 5 cases for every ID; counts={dict(counts)}"
        )
    if overlaps:
        raise ValueError(f"Validation queries overlap training variants: {overlaps}")

    review_summary = {"required": require_clinical_review, "approved": 0}
    if review_path is not None and review_path.exists():
        with review_path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        seen = set()
        invalid = []
        for row_number, row in enumerate(rows, 2):
            disease_id = (row.get("disease_id") or "").strip()
            if disease_id not in EXPECTED_IDS or disease_id in seen:
                invalid.append(f"row {row_number}: invalid/duplicate disease_id")
                continue
            seen.add(disease_id)
            approvals = [
                (row.get("review_status") or "").strip().casefold() == "approved",
                (row.get("content_accuracy") or "").strip().casefold() == "approved",
                (row.get("red_flag_safety") or "").strip().casefold() == "approved",
                (row.get("urgency_appropriate") or "").strip().casefold() == "approved",
                bool((row.get("reviewer_id") or "").strip()),
                bool((row.get("reviewed_at") or "").strip()),
            ]
            if all(approvals):
                review_summary["approved"] += 1
            else:
                invalid.append(f"{disease_id}: clinical review is incomplete")
        if seen != EXPECTED_IDS:
            invalid.append(f"review sheet missing IDs: {sorted(EXPECTED_IDS - seen)}")
        if require_clinical_review and invalid:
            preview = "; ".join(invalid[:5])
            remaining = len(invalid) - 5
            suffix = f"; ... and {remaining} more incomplete/invalid rows" if remaining > 0 else ""
            raise ValueError("Common-49 clinical review gate failed: " + preview + suffix)
    elif require_clinical_review:
        raise ValueError(f"Common-49 clinical review sheet is missing: {review_path}")

    if require_clinical_review and review_summary["approved"] != 49:
        raise ValueError(
            f"Common-49 clinical review gate requires 49 approvals, found {review_summary['approved']}"
        )
    return {
        "ready": not require_clinical_review or review_summary["approved"] == 49,
        "diseases": 49,
        "benchmark_cases": len(cases),
        "cases_per_disease": 5,
        "exact_train_overlap": 0,
        "manual_sha256": sha256(manual_path),
        "benchmark_sha256": sha256(benchmark_path),
        "clinical_review": review_summary,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manual", default="data/common_diseases_manual.json")
    parser.add_argument("--corpus", default="data/diseases_expanded")
    parser.add_argument("--benchmark", default="data/test_cases/common_49_validation.json")
    parser.add_argument("--review", default="data/clinical_review/common_49_review.csv")
    parser.add_argument("--require-clinical-review", action="store_true")
    args = parser.parse_args()
    result = validate_common_49(
        ROOT / args.manual,
        ROOT / args.corpus,
        ROOT / args.benchmark,
        ROOT / args.review,
        require_clinical_review=args.require_clinical_review,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
