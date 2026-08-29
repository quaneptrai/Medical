import pytest
from src.safety.guardrails import ClinicalGuardrailEngine

@pytest.fixture
def guardrail():
    return ClinicalGuardrailEngine()

def test_stroke_fast_detection_accented_and_unaccented(guardrail):
    # Accented
    res1 = guardrail.evaluate_emergency("Bác tôi đột nhiên bị méo miệng và nói ngọng nửa người bên trái không nhấc lên được")
    assert res1 is not None
    assert res1["rule_id"] == "EMERGENCY_STROKE_FAST"
    assert res1["is_emergency"] is True

    # Unaccented (Typo / Quick typing)
    res2 = guardrail.evaluate_emergency("me toi dot nhien bi yeu liet nua nguoi ben phai noi kho")
    assert res2 is not None
    assert res2["rule_id"] == "EMERGENCY_STROKE_FAST"

def test_coronary_syndrome_detection(guardrail):
    res = guardrail.evaluate_emergency("tôi bị đau thắt ngực dữ dội lan ra vai trái và vã mồ hôi lạnh")
    assert res is not None
    assert res["rule_id"] == "EMERGENCY_CORONARY_SYNDROME"

def test_anaphylactic_shock_detection(guardrail):
    res = guardrail.evaluate_emergency("sau khi ăn tôm em bị nổi mề đay sưng môi sưng mắt và nghẹn thở khó thở quá")
    assert res is not None
    assert res["rule_id"] == "EMERGENCY_ANAPHYLACTIC_SHOCK"

def test_acute_peritonitis_rigid_abdomen(guardrail):
    res = guardrail.evaluate_emergency("bụng gồng cứng như gỗ đau bụng dữ dội không dám sờ vào")
    assert res is not None
    assert res["rule_id"] == "EMERGENCY_ACUTE_PERITONITIS"

def test_ectopic_pregnancy_rupture(guardrail):
    res = guardrail.evaluate_emergency("em đang có thai mà tự nhiên đau bụng dưới dữ dội ra máu âm đạo ngất xỉu")
    assert res is not None
    assert res["rule_id"] == "EMERGENCY_ECTOPIC_PREGNANCY"

def test_poisoning_emergency(guardrail):
    res = guardrail.evaluate_emergency("cháu bé uống nhầm thuốc sâu sùi bọt mép bất tỉnh")
    assert res is not None
    assert res["rule_id"] == "EMERGENCY_ACUTE_POISONING"

def test_non_emergency_cases_do_not_trigger(guardrail):
    # Routine non-emergency queries MUST NOT trigger emergency guardrail
    non_emergencies = [
        "tôi bị hắt hơi sổ mũi nghẹt mũi 2 ngày nay",
        "mặt em nổi nhiều mụn trứng cá viêm đỏ ở hai bên má",
        "em bị đau âm ỉ thượng vị sau khi ăn đồ cay nóng",
        "chân em bị ngứa nổi mẩn đỏ sau khi đi tắm biển",
        "dạo này em hay bị ợ chua và rát cổ họng vào ban đêm",
        "em muốn hỏi giá thuốc hạ sốt paracetamol",
    ]
    for q in non_emergencies:
        res = guardrail.evaluate_emergency(q)
        assert res is None, f"Query '{q}' triggered false positive: {res}"
