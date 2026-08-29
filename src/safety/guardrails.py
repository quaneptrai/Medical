import re
from typing import List, Dict, Tuple, Optional
from unidecode import unidecode


class ClinicalGuardrailEngine:
    """
    Bộ lọc an toàn lâm sàng cứng (Deterministic Universal Emergency Guardrails).
    Hoạt động độc lập với số lượng bệnh trong Knowledge Base, bao phủ 20+ nhóm hội chứng cấp cứu tối khẩn.
    """

    def __init__(self):
        self.emergency_rules = self._init_universal_emergency_rules()

    def _normalize(self, text: str) -> str:
        return unidecode(text.lower().strip())

    def _init_universal_emergency_rules(self) -> List[Dict]:
        return [
            # 1. DỊ ỨNG & NGỘ ĐỘC CẤP (TOXICOLOGY & IMMUNOLOGY - Ưu tiên cao nhất)
            {
                "id": "EMERGENCY_ACUTE_POISONING",
                "category": "toxicology",
                "name": "Ngộ độc cấp tính / Uống nhầm hóa chất độc hại",
                "red_flag": "Uống nhầm thuốc sâu/hóa chất tẩy rửa/uống quá liều thuốc, sùi bọt mép, lơ mơ",
                "pattern": r"(uong\s+nham\s+(thuoc\s+sau|hoa\s+chat|thuoc\s+ngu|thuoc\s+tay|tay\s+rua|xang|dau)|thuoc\s+sau|uong\s+thuoc\s+sau|ngo\s+doc\s+cap|tu\s+tu)",
                "emergency_message": (
                    "CẤP CỨU NGỘ ĐỘC CẤP TÍNH:\n"
                    "Hóa chất độc hại có thể hủy hoại nội tạng và gây ngừng tim nhanh chóng.\n"
                    "HÀNH ĐỘNG NGAY: Mang theo bao bì/vỏ chai lọ của chất đã uống, đưa bệnh nhân đến ngay trung tâm chống độc/khoa cấp cứu gần nhất. Tuyệt đối KHÔNG tự ý gây nôn nếu uống phải axit/kiềm/xăng dầu."
                )
            },
            {
                "id": "EMERGENCY_ANAPHYLACTIC_SHOCK",
                "category": "immunology",
                "name": "Sốc phản vệ nguy kịch",
                "red_flag": "Dị ứng nổi mề đay kèm sưng nề môi mắt họng, nghẹt thở, tụt huyết áp",
                "pattern": r"(di\s+ung|me\s+day|ong\s+dot|uong\s+thuoc|an\s+hai\s+san).*(sung\s+moi|sung\s+mat|sung\s+hong|nghen\s+tho|kho\s+tho|tut\s+huyet\s+ap|choang)",
                "emergency_message": (
                    "BÁO ĐỘNG CẤP CỨU SỐC PHẢN VỆ:\n"
                    "Phù nề thanh quản và tụt huyết áp do dị ứng có thể làm ngưng thở ngừng tim trong chốc lát.\n"
                    "HÀNH ĐỘNG NGAY: Tiêm ngay bút tiêm Adrenaline (Epipen) nếu có sẵn, gọi 115 hoặc đưa ngay đến trạm y tế/bệnh viện gần nhất."
                )
            },

            # 2. SẢN PHỤ KHOA NGUY CẤP (OBSTETRICS)
            {
                "id": "EMERGENCY_ECTOPIC_PREGNANCY",
                "category": "obstetrics",
                "name": "Nghi ngờ Vỡ Thai ngoài tử cung",
                "red_flag": "Trễ kinh/có thai kèm đau bụng dưới dữ dội một bên, ra máu âm đạo, ngất xỉu",
                "pattern": r"(tre\s+kinh|co\s+thai|mang\s+thai|co\s+bau).*(dau\s+bung\s+du\s+doi|ra\s+mau\s+am\s+dao|chay\s+mau|ngat\s+xiu)",
                "emergency_message": (
                    "BÁO ĐỘNG CẤP CỨU SẢN PHỤ KHOA (NGHI VỠ THAI NGOÀI TỬ CUNG):\n"
                    "Máu chảy ồ ạt trong ổ bụng có thể gây mất máu trụy mạch tử vong rất nhanh.\n"
                    "HÀNH ĐỘNG NGAY: Đưa ngay đến bệnh viện có khoa Sản/Cấp cứu ngoại khoa để mổ cầm máu khẩn cấp."
                )
            },
            {
                "id": "EMERGENCY_ECLAMPSIA",
                "category": "obstetrics",
                "name": "Tiền sản giật nặng / Sản giật",
                "red_flag": "Phụ nữ mang thai bị huyết áp rất cao kèm phù, đau đầu, nhìn mờ, co giật",
                "pattern": r"(mang\s+thai|co\s+bau|thai\s+ky).*(huyet\s+ap\s+cao|phu\s+mat|dau\s+dau\s+nhin\s+mo|co\s+giat|san\s+giat)",
                "emergency_message": (
                    "BÁO ĐỘNG SẢN GIẬT THAI KỲ:\n"
                    "Nguy cơ xuất huyết não cho mẹ và suy thai tử vong cho con.\n"
                    "HÀNH ĐỘNG NGAY: Chuyển ngay đến bệnh viện phụ sản tuyến tỉnh/trung ương có đơn vị hồi sức sản khoa."
                )
            },

            # 3. NGOẠI BỤNG & TIÊU HÓA CẤP (ACUTE ABDOMEN)
            {
                "id": "EMERGENCY_ACUTE_PERITONITIS",
                "category": "gastroenterology",
                "name": "Viêm phúc mạc / Thủng tạng rỗng / Bụng ngoại khoa",
                "red_flag": "Bụng cứng như gỗ, gồng cứng bụng, đau dữ dội không dám chạm",
                "pattern": r"(cung\s+nhu\s+go|gong\s+cung\s+bung|bung\s+cung|thung\s+da\s+day|viem\s+phuc\s+mac)",
                "emergency_message": (
                    "BÁO ĐỘNG BỤNG NGOẠI KHOA CẤP:\n"
                    "Dấu hiệu bụng gồng cứng như gỗ là chỉ báo của viêm phúc mạc hoặc thủng tạng rỗng cần mổ khẩn cấp.\n"
                    "HÀNH ĐỘNG NGAY: Đến ngay bệnh viện có khoa ngoại tổng quát. Tuyệt đối KHÔNG ăn uống, KHÔNG uống thuốc giảm đau làm lu mờ triệu chứng."
                )
            },
            {
                "id": "EMERGENCY_MASSIVE_GI_BLEEDING",
                "category": "gastroenterology",
                "name": "Xuất huyết Tiêu hóa nặng",
                "red_flag": "Nôn ra máu tươi/máu cục, đi ngoài phân đen như bã cà phê kèm hoa mắt chóng mặt",
                "pattern": r"(non\s+ra\s+mau|oi\s+ra\s+mau|di\s+ngoai\s+phan\s+den|phan\s+mui\s+tanh|cau\s+ra\s+mau\s+den)",
                "emergency_message": (
                    "CẢNH BÁO XUẤT HUYẾT TIÊU HÓA CẤP:\n"
                    "Mất máu cấp từ đường tiêu hóa có thể nhanh chóng dẫn đến sốc mất máu tử vong.\n"
                    "HÀNH ĐỘNG NGAY: Đến ngay khoa cấp cứu để được truyền dịch, nội soi cầm máu và truyền máu nếu cần."
                )
            },
            {
                "id": "EMERGENCY_APPENDICITIS_ACUTE",
                "category": "gastroenterology",
                "name": "Nghi ngờ Viêm ruột thừa cấp",
                "red_flag": "Đau bụng khu trú hố chậu phải tăng dần, sốt nhẹ, buồn nôn",
                "pattern": r"(dau\s+bung.*(ho\s+chau\s+phai|duoi\s+ben\s+phai|ruot\s+thua)|dau\s+ho\s+chau\s+phai)",
                "emergency_message": (
                    "CẢNH BÁO VIÊM RUỘT THỪA CẤP:\n"
                    "Đau vùng bụng dưới bên phải tăng dần có nguy cơ vỡ ruột thừa gây nhiễm trùng ổ bụng.\n"
                    "HÀNH ĐỘNG NGAY: Đi khám cấp cứu ngoại khoa ngay. Không tự ý chườm nóng bụng hoặc uống thuốc nhuận tràng."
                )
            },

            # 4. TIM MẠCH & HÔ HẤP TỐI KHẨN (CARDIOVASCULAR & RESPIRATORY)
            {
                "id": "EMERGENCY_CORONARY_SYNDROME",
                "category": "cardiology",
                "name": "Hội chứng Vành cấp / Nhồi máu cơ tim",
                "red_flag": "Đau tức thắt ngực đè ép dữ dội, lan tay/vai trái, vã mồ hôi lạnh",
                "pattern": r"(dau\s+(nguc|that\s+nguc|nang\s+nguc|de\s+ep)|tuc\s+nguc).*(tay\s+trai|vai\s+trai|ham|mo\s+hoi\s+lanh|du\s+doi|nghen\s+tho|bop\s+nghet)",
                "emergency_message": (
                    "BÁO ĐỘNG CẤP CỨU TIM MẠCH 115:\n"
                    "Cơn đau thắt ngực kiểu đè nghẹt kèm lan tay trái/vã mồ hôi lạnh là dấu hiệu của Nhồi máu cơ tim cấp.\n"
                    "HÀNH ĐỘNG NGAY: Gọi 115 ngay. Cho bệnh nhân ngồi nghỉ ngơi nửa nằm nửa ngồi, nới lỏng quần áo, tuyệt đối không đi lại gắng sức."
                )
            },
            {
                "id": "EMERGENCY_AORTIC_DISSECTION",
                "category": "cardiology",
                "name": "Nghi ngờ Phình bóc tách Động mạch chủ",
                "red_flag": "Đau xé ngực lan xuyên ra sau lưng giữa 2 xương bả vai",
                "pattern": r"(dau\s+(xe|nhoi|du\s+doi).*(nguc|sau\s+lung|ba\s+vai)|dau\s+nguc\s+xuyen\s+ra\s+sau\s+lung)",
                "emergency_message": (
                    "CẢNH BÁO NGUY KỊCH PHÌNH BÓC TÁCH ĐỘNG MẠCH CHỦ:\n"
                    "Cơn đau kiểu xé rách từ ngực xuyên ra sau lưng là tình huống tối khẩn cấp đe dọa vỡ mạch máu chính.\n"
                    "HÀNH ĐỘNG NGAY: Gọi 115 đưa đến trung tâm phẫu thuật tim mạch lồng ngực ngay lập tức."
                )
            },
            {
                "id": "EMERGENCY_ACUTE_RESPIRATORY_FAILURE",
                "category": "respiratory",
                "name": "Suy hô hấp cấp / Ngạt thở",
                "red_flag": "Khó thở dữ dội, không thở nổi, thở rít, tím tái môi đầu chi",
                "pattern": r"(kho\s+tho\s+du\s+doi|tho\s+khong\s+noi|ngat\s+tho|tim\s+tai|tho\s+rit|co\s+keo\s+long\s+nguc|suy\s+ho\s+hap)",
                "emergency_message": (
                    "BÁO ĐỘNG SUY HÔ HẤP CẤP:\n"
                    "Bệnh nhân thiếu oxy nghiêm trọng đe dọa tính mạng trong vài phút.\n"
                    "HÀNH ĐỘNG NGAY: Gọi 115 cấp cứu lập tức. Giữ tư thế ngồi thẳng, mở thông thoáng đường thở, thở oxy nếu có sẵn."
                )
            },

            # 5. THẦN KINH KHẨN CẤP (NEUROLOGICAL)
            {
                "id": "EMERGENCY_STROKE_FAST",
                "category": "neurology",
                "name": "Nghi ngờ Đột quỵ não cấp (FAST)",
                "red_flag": "Yếu liệt nửa người, méo miệng, nói khó, tê bì đột ngột",
                "pattern": r"(yeu\s+liet|liet\s+nua\s+nguoi|meo\s+mieng|noi\s+ngong|noi\s+kho|te\s+nua\s+nguoi|lech\s+mat|tay\s+chan\s+khong\s+cu\s+dong\s+duoc)",
                "emergency_message": (
                    "BÁO ĐỘNG ĐỘT QUỴ NÃO CẤP (GIỜ VÀNG < 4.5 GIỜ):\n"
                    "Dấu hiệu méo miệng, yếu liệt nửa người hoặc nói khó đột ngột là triệu chứng của tai biến mạch máu não.\n"
                    "HÀNH ĐỘNG NGAY: Gọi 115 hoặc đưa bệnh nhân đến ngay Bệnh viện có Trung tâm Đột quỵ gần nhất. Giữ bệnh nhân nằm nghiêng an toàn, không tự ý cho uống thuốc hay cạo gió."
                )
            },
            {
                "id": "EMERGENCY_SEIZURE",
                "category": "neurology",
                "name": "Co giật / Động kinh liên tục / Sau co giật lơ mơ",
                "red_flag": "Co giật toàn thân, sùi bọt mép, cắn lưỡi, bất tỉnh sau giật",
                "pattern": r"(co\s+giat|dong\s+kinh|giat\s+tay\s+chan|sui\s+bot\s+mep|can\s+luoi|len\s+con\s+giat)",
                "emergency_message": (
                    "CẢNH BÁO CẤP CỨU CO GIẬT:\n"
                    "Cơn co giật có nguy cơ gây ngạt thở, tổn thương não hoặc thiếu oxy cấp.\n"
                    "HÀNH ĐỘNG NGAY: Đặt bệnh nhân nằm nghiêng một bên ở nơi an toàn, không nhét bất cứ vật gì vào miệng, gọi 115 hoặc đưa đi cấp cứu ngay."
                )
            },
            {
                "id": "EMERGENCY_COMA_SYNCOPE",
                "category": "neurology",
                "name": "Hôn mê / Mất ý thức đột ngột",
                "red_flag": "Gọi hỏi không biết, bất tỉnh nhân sự, lơ mơ không tỉnh táo",
                "pattern": r"(hon\s+me|bat\s+tinh|ngat\s+xiu|goi\s+khong\s+tinh|khong\s+biet\s+gi|ngat\s+lim|mat\s+y\s+thuc)",
                "emergency_message": (
                    "CẢNH BÁO CẤP CỨU MẤT Ý THỨC:\n"
                    "Bệnh nhân mất tri giác hoặc gọi hỏi không phản ứng là tình trạng tối khẩn cấp.\n"
                    "HÀNH ĐỘNG NGAY: Gọi ngay 115. Kiểm tra nhịp thở, đặt bệnh nhân nằm nghiêng tư thế an toàn nếu vẫn còn thở, tiến hành ép tim ngoài lồng ngực nếu ngừng tim."
                )
            },
            {
                "id": "EMERGENCY_THUNDERCLAP_HEADACHE",
                "category": "neurology",
                "name": "Đau đầu sét đánh / Nghi xuất huyết dưới nhện",
                "red_flag": "Đau đầu dữ dội chưa từng có trong đời, đau đột ngột dữ dội",
                "pattern": r"(dau\s+dau.*(du\s+doi|set\s+danh|chua\s+tung\s+co|khong\s+chiu\s+noi|nhu\s+bua\s+bo)|nhuc\s+dau\s+kinh\s+khung)",
                "emergency_message": (
                    "CẢNH BÁO CẤP CỨU THẦN KINH:\n"
                    "Cơn đau đầu dữ dội đột ngột như sét đánh là dấu hiệu điển hình của xuất huyết não/vỡ phình mạch não.\n"
                    "HÀNH ĐỘNG NGAY: Đến ngay khoa cấp cứu bệnh viện lớn để chụp CT não khẩn cấp."
                )
            },
            {
                "id": "EMERGENCY_MENINGITIS_SIGNS",
                "category": "neurology",
                "name": "Hội chứng Màng não cấp",
                "red_flag": "Sốt cao kèm cứng gáy, đau đầu nôn vọt, sợ ánh sáng",
                "pattern": r"(sot.*(cung\s+gay|cung\s+co|so\s+anh\s+sang|non\s+vot)|(cung\s+gay|cung\s+co).*sot)",
                "emergency_message": (
                    "CẢNH BÁO VIÊM MÀNG NÃO CẤP:\n"
                    "Sốt cao kèm cứng gáy và sợ ánh sáng là dấu hiệu của nhiễm trùng thần kinh trung ương nguy hiểm.\n"
                    "HÀNH ĐỘNG NGAY: Đưa bệnh nhân đi cấp cứu ngay để chọc dò dịch não tủy và dùng kháng sinh kịp thời."
                )
            }
        ]

    def evaluate_emergency(self, user_message: str, current_symptoms: Optional[List[str]] = None) -> Optional[Dict]:
        """
        Đánh giá xem câu hỏi hoặc triệu chứng của người dùng có kích hoạt cờ đỏ cấp cứu hay không.
        Hoạt động hoàn toàn độc lập với kho dữ liệu bệnh.
        """
        symptoms_str = " ".join(current_symptoms) if current_symptoms else ""
        combined_text = f"{symptoms_str} {user_message}"
        norm = self._normalize(combined_text)

        for rule in self.emergency_rules:
            if re.search(rule["pattern"], norm):
                return {
                    "is_emergency": True,
                    "rule_id": rule["id"],
                    "rule_category": rule["category"],
                    "rule_name": rule["name"],
                    "red_flag": rule["red_flag"],
                    "emergency_reply": rule["emergency_message"]
                }
        return None
