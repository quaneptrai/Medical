import re
from typing import List, Dict, Tuple, Optional
from unidecode import unidecode


class ClinicalGuardrailEngine:
    """
    Bộ lọc an toàn lâm sàng cứng (Deterministic Safety Guardrails).
    Hoạt động độc lập với LLM, đảm bảo không bỏ sót các ca cấp cứu tối khẩn.
    """

    def __init__(self):
        # Định nghĩa các mẫu quy tắc cấp cứu (Rules)
        self.emergency_rules = [
            {
                "id": "EMERGENCY_APPENDICITIS",
                "name": "Nghi ngờ Viêm ruột thừa cấp / Bụng ngoại khoa khẩn",
                "condition": self._check_appendicitis,
                "red_flag": "Đau bụng cấp khu trú vùng hố chậu phải / Nghi ngờ viêm ruột thừa cấp",
                "emergency_message": (
                    "🚨 **CẢNH BÁO CẤP CỨU Y TẾ KHẨN CẤP:**\n"
                    "Triệu chứng đau bụng dưới bên phải kèm sốt/buồn nôn là dấu hiệu kinh điển của **Viêm ruột thừa cấp** hoặc bệnh lý bụng ngoại khoa cần can thiệp khẩn.\n\n"
                    "👉 **HÀNH ĐỘNG CẦN LÀM NGAY:**\n"
                    "1. Đến ngay **Khoa Cấp cứu của Bệnh viện gần nhất** để được bác sĩ ngoại khoa thăm khám và siêu âm bụng.\n"
                    "2. **TUYỆT ĐỐI KHÔNG** chườm nóng vào bụng (nguy cơ làm vỡ ruột thừa).\n"
                    "3. **TUYỆT ĐỐI KHÔNG** tự ý uống thuốc giảm đau mạnh hay thuốc nhuận tràng trước khi bác sĩ khám."
                )
            },
            {
                "id": "EMERGENCY_CORONARY",
                "name": "Hội chứng vành cấp / Nhồi máu cơ tim",
                "condition": self._check_coronary_syndrome,
                "red_flag": "Đau tức thắt ngực dữ dội kiểu đè nặng lan tay/vai trái / Nghi ngờ Nhồi máu cơ tim",
                "emergency_message": (
                    "🚨 **BÁO ĐỘNG CẤP CỨU TIM MẠCH 115:**\n"
                    "Cơn đau thắt ngực dữ dội kèm lan tay/vai hoặc khó thở là dấu hiệu của **Hội chứng vành cấp / Nhồi máu cơ tim** - nguy hiểm trực tiếp đến tính mạng.\n\n"
                    "👉 **HÀNH ĐỘNG CẦN LÀM NGAY:**\n"
                    "1. **GỌI NGAY CẤP CỨU 115** hoặc nhờ người thân đưa đến bệnh viện có khoa can thiệp tim mạch ngay lập tức.\n"
                    "2. Ngồi nghỉ ngơi tại chỗ ở tư thế nửa nằm nửa ngồi, nới lỏng cổ áo, không cố gắng đi lại hay gắng sức."
                )
            },
            {
                "id": "EMERGENCY_ANAPHYLAXIS",
                "name": "Sốc phản vệ cấp tính",
                "condition": self._check_anaphylaxis,
                "red_flag": "Dị ứng kèm phù nề thanh quản, khó thở hoặc choáng váng / Nghi ngờ Sốc phản vệ",
                "emergency_message": (
                    "🚨 **CẢNH BÁO CẤP CỨU SỐC PHẢN VỆ:**\n"
                    "Dị ứng kèm sưng nề môi họng hoặc khó thở có nguy cơ tiến triển thành sốc phản vệ gây tắc nghẽn đường thở nhanh chóng.\n\n"
                    "👉 **HÀNH ĐỘNG CẦN LÀM NGAY:** Đến ngay cơ sở y tế gần nhất hoặc gọi 115 để được tiêm thuốc cấp cứu lập tức."
                )
            },
            {
                "id": "EMERGENCY_STROKE",
                "name": "Dấu hiệu Đột quỵ não cấp (FAST)",
                "condition": self._check_stroke,
                "red_flag": "Yếu liệt nửa người, méo miệng, nói ngọng đột ngột / Dấu hiệu Đột quỵ não",
                "emergency_message": (
                    "🚨 **BÁO ĐỘNG ĐỘT QUỴ NÃO CẤP - THỜI GIAN VÀNG:**\n"
                    "Các dấu hiệu méo miệng, yếu tay chân hoặc nói khó đột ngột là triệu chứng của Đột quỵ não.\n\n"
                    "👉 **HÀNH ĐỘNG CẦN LÀM NGAY:** Đưa bệnh nhân đến ngay **Bệnh viện có Trung tâm Đột quỵ gần nhất** trong thời gian vàng (< 4.5 giờ)."
                )
            }
        ]

    def _normalize(self, text: str) -> str:
        return unidecode(text.lower().strip())

    def _check_appendicitis(self, text: str) -> bool:
        norm = self._normalize(text)
        has_rlq_pain = bool(re.search(
            r"(dau\s+bung.*(phai|ho\s+chau|duoi\s+ben\s+phai|ruot\s+thua)|dau\s+nhoi.*(phai|duoi\s+phai)|dau\s+ho\s+chau\s+phai)",
            norm
        ))
        has_associated = bool(re.search(
            r"(sot|buon\s+non|non|am\s+i|tang\s+dan|nhoc|dau\s+nhoi|am\s+i)",
            norm
        ))
        return has_rlq_pain and has_associated

    def _check_coronary_syndrome(self, text: str) -> bool:
        norm = self._normalize(text)
        has_chest_pain = bool(re.search(
            r"(dau\s+(nguc|tuc\s+nguc|that\s+nguc|nang\s+nguc|de\s+ep)|tuc\s+nguc)",
            norm
        ))
        has_radiation_or_severe = bool(re.search(
            r"(tay\s+trai|vai\s+trai|ham|cam|kho\s+tho|nghen\s+tho|mo\s+hoi|ngat|du\s+doi|lan\s+ra)",
            norm
        ))
        return has_chest_pain and has_radiation_or_severe

    def _check_anaphylaxis(self, text: str) -> bool:
        norm = self._normalize(text)
        has_allergy = bool(re.search(r"(di\s+ung|me\s+day|man\s+ngua|hai\s+san|ong\s+dot|uong\s+thuoc)", norm))
        has_airway = bool(re.search(r"(kho\s+tho|nghen\s+hong|sung\s+moi|sung\s+mat|sung\s+luoi|tut\s+huyet\s+ap|choang)", norm))
        return has_allergy and has_airway

    def _check_stroke(self, text: str) -> bool:
        norm = self._normalize(text)
        return bool(re.search(
            r"(yeu\s+liet|liet\s+nua\s+nguoi|meo\s+mieng|noi\s+ngong|noi\s+kho|te\s+nua\s+nguoi)",
            norm
        ))

    def evaluate_emergency(self, user_message: str, current_symptoms: List[str]) -> Optional[Dict]:
        """
        Đánh giá xem ca khám có thuộc diện cấp cứu tuyệt đối hay không.
        Trả về dictionary chứa rule info nếu vi phạm, ngược lại trả về None.
        """
        combined_text = f"{' '.join(current_symptoms)} {user_message}"
        
        for rule in self.emergency_rules:
            if rule["condition"](combined_text):
                return {
                    "rule_id": rule["id"],
                    "rule_name": rule["name"],
                    "red_flag": rule["red_flag"],
                    "emergency_reply": rule["emergency_message"]
                }
        return None
