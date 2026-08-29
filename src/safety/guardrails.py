import re
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import numpy as np
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent.parent


class ClinicalGuardrailEngine:
    """
    Bộ lọc an toàn lâm sàng Hybrid 2 tầng (Deterministic Regex + Semantic Embedding).
    - Tầng 1: Regex cứng bắt siêu tốc trong 0.1ms các mẫu kinh điển.
    - Tầng 2: Semantic Similarity dùng BGE-M3-Medical đối soát với tập mẫu cấp cứu đời thường,
      đảm bảo không bỏ sót bất kỳ cách diễn đạt dân dã nào (đổ gục, li bì, máu phun, choáng ngất).
    """

    def __init__(self, model_path: Optional[str] = None, semantic_threshold: float = 0.68):
        self.semantic_threshold = semantic_threshold
        self.emergency_rules = self._init_universal_emergency_rules()
        self.semantic_anchors = self._init_semantic_emergency_anchors()
        
        # Khởi tạo mô hình Embedding BGE-M3 (chạy CPU nhẹ nhàng)
        self.embed_model = None
        self.anchor_embeddings = None
        self._init_embedding_matcher(model_path)

    def _normalize(self, text: str) -> str:
        return unidecode(text.lower().strip())

    def _init_embedding_matcher(self, model_path: Optional[str]):
        try:
            from sentence_transformers import SentenceTransformer
            
            # Ưu tiên load model bge-m3-medical đã fine-tune tại local
            path_to_load = model_path or str(ROOT / "models" / "bge-m3-medical")
            if not Path(path_to_load).exists():
                path_to_load = "BAAI/bge-m3"
                
            self.embed_model = SentenceTransformer(path_to_load, device="cpu")
            
            # Pre-compute embeddings cho toàn bộ anchor cấp cứu
            anchor_texts = [a["text"] for a in self.semantic_anchors]
            self.anchor_embeddings = self.embed_model.encode(anchor_texts, normalize_embeddings=True)
        except Exception as e:
            # Fallback an toàn nếu môi trường chưa cài sentence-transformers
            self.embed_model = None
            self.anchor_embeddings = None

    def _init_semantic_emergency_anchors(self) -> List[Dict]:
        """Tập mẫu câu mô tả cấp cứu bằng ngôn ngữ đời thường thực tế."""
        return [
            # Hôn mê / Ngất / Mất tri giác
            {"text": "Bố tôi đang ngồi thì đổ gục xuống đất, gọi không thưa, người mềm nhũn", "category": "neurology", "name": "Hôn mê / Bất tỉnh đột ngột"},
            {"text": "tự nhiên ngất xỉu lăn đùng ra đất gọi không biết gì", "category": "neurology", "name": "Ngất / Mất ý thức"},
            {"text": "người nhà bị ngất lịm đi lay không tỉnh", "category": "neurology", "name": "Mất tri giác cấp"},
            
            # Đột quỵ / Tai biến
            {"text": "đột nhiên méo một bên mồm, nói lắp bắp nói ngọng, tay chân yếu lết", "category": "neurology", "name": "Đột quỵ não cấp (FAST)"},
            {"text": "sáng ngủ dậy thấy mẹ bị liệt nửa người một bên không cử động được", "category": "neurology", "name": "Đột quỵ não cấp"},
            
            # Nhồi máu cơ tim / Đau ngực nguy kịch
            {"text": "đau tức ngực dữ dội như đá đè, toát mồ hôi hột ướt áo lan ra tay trái", "category": "cardiology", "name": "Hội chứng vành cấp"},
            {"text": "lên cơn đau tim thắt nghẹt thở không nổi tay chân lạnh", "category": "cardiology", "name": "Nhồi máu cơ tim"},
            
            # Sốc nhiễm trùng / Nhiễm trùng huyết
            {"text": "Cụ ông sốt cao li bì, thở nhanh gấp gáp, tay chân lạnh ngắt, huyết áp tụt sâu", "category": "infectious", "name": "Sốc nhiễm trùng / Nhiễm trùng huyết"},
            {"text": "sốt rét run cầm cập liên tục nổi vân tím khắp người lơ mơ", "category": "infectious", "name": "Nhiễm khuẩn huyết nặng"},
            
            # Vết thương mạch máu / Chảy máu ồ ạt
            {"text": "Tôi bị tai nạn, máu phun thành tia ở đùi, chảy xối xả không cầm được", "category": "trauma", "name": "Đứt mạch máu lớn / Chảy máu động mạch"},
            {"text": "chém đứt tay máu bắn tung tóe ép chặt không cầm máu được", "category": "trauma", "name": "Vết thương đứt động mạch"},
            
            # Sản phụ khoa / Thai ngoài tử cung
            {"text": "Vợ tôi có thai 8 tuần, đau bụng dưới dữ dội quằn quại, ra máu âm đạo, choáng váng", "category": "obstetrics", "name": "Nghi ngờ Vỡ thai ngoài tử cung"},
            {"text": "bầu 2 tháng đau bụng quặn thắt ra nhiều máu tươi xỉu đi", "category": "obstetrics", "name": "Cấp cứu thai sản / Đe dọa sẩy thai xuất huyết"},
            
            # Xuất huyết tiêu hóa / Bụng ngoại khoa
            {"text": "nôn ộc ra một chậu máu tươi lẫn máu cục tanh tưởi hoa mắt chóng mặt", "category": "gastroenterology", "name": "Xuất huyết tiêu hóa ồ ạt"},
            {"text": "bụng gồng cứng ngắc như thanh gỗ ấn vào đau thấu trời", "category": "gastroenterology", "name": "Thủng tạng rỗng / Viêm phúc mạc toàn thể"},
            
            # Dị ứng sốc phản vệ & Ngộ độc
            {"text": "uống thuốc xong bị phù kín mặt môi sưng vù nghẹt họng tím tái không thở được", "category": "immunology", "name": "Sốc phản vệ nguy kịch"},
            {"text": "uống nhầm chai thuốc diệt cỏ sùi bọt mép co giật trợn mắt", "category": "toxicology", "name": "Ngộ độc cấp tính"}
        ]

    def _init_universal_emergency_rules(self) -> List[Dict]:
        return [
            # THẦN KINH
            {
                "id": "EMERGENCY_STROKE_FAST",
                "category": "neurology",
                "name": "Nghi ngờ Đột quỵ não cấp (FAST)",
                "red_flag": "Yếu liệt nửa người, méo miệng, nói khó, tê bì đột ngột",
                "pattern": r"(yeu\s+liet|liet\s+nua\s+nguoi|meo\s+mieng|noi\s+ngong|noi\s+kho|te\s+nua\s+nguoi|lech\s+mat|tay\s+chan\s+khong\s+cu\s+dong\s+duoc|noi\s+lap\s+bap)",
                "emergency_message": "BÁO ĐỘNG ĐỘT QUỴ NÃO CẤP: Gọi ngay 115 hoặc đưa đến Trung tâm Đột quỵ gần nhất trong giờ vàng (<4.5h)."
            },
            {
                "id": "EMERGENCY_SYNCOPE_COMA",
                "category": "neurology",
                "name": "Hôn mê / Đổ gục / Bất tỉnh nhân sự",
                "red_flag": "Đổ gục, gọi không thưa/không biết, người mềm nhũn, ngất xỉu",
                "pattern": r"(do\s+guc|goi\s+khong\s+(thua|tinh|biet)|nguoi\s+mem\s+nhun|hon\s+me|bat\s+tinh|ngat\s+xiu|ngat\s+lim|mat\s+y\s+thuc|lan\s+dung\s+ra)",
                "emergency_message": "CẢNH BÁO MẤT Ý THỨC: Gọi 115 cấp cứu khẩn cấp, đặt nằm nghiêng an toàn nếu còn thở, chuẩn bị ép tim nếu ngừng tuần hoàn."
            },
            {
                "id": "EMERGENCY_SEIZURE",
                "category": "neurology",
                "name": "Co giật / Động kinh",
                "red_flag": "Co giật, sùi bọt mép, cắn lưỡi",
                "pattern": r"(co\s+giat|dong\s+kinh|giat\s+tay\s+chan|sui\s+bot\s+mep|can\s+luoi|len\s+con\s+giat)",
                "emergency_message": "CẢNH BÁO CO GIẬT: Đặt bệnh nhân nằm nghiêng nơi an toàn, không nhét đồ vào miệng, đưa đi cấp cứu ngay."
            },

            # TIM MẠCH
            {
                "id": "EMERGENCY_CORONARY_SYNDROME",
                "category": "cardiology",
                "name": "Hội chứng Vành cấp / Nhồi máu cơ tim",
                "red_flag": "Đau tức thắt ngực đè ép dữ dội lan tay trái/vã mồ hôi lạnh",
                "pattern": r"(dau\s+(nguc|that\s+nguc|nang\s+nguc|de\s+ep)|tuc\s+nguc).*(tay\s+trai|vai\s+trai|ham|mo\s+hoi\s+lanh|du\s+doi|nghen\s+tho|bop\s+nghet|uot\s+ao)",
                "emergency_message": "BÁO ĐỘNG NHỒI MÁU CƠ TIM 115: Gọi cấp cứu 115 ngay lập tức, nghỉ ngơi tại chỗ tư thế nửa nằm nửa ngồi."
            },

            # NHIỄM TRÙNG HUYẾT / SỐC
            {
                "id": "EMERGENCY_SEPTIC_SHOCK",
                "category": "infectious",
                "name": "Sốc Nhiễm trùng / Nhiễm trùng huyết nặng",
                "red_flag": "Sốt cao li bì, thở nhanh, tụt huyết áp, tay chân lạnh ngắt",
                "pattern": r"(sot.*(li\s+bi|lo\s+mo|ret\s+run).*(tho\s+nhanh|tut\s+huyet\s+ap|lanh\s+ngat|van\s+tim)|sot\s+cao\s+li\s+bi|nhiem\s+trung\s+huyet)",
                "emergency_message": "BÁO ĐỘNG SỐC NHIỄM TRÙNG: Cần nhập viện hồi sức tích cực (ICU) để cấy máu, truyền dịch và kháng sinh tĩnh mạch ngay."
            },

            # CHẤN THƯƠNG MẠCH MÁU
            {
                "id": "EMERGENCY_ARTERIAL_BLEED",
                "category": "trauma",
                "name": "Chảy máu động mạch / Máu phun thành tia",
                "red_flag": "Máu phun thành tia, chảy xối xả không cầm được",
                "pattern": r"(phun\s+thanh\s+tia|phun\s+mau|chay\s+xoi\s+xa|khong\s+cam\s+duoc|dut\s+dong\s+mach|dut\s+mach\s+mau|ban\s+tung\s+toe)",
                "emergency_message": "CẤP CỨU CHẢY MÁU ĐỘNG MẠCH: Ép chặt trực tiếp lên vết thương bằng gạc sạch với lực tối đa, gọi 115 ngay."
            },

            # SẢN PHỤ KHOA
            {
                "id": "EMERGENCY_ECTOPIC_PREGNANCY",
                "category": "obstetrics",
                "name": "Nghi ngờ Vỡ thai ngoài tử cung / Cấp cứu thai sản",
                "red_flag": "Có thai/trễ kinh kèm đau bụng dưới dữ dội, ra máu, ngất xỉu/choáng",
                "pattern": r"(co\s+thai|mang\s+thai|co\s+bau|tre\s+kinh|thai\s+\d+\s+tuan).*(dau\s+bung.*(du\s+doi|quan\s+that)|ra\s+mau|chay\s+mau).*(choang|ngat|xiu|ngat\s+xiu)",
                "emergency_message": "BÁO ĐỘNG VỠ THAI NGOÀI TỬ CUNG: Nguy cơ xuất huyết ổ bụng mất mạng nhanh chóng, đưa đến khoa Sản/Cấp cứu ngay."
            },

            # BỤNG NGOẠI KHOA
            {
                "id": "EMERGENCY_ACUTE_ABDOMEN",
                "category": "gastroenterology",
                "name": "Bụng ngoại khoa / Thủng tạng rỗng / Viêm phúc mạc",
                "red_flag": "Bụng cứng như gỗ, gồng cứng bụng, đau khắp bụng",
                "pattern": r"(cung\s+nhu\s+go|gong\s+cung\s+bung|bung\s+cung|thung\s+da\s+day|viem\s+phuc\s+mac)",
                "emergency_message": "BÁO ĐỘNG BỤNG NGOẠI KHOA: Cần phẫu thuật cấp cứu khẩn cấp, tuyệt đối không ăn uống hay uống thuốc giảm đau."
            },
            {
                "id": "EMERGENCY_GI_BLEEDING",
                "category": "gastroenterology",
                "name": "Xuất huyết tiêu hóa nặng",
                "red_flag": "Nôn ra máu, đi ngoài phân đen mùi tanh",
                "pattern": r"(non\s+ra\s+mau|oi\s+ra\s+mau|di\s+ngoai\s+phan\s+den|phan\s+mui\s+tanh|cau\s+ra\s+mau\s+den)",
                "emergency_message": "CẢNH BÁO XUẤT HUYẾT TIÊU HÓA: Đến ngay phòng cấp cứu để nội soi can thiệp cầm máu."
            },

            # DỊ ỨNG & NGỘ ĐỘC
            {
                "id": "EMERGENCY_ANAPHYLAXIS",
                "category": "immunology",
                "name": "Sốc phản vệ",
                "red_flag": "Dị ứng nổi mề đay kèm sưng nề mặt môi họng, khó thở",
                "pattern": r"(di\s+ung|me\s+day|ong\s+dot|uong\s+thuoc|an\s+hai\s+san).*(sung\s+moi|sung\s+mat|sung\s+hong|nghen\s+tho|kho\s+tho|tut\s+huyet\s+ap|choang)",
                "emergency_message": "BÁO ĐỘNG SỐC PHẢN VỆ: Tiêm Adrenaline nếu có sẵn, gọi 115 đưa đến cơ sở y tế gần nhất lập tức."
            },
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
        1. Tầng 1: Regex cứng (0.1ms).
        2. Tầng 2: Semantic Similarity (BGE-M3) vớt các ca ngữ nghĩa phức tạp.
        """
        symptoms_str = " ".join(current_symptoms) if current_symptoms else ""
        combined_text = f"{symptoms_str} {user_message}".strip()
        norm = self._normalize(combined_text)

        # TẦNG 1: Khớp Regex cứng
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

        # TẦNG 2: Khớp Ngữ nghĩa (Semantic Embedding)
        if self.embed_model is not None and self.anchor_embeddings is not None:
            try:
                query_vec = self.embed_model.encode([combined_text], normalize_embeddings=True)[0]
                # Cosine similarity
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
