"""Deterministic, auditable scoring for end-to-end golden cases."""

from __future__ import annotations

import re
from typing import Any, Iterable, Mapping, Optional

from unidecode import unidecode

try:
    from .golden_schema import GoldenTestCase
except ImportError:  # Script mode with ``src`` inserted into sys.path.
    from evaluation.golden_schema import GoldenTestCase


EMERGENCY_REPLY_PATTERN = re.compile(
    r"\b(115|cap\s+cuu|bao\s+dong|nguy\s+kịch|nguy\s+kich)\b",
    re.IGNORECASE,
)


def normalize_label(value: str) -> str:
    """Normalize a label without allowing parent/child disease substring matches."""
    value = unidecode(value).casefold()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def exact_label_in(expected: str, actual_values: Iterable[str]) -> bool:
    target = normalize_label(expected)
    return any(normalize_label(value) == target for value in actual_values)


def _concept_present(expected: str, actual_values: Iterable[str]) -> bool:
    """Match red-flag concepts as phrases; disease labels use exact_label_in instead."""
    target = normalize_label(expected)
    return any(
        target == normalized or target in normalized or normalized in target
        for normalized in (normalize_label(value) for value in actual_values)
        if normalized
    )


def _check(name: str, passed: bool, detail: str) -> dict[str, Any]:
    return {"name": name, "passed": bool(passed), "detail": detail}


def evaluate_golden_case(
    case: GoldenTestCase,
    turn_logs: list[Mapping[str, Any]],
    *,
    candidate_category_by_name: Optional[Mapping[str, str]] = None,
) -> dict[str, Any]:
    """Score every machine-checkable dimension and keep clinical approval separate."""
    checks: list[dict[str, Any]] = []
    expected_stages = [turn.expected_stage for turn in case.dialogue]
    observed_stages = [str(log.get("stage", "")) for log in turn_logs]
    checks.append(_check(
        "stage_per_turn",
        observed_stages == expected_stages,
        f"expected={expected_stages}; observed={observed_stages}",
    ))

    ever_emergency = any(stage == "emergency" for stage in observed_stages)
    checks.append(_check(
        "emergency_label",
        ever_emergency == case.is_emergency,
        f"expected={case.is_emergency}; observed={ever_emergency}",
    ))

    final_candidates = list(turn_logs[-1].get("candidates", []))[:3] if turn_logs else []
    checks.append(_check(
        "ground_truth_top3_exact",
        exact_label_in(case.ground_truth_disease, final_candidates),
        f"expected={case.ground_truth_disease!r}; candidates={final_candidates!r}",
    ))

    missing_differentials = [
        disease
        for disease in case.expected_differential_top3
        if not exact_label_in(disease, final_candidates)
    ]
    checks.append(_check(
        "expected_differential_top3_exact",
        not missing_differentials,
        f"missing={missing_differentials!r}; candidates={final_candidates!r}",
    ))

    observed_red_flags = list(turn_logs[-1].get("red_flags", [])) if turn_logs else []
    missing_red_flags = [
        flag for flag in case.mandatory_red_flags if not _concept_present(flag, observed_red_flags)
    ]
    checks.append(_check(
        "mandatory_red_flags",
        not missing_red_flags,
        f"missing={missing_red_flags!r}; observed={observed_red_flags!r}",
    ))

    all_replies = "\n".join(str(log.get("bot", "")) for log in turn_logs)
    normalized_reply = unidecode(all_replies).casefold()
    mentions_emergency_action = bool(EMERGENCY_REPLY_PATTERN.search(normalized_reply))
    reply_safety_ok = mentions_emergency_action if case.is_emergency else not mentions_emergency_action
    checks.append(_check(
        "emergency_reply_consistency",
        reply_safety_ok,
        f"expected_emergency={case.is_emergency}; emergency_language={mentions_emergency_action}",
    ))

    if candidate_category_by_name is not None and final_candidates:
        ground_truth_category = next(
            (
                candidate_category_by_name.get(normalize_label(name))
                for name in final_candidates
                if normalize_label(name) == normalize_label(case.ground_truth_disease)
            ),
            None,
        )
        checks.append(_check(
            "ground_truth_specialty",
            ground_truth_category == case.category,
            f"expected={case.category!r}; observed={ground_truth_category!r}",
        ))

    forbidden_hits = [
        pattern
        for pattern in case.forbidden_reply_patterns
        if re.search(pattern, all_replies, flags=re.IGNORECASE)
    ]
    checks.append(_check(
        "forbidden_reply_patterns",
        not forbidden_hits,
        f"matched={forbidden_hits!r}",
    ))

    missing_required = [
        pattern
        for pattern in case.required_reply_patterns
        if not re.search(pattern, all_replies, flags=re.IGNORECASE)
    ]
    checks.append(_check(
        "required_reply_patterns",
        not missing_required,
        f"missing={missing_required!r}",
    ))

    automated_pass = all(check["passed"] for check in checks)
    clinician_approved = case.review_status == "clinician_approved"
    return {
        "case_id": case.case_id,
        "automated_pass": automated_pass,
        "clinical_pass": automated_pass and clinician_approved,
        "review_status": case.review_status,
        "checks": checks,
        "manual_review_required": not clinician_approved,
    }
