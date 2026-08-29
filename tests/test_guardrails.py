import pytest
from src.safety.guardrails import ClinicalGuardrailEngine


@pytest.fixture(scope="session")
def guardrail():
    return ClinicalGuardrailEngine()


def test_user_reported_4_failing_emergencies(guardrail):
    """
    Kiểm tra 4 ca cấp cứu thực tế mà người dùng chỉ ra từng bị trượt ở bản Regex cũ:
    1. Hôn mê/ngất: "Bố tôi đang ngồi thì đổ gục, gọi không thưa, người mềm nhũn"
    2. Vỡ thai ngoài tử cung: "Vợ tôi có thai 8 tuần, đau bụng dưới dữ dội, ra máu, choáng"
    3. Chảy máu động mạch: "Tôi bị tai nạn, máu phun thành tia ở đùi, không cầm được"
    4. Sốc nhiễm trùng: "Cụ ông sốt cao li bì, thở nhanh, tay chân lạnh ngắt, tụt huyết áp"
    """
    cases = [
        ("Bố tôi đang ngồi thì đổ gục, gọi không thưa, người mềm nhũn", "neurology"),
        ("Vợ tôi có thai 8 tuần, đau bụng dưới dữ dội, ra máu, choáng", "obstetrics"),
        ("Tôi bị tai nạn, máu phun thành tia ở đùi, không cầm được", "trauma"),
        ("Cụ ông sốt cao li bì, thở nhanh, tay chân lạnh ngắt, tụt huyết áp", "infectious"),
    ]

    for query, expected_cat in cases:
        res = guardrail.evaluate_emergency(query)
        assert res is not None, f"Ca cấp cứu bị trượt: '{query}'"
        assert res["is_emergency"] is True
        assert res["rule_category"] == expected_cat, f"Sai chuyên khoa cho '{query}': {res}"


def test_stroke_fast_detection_accented_and_unaccented(guardrail):
    res1 = guardrail.evaluate_emergency("Bác tôi đột nhiên bị méo miệng và nói ngọng nửa người bên trái không nhấc lên được")
    assert res1 is not None and res1["is_emergency"] is True

    res2 = guardrail.evaluate_emergency("me toi dot nhien bi yeu liet nua nguoi ben phai noi kho")
    assert res2 is not None and res2["is_emergency"] is True


def test_coronary_syndrome_detection(guardrail):
    res = guardrail.evaluate_emergency("tôi bị đau thắt ngực dữ dội lan ra vai trái và vã mồ hôi lạnh")
    assert res is not None and res["is_emergency"] is True


def test_anaphylactic_shock_detection(guardrail):
    res = guardrail.evaluate_emergency("sau khi ăn tôm em bị nổi mề đay sưng môi sưng mắt và nghẹn thở khó thở quá")
    assert res is not None and res["is_emergency"] is True


def test_acute_peritonitis_rigid_abdomen(guardrail):
    res = guardrail.evaluate_emergency("bụng gồng cứng như gỗ đau bụng dữ dội không dám sờ vào")
    assert res is not None and res["is_emergency"] is True


def test_poisoning_emergency(guardrail):
    res = guardrail.evaluate_emergency("cháu bé uống nhầm thuốc sâu sùi bọt mép bất tỉnh")
    assert res is not None and res["is_emergency"] is True


def test_semantic_fallback_colloquial_variations(guardrail):
    """Kiểm tra các câu khẩu ngữ không dùng từ khóa chuẩn nhưng được BGE-M3 vớt."""
    colloquial_emergencies = [
        "tự nhiên lăn đùng ra bất tỉnh nhân sự gọi mãi chẳng thưa",
        "máu ở vết chém bắn tung tóe ép vải vào vẫn không cầm được",
        "bầu bí mấy tháng đau quặn bụng dưới ra máu tươi xỉu đi",
        "sốt rét run cầm cập liên tục nổi vân tím khắp người lơ mơ",
    ]
    for q in colloquial_emergencies:
        res = guardrail.evaluate_emergency(q)
        assert res is not None, f"Semantic layer failed to catch: '{q}'"
        assert res["is_emergency"] is True


def test_non_emergency_cases_do_not_trigger(guardrail):
    """Đảm bảo các ca bệnh thông thường không bị kích hoạt báo động nhầm."""
    non_emergencies = [
        "tôi bị hắt hơi sổ mũi nghẹt mũi 2 ngày nay",
        "mặt em nổi nhiều mụn trứng cá viêm đỏ ở hai bên má",
        "em bị đau âm ỉ thượng vị sau khi ăn đồ cay nóng",
        "chân em bị ngứa nổi mẩn đỏ sau khi đi tắm biển",
        "dạo này em hay bị ợ chua và rát cổ họng vào ban đêm",
        "em muốn hỏi giá thuốc hạ sốt paracetamol",
        "cháu bé bị nhiệt miệng đau rát khi ăn",
        "tôi bị đau lưng mỏi gối do ngồi làm việc văn phòng nhiều",
    ]
    for q in non_emergencies:
        res = guardrail.evaluate_emergency(q)
        assert res is None, f"Ca thường '{q}' bị báo động nhầm: {res}"
