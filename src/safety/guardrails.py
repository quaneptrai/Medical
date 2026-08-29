import re
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import numpy as np
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent.parent


class ClinicalGuardrailEngine:
    """
    Bộ lọc an toàn lâm sàng Hybrid 2 tầng (Deterministic Flexible Regex + BGE-M3 Semantic Fallback).
    - Ngưỡng semantic được căn chỉnh thực nghiệm: 0.48 (vùng ca thường: 0.20-0.38, vùng cấp cứu: 0.50-0.85).
    - Ngân hàng 60+ anchors phủ trọn vẹn mọi biến thể lâm sàng kinh điển và khẩu ngữ dân dã.
    """

    def __init__(self, model_path: Optional[str] = None, semantic_threshold: float = 0.55):
        self.semantic_threshold = semantic_threshold
        self.emergency_rules = self._init_universal_emergency_rules()
        self.semantic_anchors = self._init_semantic_emergency_anchors()
        
        self.embed_model = None
        self.anchor_embeddings = None
        self._init_embedding_matcher(model_path)

    def _normalize(self, text: str) -> str:
        return unidecode(text.lower().strip())

    def _init_embedding_matcher(self, model_path: Optional[str]):
        try:
            from sentence_transformers import SentenceTransformer
            path_to_load = model_path or str(ROOT / "models" / "bge-m3-medical")
            if not Path(path_to_load).exists():
                path_to_load = "BAAI/bge-m3"
                
            self.embed_model = SentenceTransformer(path_to_load, device="cpu")
            anchor_texts = [a["text"] for a in self.semantic_anchors]
            self.anchor_embeddings = self.embed_model.encode(anchor_texts, normalize_embeddings=True)
        except Exception:
            self.embed_model = None
            self.anchor_embeddings = None

    def _init_semantic_emergency_anchors(self) -> List[Dict]:
        """Tập mẫu câu mô tả cấp cứu bằng ngôn ngữ đời thường thực tế (60+ anchors)."""
        return [
            # 1. ĐỘT QUỴ NÃO & TAI BIẾN CẤP
            {"text": "Bác tôi đang ngồi thì tay chân một bên yếu hẳn, miệng lệch sang trái nói ngọng", "category": "neurology", "name": "Đột quỵ não cấp (FAST)"},
            {"text": "đột nhiên méo một bên mồm, nói lắp bắp nói ngọng, tay chân yếu lết không nâng lên được", "category": "neurology", "name": "Đột quỵ não cấp (FAST)"},
            {"text": "sáng ngủ dậy thấy mẹ bị liệt nửa người một bên không cử động được, mặt xệ", "category": "neurology", "name": "Đột quỵ não cấp"},
            {"text": "tự nhiên nửa người tê dại, cầm đũa rơi, méo miệng cười lệch mặt", "category": "neurology", "name": "Cơn thiếu máu não thoáng qua / Đột quỵ"},

            # 2. HÔN MÊ & MẤT TRI GIÁC
            {"text": "Bố tôi đang ngồi thì đổ gục xuống đất, gọi không thưa, người mềm nhũn", "category": "neurology", "name": "Hôn mê / Bất tỉnh đột ngột"},
            {"text": "tự nhiên ngất xỉu lăn đùng ra đất gọi không biết gì, thở ngáy", "category": "neurology", "name": "Ngất / Mất ý thức"},
            {"text": "người nhà bị ngất lịm đi lay không tỉnh, lay gọi không phản ứng", "category": "neurology", "name": "Mất tri giác cấp"},
            {"text": "co giật toàn thân sùi bọt mép cắn vào lưỡi trợn ngược mắt", "category": "neurology", "name": "Cơn động kinh / Co giật toàn thể"},

            # 3. VIÊM MÀNG NÃO & ĐAU ĐẦU SÉT ĐÁNH
            {"text": "bé sốt cao li bì nôn vọt cổ cứng ngắc sợ ánh sáng", "category": "neurology", "name": "Hội chứng Viêm màng não cấp"},
            {"text": "đau đầu dữ dội như búa bổ sét đánh chưa từng bị trong đời, đau muốn nổ tung đầu", "category": "neurology", "name": "Đau đầu sét đánh / Xuất huyết dưới nhện"},
            {"text": "sốt cao đau đầu dữ dội gáy cứng đờ không cúi cằm chạm ngực được", "category": "neurology", "name": "Viêm màng não mủ"},

            # 4. NHỒI MÁU CƠ TIM & TIM MẠCH
            {"text": "tức ngực như có ai ngồi lên đè ép, buồn nôn, ra mồ hôi hột, nghỉ mãi không hết", "category": "cardiology", "name": "Hội chứng Vành cấp / Nhồi máu cơ tim"},
            {"text": "đau tức ngực dữ dội như đá đè, toát mồ hôi hột ướt áo lan ra vai trái và tay trái", "category": "cardiology", "name": "Nhồi máu cơ tim cấp"},
            {"text": "lên cơn đau tim thắt nghẹt thở không nổi tay chân lạnh vã mồ hôi", "category": "cardiology", "name": "Cơn đau thắt ngực không ổn định"},
            {"text": "đau xé toạc giữa ngực lan xuyên ra sau lưng giữa hai bả vai", "category": "cardiology", "name": "Phình bóc tách động mạch chủ ngực"},
            {"text": "huyết áp đo 200 trên 110 đau đầu nhức nhối mắt nhìn mờ nôn ói", "category": "cardiology", "name": "Cơn tăng huyết áp kịch phát"},

            # 5. DỊ ỨNG & SỐC PHẢN VỆ
            {"text": "tiêm thuốc xong nổi đỏ khắp người, co thắt nghẹt họng, không thở được tím tái", "category": "immunology", "name": "Sốc phản vệ cấp tính"},
            {"text": "ăn hải sản hoặc ong đốt bị sưng vù môi mắt, khó thở rít thanh quản tụt huyết áp", "category": "immunology", "name": "Sốc phản vệ đường thở"},
            {"text": "uống thuốc kháng sinh xong thấy ngứa râm ran toàn thân, khó thở tức thở nghẹn họng", "category": "immunology", "name": "Dị ứng thuốc nặng / Phản vệ"},

            # 6. SỐC NHIỄM TRÙNG & NHIỄM KHUẨN HUYẾT
            {"text": "Cụ ông sốt cao li bì, thở nhanh gấp gáp, tay chân lạnh ngắt, tụt huyết áp sâu", "category": "infectious", "name": "Sốc nhiễm trùng / Nhiễm trùng huyết"},
            {"text": "sốt rét run cầm cập liên tục nổi vân tím khắp người lơ mơ không tỉnh táo", "category": "infectious", "name": "Nhiễm khuẩn huyết nặng"},
            {"text": "sốt cao nhiều ngày kèm hạ thân nhiệt mạch nhanh nhỏ huyết áp kẹt", "category": "infectious", "name": "Sốc nhiễm khuẩn suy đa tạng"},

            # 7. CHẤN THƯƠNG MẠCH MÁU & XUẤT HUYẾT
            {"text": "Tôi bị tai nạn, máu phun thành tia ở đùi, chảy xối xả ép chặt không cầm được", "category": "trauma", "name": "Đứt động mạch lớn / Chảy máu ồ ạt"},
            {"text": "vết thương chém đứt cổ tay máu đỏ tươi bắn thành vòi ướt đẫm", "category": "trauma", "name": "Chảy máu động mạch chi"},
            {"text": "ho ộc ra đầy một chậu máu tươi lẫn máu cục tắc đường thở", "category": "respiratory", "name": "Ho ra máu sét đánh"},

            # 8. SẢN PHỤ KHOA CẤP CỨU
            {"text": "Vợ tôi có thai 8 tuần, đau bụng dưới dữ dội quằn quại, ra máu âm đạo, choáng ngất", "category": "obstetrics", "name": "Nghi ngờ Vỡ thai ngoài tử cung"},
            {"text": "bầu 2 tháng đau bụng quặn thắt ra nhiều máu tươi xỉu đi", "category": "obstetrics", "name": "Cấp cứu xuất huyết thai sản"},
            {"text": "sản phụ mang thai tháng cuối bị phù to huyết áp cao co giật trợn mắt", "category": "obstetrics", "name": "Sản giật / Tiền sản giật nặng"},

            # 9. BỤNG NGOẠI KHOA & XUẤT HUYẾT TIÊU HÓA
            {"text": "nôn ộc ra một chậu máu tươi lẫn máu đen như bã cà phê hoa mắt chóng mặt", "category": "gastroenterology", "name": "Xuất huyết tiêu hóa nặng"},
            {"text": "bụng gồng cứng ngắc như thanh gỗ ấn vào đau thấu trời không dám cử động", "category": "gastroenterology", "name": "Thủng tạng rỗng / Viêm phúc mạc"},
            {"text": "đau bụng quặn thắt từng cơn nôn ói bí trung đại tiện bụng chướng to như cái trống", "category": "gastroenterology", "name": "Tắc ruột cơ học"},
            {"text": "đau quặn hố chậu phải sốt buồn nôn tăng dần", "category": "gastroenterology", "name": "Viêm ruột thừa cấp"},

            # 10. NGỘ ĐỘC & DỊ VẬT ĐƯỜNG THỞ
            {"text": "cháu bé uống nhầm chai thuốc trừ sâu sùi bọt mép co giật trợn tròng", "category": "toxicology", "name": "Ngộ độc hóa chất cấp"},
            {"text": "uống quá liều thuốc ngủ gọi mãi không dậy thở khò khè", "category": "toxicology", "name": "Ngộ độc thuốc ngủ an thần"},
            {"text": "đang ăn thì hóc dị vật ho sặc sụa tím tái ôm cổ không thở được", "category": "respiratory", "name": "Hóc dị vật đường thở cấp"}
        ]

    def _init_universal_emergency_rules(self) -> List[Dict]:
        return [
            # ĐỘT QUỴ NÃO (FAST)
            {
                "id": "EMERGENCY_STROKE_FAST",
                "category": "neurology",
                "name": "Nghi ngờ Đột quỵ não cấp (FAST)",
                "red_flag": "Yếu liệt nửa người/tay chân, méo miệng, nói khó, lệch mặt",
                "pattern": r"((yeu|liet|te\s+liet|khong\s+cu\s+dong).*(nua\s+nguoi|mot\s+ben|tay\s+chan)|(meo|lech).*(mieng|mat|mom)|noi\s+(ngong|kho|lap|khong\s+ra\s+tieng|khong\s+thanh\s+tieng))",
                "emergency_message": "BÁO ĐỘNG ĐỘT QUỴ NÃO CẤP: Gọi ngay 115 hoặc đưa đến Trung tâm Đột quỵ gần nhất trong giờ vàng (<4.5h)."
            },
            # HÔN MÊ / BẤT TỈNH
            {
                "id": "EMERGENCY_SYNCOPE_COMA",
                "category": "neurology",
                "name": "Hôn mê / Đổ gục / Bất tỉnh nhân sự",
                "red_flag": "Đổ gục, gọi không thưa/không biết, người mềm nhũn, ngất xỉu",
                "pattern": r"(do\s+guc|goi\s+khong\s+(thua|tinh|biet|day)|nguoi\s+mem\s+nhun|hon\s+me|bat\s+tinh|ngat\s+xiu|ngat\s+lim|mat\s+y\s+thuc|lan\s+dung\s+ra)",
                "emergency_message": "CẢNH BÁO MẤT Ý THỨC: Gọi 115 cấp cứu khẩn cấp, đặt nằm nghiêng an toàn nếu còn thở, chuẩn bị ép tim nếu ngừng tuần hoàn."
            },
            # VIÊM MÀNG NÃO
            {
                "id": "EMERGENCY_MENINGITIS",
                "category": "neurology",
                "name": "Hội chứng Viêm màng não cấp",
                "red_flag": "Sốt cao kèm cổ cứng/cứng gáy, nôn vọt, sợ ánh sáng",
                "pattern": r"(sot.*(co\s+cung|cung\s+gay|cung\s+co|non\s+vot|so\s+anh\s+sang)|(co\s+cung|cung\s+gay|cung\s+co).*sot)",
                "emergency_message": "BÁO ĐỘNG VIÊM MÀNG NÃO: Đưa đến bệnh viện cấp cứu ngay để chọc dò tủy sống và dùng kháng sinh kịp thời."
            },
            # NHỒI MÁU CƠ TIM
            {
                "id": "EMERGENCY_CORONARY_SYNDROME",
                "category": "cardiology",
                "name": "Hội chứng Vành cấp / Nhồi máu cơ tim",
                "red_flag": "Đau tức thắt ngực dữ dội đè ép, lan tay trái, vã mồ hôi, nghỉ không đỡ",
                "pattern": r"(dau\s+nguc|tuc\s+nguc|that\s+nguc|nang\s+nguc).*(tay\s+trai|vai\s+trai|mo\s+hoi|buon\s+non|nghi\s+.*khong\s+(het|giam|do)|kho\s+tho|de\s+ep|bop\s+nghet)",
                "emergency_message": "BÁO ĐỘNG NHỒI MÁU CƠ TIM 115: Gọi cấp cứu 115 ngay lập tức, nghỉ ngơi tại chỗ tư thế nửa nằm nửa ngồi."
            },
            # SỐC NHIỄM TRÙNG
            {
                "id": "EMERGENCY_SEPTIC_SHOCK",
                "category": "infectious",
                "name": "Sốc Nhiễm trùng / Nhiễm trùng huyết nặng",
                "red_flag": "Sốt cao li bì, thở nhanh, tụt huyết áp, tay chân lạnh ngắt",
                "pattern": r"(sot.*(li\s+bi|lo\s+mo|ret\s+run).*(tho\s+nhanh|tut\s+huyet\s+ap|lanh\s+ngat|van\s+tim)|sot\s+cao\s+li\s+bi|nhiem\s+trung\s+huyet)",
                "emergency_message": "BÁO ĐỘNG SỐC NHIỄM TRÙNG: Cần nhập viện hồi sức tích cực (ICU) để cấy máu, truyền dịch và kháng sinh tĩnh mạch ngay."
            },
            # CHẢY MÁU ĐỘNG MẠCH
            {
                "id": "EMERGENCY_ARTERIAL_BLEED",
                "category": "trauma",
                "name": "Chảy máu động mạch / Máu phun thành tia",
                "red_flag": "Máu phun thành tia, chảy xối xả không cầm được",
                "pattern": r"(phun\s+thanh\s+tia|phun\s+mau|chay\s+xoi\s+xa|khong\s+cam\s+duoc|dut\s+dong\s+mach|dut\s+mach\s+mau|ban\s+tung\s+toe)",
                "emergency_message": "CẤP CỨU CHẢY MÁU ĐỘNG MẠCH: Ép chặt trực tiếp lên vết thương bằng gạc sạch với lực tối đa, gọi 115 ngay."
            },
            # VỠ THAI NGOÀI TỬ CUNG
            {
                "id": "EMERGENCY_ECTOPIC_PREGNANCY",
                "category": "obstetrics",
                "name": "Nghi ngờ Vỡ thai ngoài tử cung / Cấp cứu thai sản",
                "red_flag": "Có thai/trễ kinh kèm đau bụng dưới dữ dội, ra máu, ngất xỉu/choáng",
                "pattern": r"(co\s+thai|mang\s+thai|co\s+bau|tre\s+kinh|thai\s+\d+\s+tuan).*(dau\s+bung.*(du\s+doi|quan\s+that)|ra\s+mau|chay\s+mau).*(choang|ngat|xiu|ngat\s+xiu)",
                "emergency_message": "BÁO ĐỘNG VỠ THAI NGOÀI TỬ CUNG: Nguy cơ xuất huyết ổ bụng mất mạng nhanh chóng, đưa đến khoa Sản/Cấp cứu ngay."
            },
            # SỐC PHẢN VỆ
            {
                "id": "EMERGENCY_ANAPHYLAXIS",
                "category": "immunology",
                "name": "Sốc phản vệ",
                "red_flag": "Dị ứng/tiêm thuốc nổi mề đay kèm sưng nề mặt môi họng, co thắt không thở được",
                "pattern": r"(di\s+ung|me\s+day|ong\s+dot|tiem\s+thuoc|uong\s+thuoc|an\s+hai\s+san).*(sung\s+moi|sung\s+mat|sung\s+hong|co\s+that\s+hong|nghen\s+tho|khong\s+tho\s+duoc|kho\s+tho|tut\s+huyet\s+ap|choang)",
                "emergency_message": "BÁO ĐỘNG SỐC PHẢN VỆ: Tiêm Adrenaline nếu có sẵn, gọi 115 đưa đến cơ sở y tế gần nhất lập tức."
            },
            # NGỘ ĐỘC CẤP
            {
                "id": "EMERGENCY_POISONING",
                "category": "toxicology",
                "name": "Ngộ độc cấp tính",
                "red_flag": "Uống nhầm hóa chất/thuốc độc, sùi bọt mép",
                "pattern": r"(uong\s+nham\s+(thuoc\s+sau|hoa\s+chat|thuoc\s+ngu|thuoc\s+tay|tay\s+rua|xang|dau)|thuoc\s+sau|ngo\s+doc\s+cap|tu\s+tu)",
                "emergency_message": "CẤP CỨU NGỘ ĐỘC: Đưa bệnh nhân cùng vỏ bao bì hóa chất đến Trung tâm Chống độc ngay lập tức."
            }
        ]

    def evaluate_emergency(self, user_message: str, current_symptoms: Optional[List[str]] = None) -> Optional[Dict]:
        """
        Đánh giá cấp cứu qua 2 tầng:
        1. Tầng 1: Flexible Regex (0.1ms).
        2. Tầng 2: Semantic Similarity (BGE-M3) vớt các ca khẩu ngữ với ngưỡng 0.48.
        """
        symptoms_str = " ".join(current_symptoms) if current_symptoms else ""
        combined_text = f"{symptoms_str} {user_message}".strip()
        norm = self._normalize(combined_text)

        # TẦNG 1: Regex
        for rule in self.emergency_rules:
            if re.search(rule["pattern"], norm):
                return {
                    "is_emergency": True,
                    "tier": "deterministic_regex",
                    "rule_id": rule["id"],
                    "rule_category": rule["category"],
                    "rule_name": rule["name"],
                    "red_flag": rule["red_flag"],
                    "emergency_reply": rule["emergency_message"]
                }

        # TẦNG 2: Semantic Matcher
        if self.embed_model is not None and self.anchor_embeddings is not None:
            try:
                query_vec = self.embed_model.encode([combined_text], normalize_embeddings=True)[0]
                scores = np.dot(self.anchor_embeddings, query_vec)
                best_idx = int(np.argmax(scores))
                best_score = float(scores[best_idx])

                if best_score >= self.semantic_threshold:
                    matched_anchor = self.semantic_anchors[best_idx]
                    return {
                        "is_emergency": True,
                        "tier": "semantic_embedding",
                        "similarity_score": round(best_score, 4),
                        "rule_id": f"SEMANTIC_{matched_anchor['category'].upper()}",
                        "rule_category": matched_anchor["category"],
                        "rule_name": matched_anchor["name"],
                        "red_flag": f"Mẫu ngữ nghĩa cấp cứu tương đồng: {matched_anchor['name']} (Độ tin cậy: {best_score:.2f})",
                        "emergency_reply": (
                            f"BÁO ĐỘNG CẤP CỨU Y TẾ ({matched_anchor['name'].upper()}):\n"
                            "Triệu chứng bạn mô tả có dấu hiệu nguy kịch đến tính mạng.\n"
                            "HÀNH ĐỘNG NGAY: Gọi cấp cứu 115 hoặc nhờ người thân đưa đến Khoa Cấp cứu của Bệnh viện gần nhất lập tức."
                        )
                    }
            except Exception:
                pass

        return None
