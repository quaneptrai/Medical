"""Schema and release checks for the untouched clinical safety holdout."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class ClinicalHoldoutCase(BaseModel):
    case_id: str = Field(pattern=r"^HLD_\d{4}$")
    query: str = Field(min_length=10)
    is_emergency: bool
    syndrome_category: str = Field(min_length=2)
    ground_truth_disease_id: Optional[str] = None
    source_type: Literal["deidentified_real_case", "independently_authored_clinical_case"]
    source_reference: str = Field(min_length=3)
    primary_reviewer_id: str = Field(min_length=2)
    secondary_reviewer_id: str = Field(min_length=2)
    adjudicator_id: str = Field(min_length=2)
    review_status: Literal["adjudicated"]
    split: Literal["final_holdout"] = "final_holdout"
    notes: Optional[str] = None

    @model_validator(mode="after")
    def reviewers_must_be_independent(self):
        reviewers = {
            self.primary_reviewer_id,
            self.secondary_reviewer_id,
            self.adjudicator_id,
        }
        if len(reviewers) != 3:
            raise ValueError("primary, secondary, and adjudicator reviewer IDs must be distinct")
        return self


class ClinicalHoldoutDataset(BaseModel):
    schema_version: Literal[1] = 1
    dataset_id: str = Field(min_length=3)
    intended_use: Literal["final_evaluation_only"] = "final_evaluation_only"
    frozen_at: datetime
    cases: list[ClinicalHoldoutCase] = Field(min_length=1)


def validate_release_holdout(
    dataset: ClinicalHoldoutDataset,
    *,
    min_emergencies: int = 200,
    min_non_emergencies: int = 200,
) -> dict:
    normalized_queries = [" ".join(case.query.casefold().split()) for case in dataset.cases]
    duplicates = [query for query, count in Counter(normalized_queries).items() if count > 1]
    emergency_count = sum(case.is_emergency for case in dataset.cases)
    non_emergency_count = len(dataset.cases) - emergency_count
    errors = []
    if duplicates:
        errors.append(f"duplicate normalized queries: {duplicates[:5]}")
    if emergency_count < min_emergencies:
        errors.append(f"emergency cases {emergency_count} < required {min_emergencies}")
    if non_emergency_count < min_non_emergencies:
        errors.append(f"non-emergency cases {non_emergency_count} < required {min_non_emergencies}")
    return {
        "release_ready": not errors,
        "total": len(dataset.cases),
        "emergency": emergency_count,
        "non_emergency": non_emergency_count,
        "errors": errors,
    }
