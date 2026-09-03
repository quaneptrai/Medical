from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from src.evaluation.holdout_schema import (
    ClinicalHoldoutCase,
    ClinicalHoldoutDataset,
    validate_release_holdout,
)


def _case(case_id="HLD_0001", query="đau ngực dữ dội lan tay trái", emergency=True):
    return ClinicalHoldoutCase(
        case_id=case_id,
        query=query,
        is_emergency=emergency,
        syndrome_category="cardiology",
        source_type="independently_authored_clinical_case",
        source_reference="internal protocol",
        primary_reviewer_id="doctor-a",
        secondary_reviewer_id="doctor-b",
        adjudicator_id="doctor-c",
        review_status="adjudicated",
    )


def test_holdout_requires_independent_reviewers():
    payload = _case().model_dump()
    payload["secondary_reviewer_id"] = "doctor-a"
    with pytest.raises(ValidationError, match="must be distinct"):
        ClinicalHoldoutCase(**payload)


def test_holdout_release_gate_enforces_counts_and_uniqueness():
    dataset = ClinicalHoldoutDataset(
        dataset_id="clinical-final-v1",
        frozen_at=datetime.now(timezone.utc),
        cases=[
            _case(),
            _case("HLD_0002", "hắt hơi sổ mũi hai ngày", False),
        ],
    )
    passed = validate_release_holdout(dataset, min_emergencies=1, min_non_emergencies=1)
    assert passed["release_ready"] is True
    blocked = validate_release_holdout(dataset)
    assert blocked["release_ready"] is False
    assert len(blocked["errors"]) == 2


def test_holdout_rejects_duplicate_case_ids_even_when_queries_differ():
    dataset = ClinicalHoldoutDataset(
        dataset_id="clinical-final-v1",
        frozen_at=datetime.now(timezone.utc),
        cases=[
            _case(),
            _case("HLD_0001", "khó thở tăng dần khi nằm", False),
        ],
    )
    result = validate_release_holdout(dataset, min_emergencies=0, min_non_emergencies=0)
    assert result["release_ready"] is False
    assert "duplicate case IDs" in result["errors"][0]


@pytest.mark.parametrize(
    "query",
    [
        "liên hệ tôi qua patient@example.com vì đang đau ngực",
        "tôi khó thở hãy gọi số 0912345678 giúp tôi",
    ],
)
def test_holdout_rejects_obvious_identifiers(query):
    payload = _case().model_dump()
    payload["query"] = query
    with pytest.raises(ValidationError, match="de-identified|phone number"):
        ClinicalHoldoutCase(**payload)
