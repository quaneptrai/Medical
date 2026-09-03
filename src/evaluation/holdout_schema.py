"""Schema and release checks for the untouched clinical safety holdout."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
import re
from typing import Literal, Optional
import unicodedata

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
        if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", self.query):
            raise ValueError("query contains an email address and is not de-identified")
        digits = re.sub(r"\D", "", self.query)
        if re.search(r"(?<!\d)(?:\+?84|0)\d{8,10}(?!\d)", self.query) or len(digits) >= 16:
            raise ValueError("query may contain a phone number or identifying numeric sequence")
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
    normalized_queries = [
        " ".join(unicodedata.normalize("NFKC", case.query).casefold().split())
        for case in dataset.cases
    ]
    duplicates = [query for query, count in Counter(normalized_queries).items() if count > 1]
    duplicate_case_ids = [
        case_id for case_id, count in Counter(case.case_id for case in dataset.cases).items()
        if count > 1
    ]
    emergency_count = sum(case.is_emergency for case in dataset.cases)
    non_emergency_count = len(dataset.cases) - emergency_count
    errors = []
    if duplicates:
        errors.append(f"duplicate normalized queries: {duplicates[:5]}")
    if duplicate_case_ids:
        errors.append(f"duplicate case IDs: {duplicate_case_ids[:5]}")
    if emergency_count < min_emergencies:
        errors.append(f"emergency cases {emergency_count} < required {min_emergencies}")
    if non_emergency_count < min_non_emergencies:
        errors.append(f"non-emergency cases {non_emergency_count} < required {min_non_emergencies}")
    return {
        "release_ready": not errors,
        "total": len(dataset.cases),
        "emergency": emergency_count,
        "non_emergency": non_emergency_count,
        "source_types": dict(Counter(case.source_type for case in dataset.cases)),
        "syndrome_categories": dict(Counter(case.syndrome_category for case in dataset.cases)),
        "errors": errors,
    }
