import csv
from datetime import datetime, timezone
from pathlib import Path

import pytest

from scripts.build_clinical_holdout import build_payload
from scripts.audit_clinical_review_progress import audit
from scripts.evaluate_final_clinical_holdout import _confusion
from scripts.prepare_clinical_adjudication import prepare
from scripts.prepare_common_49_review import prepare as prepare_common_49_review
from scripts.preflight_gpu_training import validate_frozen_holdout
from scripts.validate_common_49_readiness import validate_common_49


def test_prepare_adjudication_never_invents_labels(tmp_path):
    source = tmp_path / "candidates.csv"
    source.write_text("query,actual_label\nđau ngực dữ dội,\n", encoding="utf-8")
    destination = tmp_path / "review.csv"
    assert prepare(source, destination) == 1
    with destination.open(encoding="utf-8-sig", newline="") as handle:
        row = next(csv.DictReader(handle))
    assert row["raw_query"] == "đau ngực dữ dội"
    assert row["adjudicated_disease_id"] == ""
    assert row["primary_reviewer_id"] == ""


def test_build_holdout_rejects_blank_human_adjudication(tmp_path):
    source = tmp_path / "review.csv"
    source.write_text(
        "adjudicated_include,review_status\n,\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="adjudicated_include is blank"):
        build_payload(source, "clinical-final-v1", datetime.now(timezone.utc))


def test_gpu_preflight_blocks_missing_final_holdout(tmp_path):
    with pytest.raises(RuntimeError, match="Final clinical holdout is missing"):
        validate_frozen_holdout(tmp_path / "missing.json", tmp_path / "missing-manifest.json")


def test_common_49_review_template_never_invents_approval(tmp_path):
    destination = tmp_path / "common-review.csv"
    assert prepare_common_49_review(
        Path("data/common_diseases_manual.json"), destination
    ) == 49
    with destination.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 49
    assert all(not row["reviewer_id"] and not row["review_status"] for row in rows)
    with pytest.raises(ValueError, match="clinical review"):
        validate_common_49(
            Path("data/common_diseases_manual.json"),
            Path("data/diseases_expanded"),
            Path("data/test_cases/common_49_validation.json"),
            destination,
            require_clinical_review=True,
        )


def test_clinical_progress_audit_reports_blank_rows_without_labels(tmp_path):
    source = tmp_path / "candidates.csv"
    source.write_text("query,actual_label\nca thu nhat,\nca thu hai,\n", encoding="utf-8")
    review = tmp_path / "review.csv"
    prepare(source, review)
    result = audit(review)
    assert result["rows"] == 2
    assert result["incomplete"] == 2
    assert result["emergency"] == 0
    assert result["non_emergency"] == 0
    assert result["ready_to_build"] is False


def test_final_holdout_confusion_reports_wilson_intervals():
    result = _confusion(
        [True, True, False, False],
        [True, False, False, True],
    )
    assert result["tp"] == 1
    assert result["fn"] == 1
    assert result["tn"] == 1
    assert result["fp"] == 1
    assert result["recall"] == pytest.approx(0.5)
    assert result["specificity"] == pytest.approx(0.5)
    assert len(result["recall_wilson_95"]) == 2
