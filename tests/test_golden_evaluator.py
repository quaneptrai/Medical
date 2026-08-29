from src.evaluation.golden_evaluator import evaluate_golden_case, exact_label_in
from src.evaluation.golden_schema import GoldenTestCase


def _case(**overrides):
    payload = {
        "case_id": "GTC_999",
        "category": "respiratory",
        "clinical_scenario": "Hen ổn định, không có dấu hiệu cấp cứu.",
        "dialogue": [{"user_utterance": "khò khè", "expected_stage": "follow_up"}],
        "ground_truth_disease": "Hen phế quản",
        "expected_differential_top3": ["Hen phế quản"],
        "is_emergency": False,
        "clinical_rationale": "Ca kiểm thử.",
    }
    payload.update(overrides)
    return GoldenTestCase(**payload)


def test_disease_names_require_exact_canonical_match():
    assert exact_label_in("Bệnh trĩ", ["Bệnh trĩ"])
    assert not exact_label_in("Bệnh trĩ", ["Bệnh trĩ huyết khối"])
    assert not exact_label_in("Béo phì", ["Béo phì độ 1"])


def test_non_emergency_wrong_specialty_alert_fails_like_gtc_009():
    result = evaluate_golden_case(
        _case(),
        [{
            "stage": "emergency",
            "bot": "BÁO ĐỘNG NHỒI MÁU CƠ TIM: gọi 115 ngay.",
            "candidates": ["Hen phế quản"],
            "red_flags": [],
        }],
        candidate_category_by_name={"hen phe quan": "respiratory"},
    )
    assert result["automated_pass"] is False
    failed = {item["name"] for item in result["checks"] if not item["passed"]}
    assert {"stage_per_turn", "emergency_label", "emergency_reply_consistency"} <= failed


def test_automated_pass_is_not_claimed_as_clinical_approval():
    result = evaluate_golden_case(
        _case(review_status="unverified"),
        [{
            "stage": "follow_up",
            "bot": "Bạn nên khám hô hấp nếu triệu chứng kéo dài.",
            "candidates": ["Hen phế quản"],
            "red_flags": [],
        }],
    )
    assert result["automated_pass"] is True
    assert result["clinical_pass"] is False
    assert result["manual_review_required"] is True
