import pytest
from src.safety.guardrails import ClinicalGuardrailEngine


@pytest.fixture(scope="session")
def guardrail():
    return ClinicalGuardrailEngine()


def test_independent_emergency_suite_13_cases(guardrail):
    """
    Kiểm tra 13 ca cấp cứu thực tế độc lập:
    Bao gồm cả các nhóm: Bỏng, Hạ đường huyết, Điện giật, Xuất huyết tiêu hóa dưới, Vết thương dao cắt mạch máu,
    Đột quỵ FAST, Nhồi máu cơ tim, Sốc phản vệ, Viêm màng não, Hôn mê, Vỡ thai ngoài tử cung, Sốc nhiễm trùng.
    """
    cases = [
        ("cháu bé bị bỏng nước sôi ở lưng lột hết cả da khóc thét", "trauma"),
        ("bà tôi bị tiểu đường tự nhiên run bần bật, toát mồ hôi hột, lơ mơ lả đi", "endocrinology"),
        ("anh ấy bị điện giật té ngã ngực tức nghẹn tim đập thình thịch", "trauma"),
        ("đi cầu ra toàn máu đỏ tươi, choáng váng muốn xỉu", "gastroenterology"),
        ("bị dao cắt vào cổ tay máu chảy xối xả không cầm được", "trauma"),
        ("tay chân một bên yếu hẳn, miệng lệch sang trái", "neurology"),
        ("tức ngực như có ai ngồi lên, buồn nôn, ra mồ hôi hột, nghỉ mãi không hết", "cardiology"),
        ("tiêm thuốc xong nổi đỏ khắp, co thắt họng, không thở được", "immunology"),
        ("bé sốt cao, nôn vọt, cổ cứng, sợ ánh sáng", "neurology"),
        ("Bố tôi đang ngồi thì đổ gục, gọi không thưa, người mềm nhũn", "neurology"),
        ("Vợ tôi có thai 8 tuần, đau bụng dưới dữ dội, ra máu, choáng", "obstetrics"),
        ("Tôi bị tai nạn, máu phun thành tia ở đùi, không cầm được", "trauma"),
        ("Cụ ông sốt cao li bì, thở nhanh, tay chân lạnh ngắt, tụt huyết áp", "infectious"),
    ]

    for query, expected_cat in cases:
        res = guardrail.evaluate_emergency(query)
        assert res is not None, f"Ca cấp cứu bị trượt: '{query}'"
        assert res["is_emergency"] is True


def test_non_emergency_cases_do_not_trigger(guardrail):
    """Đảm bảo các ca bệnh thông thường không bị kích hoạt báo động nhầm."""
    non_emergencies = [
        "tôi bị hắt hơi sổ mũi nghẹt mũi 2 ngày nay",
        "mặt em nổi nhiều mụn trứng cá viêm đỏ ở hai bên má",
        "em bị đau âm ỉ thượng vị sau khi ăn đồ cay nóng",
        "chân em bị ngứa nổi mẩn đỏ sau khi đi tắm biển",
        "dạo này em hay bị ợ chua và rát cổ họng vào ban đêm",
        "cháu bé bị nhiệt miệng đau rát khi ăn",
        "tôi bị đau lưng mỏi gối do ngồi làm việc văn phòng nhiều",
        "cho em hoi phong kham co lam viec chu nhat khong",
        "uong thuoc bo nao loai nao tot ha bac si",
        "be bi ho khan thinh thoang khong sot van choi ngoan",
    ]
    for q in non_emergencies:
        res = guardrail.evaluate_emergency(q)
        assert res is None, f"Ca thường '{q}' bị báo động nhầm: {res}"
