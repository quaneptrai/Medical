import json
import os
import re
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import numpy as np
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent.parent


class ClinicalGuardrailEngine:
    """
    Two-stage clinical safety filter.

    Deterministic red-flag rules may trigger an emergency override directly.
    Embedding similarity is advisory by default because calibration showed that a
    single cosine threshold cannot separate emergency from routine cases with an
    acceptable false-positive rate. ``semantic_mode='auto'`` is therefore only
    allowed with an explicitly deployment-approved calibration artifact.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        semantic_threshold: Optional[float] = None,
        calibration_path: Optional[str] = None,
        require_semantic: bool = True,
        allow_unverified_config: bool = False,
        semantic_mode: Optional[str] = None,
    ):
        config_path = Path(
            calibration_path
            or os.getenv("BOTMED_GUARDRAIL_CONFIG", "")
            or ROOT / "artifacts" / "evaluation" / "guardrail_calibration.json"
        )
        runtime_config = self._load_runtime_config(config_path)
        self.semantic_mode = (
            semantic_mode
            or os.getenv("BOTMED_GUARDRAIL_SEMANTIC_MODE")
            or runtime_config.get("semantic_mode")
            or "advisory"
        ).strip().lower()
        if self.semantic_mode not in {"advisory", "auto", "off"}:
            raise ValueError("semantic_mode must be one of: advisory, auto, off")
        if (
            self.semantic_mode == "auto"
            and runtime_config.get("deployment_approved") is not True
            and not allow_unverified_config
        ):
            raise RuntimeError(
                "Automatic semantic emergency escalation requires a deployment-approved calibration"
            )
        if (
            self.semantic_mode == "auto"
            and runtime_config
            and runtime_config.get("runtime_verified") is not True
            and not allow_unverified_config
        ):
            raise RuntimeError(
                f"Guardrail runtime config has not passed production wiring verification: {config_path}"
            )

        configured_threshold = os.getenv("BOTMED_GUARDRAIL_THRESHOLD")
        if semantic_threshold is not None:
            self.semantic_threshold = float(semantic_threshold)
        elif configured_threshold is not None:
            self.semantic_threshold = float(configured_threshold)
        else:
            self.semantic_threshold = float(runtime_config.get("selected_threshold", 0.52))

        configured_model = (
            model_path
            or os.getenv("BOTMED_GUARDRAIL_MODEL")
            or runtime_config.get("model")
        )
        if configured_model is None:
            local_default = ROOT / "models" / "bge-m3-medical-v2-safe-fp16"
            configured_model = str(local_default) if local_default.exists() else "BAAI/bge-m3"
        self.model_path = self._resolve_model_reference(str(configured_model))
        self.calibration_path = str(config_path) if config_path.exists() else None
        self.emergency_rules = self._init_universal_emergency_rules()
        self.semantic_anchors = self._build_symmetric_emergency_anchors()
        
        self.embed_model = None
        self.anchor_embeddings = None
        self.semantic_load_error = None
        if self.semantic_mode != "off":
            self._init_embedding_matcher(self.model_path, require_semantic=require_semantic)

    @staticmethod
    def _load_runtime_config(path: Path) -> Dict:
        if not path.exists():
            return {}
        try:
            with path.open("r", encoding="utf-8") as handle:
                config = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Invalid guardrail runtime config at {path}: {exc}") from exc
        if not isinstance(config, dict):
            raise RuntimeError(f"Guardrail runtime config must be a JSON object: {path}")
        return config

    @staticmethod
    def _resolve_model_reference(reference: str) -> str:
        path = Path(reference)
        if path.is_absolute():
            return str(path)
        project_path = ROOT / path
        if project_path.exists() or reference.startswith(("models/", "models\\", ".")):
            return str(project_path)
        return reference

    def _normalize(self, text: str) -> str:
        return unidecode(text.lower().strip())

    def _build_symmetric_emergency_anchors(self) -> List[Dict]:
        """
        Nhân đôi tập neo đối xứng: mỗi câu có dấu sẽ có thêm một bản unidecode của chính nó.
        Giúp câu người dùng gõ không dấu khớp chính xác với neo không dấu ở mức ~0.96.
        """
        raw_anchors = self._init_raw_semantic_anchors()
        symmetric_anchors = []
        
        for a in raw_anchors:
            symmetric_anchors.append(a)
            unaccented_text = unidecode(a["text"])
            if unaccented_text != a["text"]:
                symmetric_anchors.append({
                    "text": unaccented_text,
                    "category": a["category"],
                    "name": a["name"]
                })
                
        return symmetric_anchors

    def _init_raw_semantic_anchors(self) -> List[Dict]:
        """Ngân hàng mẫu câu cấp cứu toàn diện bao phủ mọi nhóm hội chứng nguy kịch."""
        return [
            # 1. HẠ ĐƯỜNG HUYẾT NGUY KỊCH (HYPOGLYCEMIA)
            {"text": "người bị tiểu đường tự nhiên run bần bật toát mồ hôi lạnh lơ mơ nói nhảm lả đi", "category": "endocrinology", "name": "Hạ đường huyết nặng / Hôn mê tiểu đường"},
            {"text": "tiêm insulin quá liều tụt đường huyết co giật mê man bất tỉnh", "category": "endocrinology", "name": "Cơn hạ đường huyết cấp"},
            {"text": "đói lả run bần bật vã mồ hôi hột xỉu đi lay gọi không tỉnh", "category": "endocrinology", "name": "Hạ đường huyết nguy kịch"},

            # 2. BỎNG DIỆN RỘNG & BỎNG ĐƯỜNG THỞ (BURNS)
            {"text": "cháu bé bị bỏng nước sôi diện rộng lột da đỏ rát khóc thét", "category": "trauma", "name": "Bỏng nhiệt / Bỏng nước sôi diện rộng"},
            {"text": "bị bỏng lửa cháy xém toàn thân rộp nước phồng da diện tích lớn", "category": "trauma", "name": "Bỏng lửa nặng"},
            {"text": "hít phải khói lửa cháy nghẹt thở bỏng đường hô hấp ho ra tro", "category": "trauma", "name": "Bỏng đường thở do khói độc"},

            # 3. ĐIỆN GIẬT & SÉT ĐÁNH (ELECTROCUTION)
            {"text": "bị điện giật té ngã tức ngực tim đập loạn nhịp thở dốc ngất xỉu", "category": "trauma", "name": "Điện giật kèm rối loạn nhịp tim"},
            {"text": "bị điện giật cháy tay chân ngưng tim ngưng thở lay không dậy", "category": "trauma", "name": "Tai nạn điện giật ngừng tuần hoàn"},

            # 4. NGẠT KHÍ & ĐUỐI NƯỚC (ASPHYXIA & DROWNING)
            {"text": "đốt than sưởi trong phòng kín bị ngạt khí hôn mê tím tái cả nhà", "category": "toxicology", "name": "Ngộ độc khí CO / Ngạt khí than"},
            {"text": "ngửi mùi khí gas trong phòng kín bị ngất xỉu nôn mửa choáng váng lơ mơ", "category": "toxicology", "name": "Ngạt khí độc / Ngộ độc khí gas"},
            {"text": "cháu bé bị ngã xuống ao đuối nước vớt lên tím tái sặc nước ngưng thở", "category": "respiratory", "name": "Đuối nước / Ngạt nước cấp"},

            # 5. CHẤN THƯƠNG SỌ NÃO & TAI NẠN (HEAD TRAUMA)
            {"text": "té xe đập đầu xuống đường nôn vọt liên tục lơ mơ gọi không biết", "category": "trauma", "name": "Chấn thương sọ não cấp"},
            {"text": "tai nạn giao thông chấn thương đầu chảy máu tai máu mũi lú lẫn bất tỉnh", "category": "trauma", "name": "Chấn thương sọ não nặng"},

            # 6. XUẤT HUYẾT MỌI ĐƯỜNG RA (MASSIVE BLEEDING MULTI-ORIFICE)
            {"text": "đi cầu ra toàn máu đỏ tươi xối xả choáng váng muốn xỉu tụt huyết áp", "category": "gastroenterology", "name": "Xuất huyết tiêu hóa dưới nặng"},
            {"text": "dao cắt vào cổ tay cứa đứt mạch máu chảy xối xả ép chặt không cầm được", "category": "trauma", "name": "Vết thương dao cắt đứt mạch máu chi"},
            {"text": "tiểu ra toàn nước tiểu đỏ quạch lẫn máu cục đông nghẹt bàng quang", "category": "urology", "name": "Xuất huyết đường tiết niệu cấp"},
            {"text": "nôn ộc ra một chậu máu tươi lẫn máu đen như bã cà phê hoa mắt chóng mặt", "category": "gastroenterology", "name": "Xuất huyết tiêu hóa trên ồ ạt"},
            {"text": "ho ộc ra đầy một chậu máu tươi lẫn máu cục tắc đường thở", "category": "respiratory", "name": "Ho ra máu sét đánh"},
            {"text": "Tôi bị tai nạn, máu phun thành tia ở đùi, chảy xối xả không cầm được", "category": "trauma", "name": "Đứt động mạch lớn / Chảy máu ồ ạt"},

            # 7. ĐỘT QUỴ NÃO & THẦN KINH (FAST & STROKE)
            {"text": "tay chân một bên yếu hẳn, miệng lệch sang trái nói ngọng", "category": "neurology", "name": "Đột quỵ não cấp (FAST)"},
            {"text": "Bác tôi đang ngồi thì tay chân một bên yếu hẳn, miệng lệch sang trái nói ngọng", "category": "neurology", "name": "Đột quỵ não cấp (FAST)"},
            {"text": "đột nhiên méo một bên mồm, nói lắp bắp nói ngọng, tay chân yếu lết không nâng lên được", "category": "neurology", "name": "Đột quỵ não cấp (FAST)"},
            {"text": "sáng ngủ dậy thấy mẹ bị liệt nửa người một bên không cử động được, mặt xệ", "category": "neurology", "name": "Đột quỵ não cấp"},
            {"text": "tự nhiên nửa người tê dại, cầm đũa rơi, méo miệng cười lệch mặt", "category": "neurology", "name": "Cơn thiếu máu não thoáng qua / Đột quỵ"},

            # 8. HÔN MÊ & MẤT TRI GIÁC
            {"text": "Bố tôi đang ngồi thì đổ gục xuống đất, gọi không thưa, người mềm nhũn", "category": "neurology", "name": "Hôn mê / Bất tỉnh đột ngột"},
            {"text": "tự nhiên ngất xỉu lăn đùng ra đất gọi không biết gì, thở ngáy", "category": "neurology", "name": "Ngất / Mất ý thức"},
            {"text": "người nhà bị ngất lịm đi lay không tỉnh, lay gọi không phản ứng", "category": "neurology", "name": "Mất tri giác cấp"},
            {"text": "co giật toàn thân sùi bọt mép cắn vào lưỡi trợn ngược mắt", "category": "neurology", "name": "Cơn động kinh / Co giật toàn thể"},

            # 9. VIÊM MÀNG NÃO & ĐAU ĐẦU SÉT ĐÁNH
            {"text": "bé sốt cao, nôn vọt, cổ cứng, sợ ánh sáng", "category": "neurology", "name": "Hội chứng Viêm màng não cấp"},
            {"text": "đau đầu dữ dội như búa bổ sét đánh chưa từng bị trong đời, đau muốn nổ tung đầu", "category": "neurology", "name": "Đau đầu sét đánh / Xuất huyết dưới nhện"},
            {"text": "sốt cao đau đầu dữ dội gáy cứng đờ không cúi cằm chạm ngực được", "category": "neurology", "name": "Viêm màng não mủ"},

            # 10. NHỒI MÁU CƠ TIM & TIM MẠCH
            {"text": "tức ngực như có ai ngồi lên, buồn nôn, ra mồ hôi hột, nghỉ mãi không hết", "category": "cardiology", "name": "Hội chứng Vành cấp / Nhồi máu cơ tim"},
            {"text": "đau tức ngực dữ dội như đá đè, toát mồ hôi hột ướt áo lan ra vai trái và tay trái", "category": "cardiology", "name": "Nhồi máu cơ tim cấp"},
            {"text": "lên cơn đau tim thắt nghẹt thở không nổi tay chân lạnh vã mồ hôi", "category": "cardiology", "name": "Cơn đau thắt ngực không ổn định"},
            {"text": "đau xé toạc giữa ngực lan xuyên ra sau lưng giữa hai bả vai", "category": "cardiology", "name": "Phình bóc tách động mạch chủ ngực"},
            {"text": "huyết áp đo 200 trên 110 đau đầu nhức nhối mắt nhìn mờ nôn ói", "category": "cardiology", "name": "Cơn tăng huyết áp kịch phát"},

            # 11. DỊ ỨNG & SỐC PHẢN VỆ
            {"text": "tiêm thuốc xong nổi đỏ khắp, co thắt họng, không thở được", "category": "immunology", "name": "Sốc phản vệ cấp tính"},
            {"text": "ăn hải sản hoặc ong đốt bị sưng vù môi mắt, khó thở rít thanh quản tụt huyết áp", "category": "immunology", "name": "Sốc phản vệ đường thở"},
            {"text": "uống thuốc kháng sinh xong thấy ngứa râm ran toàn thân, khó thở tức thở nghẹn họng", "category": "immunology", "name": "Dị ứng thuốc nặng / Phản vệ"},

            # 12. SỐC NHIỄM TRÙNG & NHIỄM KHUẨN HUYẾT
            {"text": "Cụ ông sốt cao li bì, thở nhanh, tay chân lạnh ngắt, tụt huyết áp", "category": "infectious", "name": "Sốc Nhiễm trùng / Nhiễm trùng huyết nặng"},
            {"text": "sốt rét run cầm cập liên tục nổi vân tím khắp người lơ mơ không tỉnh táo", "category": "infectious", "name": "Nhiễm khuẩn huyết nặng"},

            # 13. SẢN PHỤ KHOA CẤP CỨU
            {"text": "Vợ tôi có thai 8 tuần, đau bụng dưới dữ dội, ra máu, choáng", "category": "obstetrics", "name": "Nghi ngờ Vỡ thai ngoài tử cung / Cấp cứu thai sản"},
            {"text": "bầu 2 tháng đau bụng quặn thắt ra nhiều máu tươi xỉu đi", "category": "obstetrics", "name": "Cấp cứu xuất huyết thai sản"},
            {"text": "sản phụ mang thai tháng cuối bị phù to huyết áp cao co giật trợn mắt", "category": "obstetrics", "name": "Sản giật / Tiền sản giật nặng"},

            # 14. BỤNG NGOẠI KHOA
            {"text": "bụng gồng cứng ngắc như thanh gỗ ấn vào đau thấu trời không dám cử động", "category": "gastroenterology", "name": "Thủng tạng rỗng / Viêm phúc mạc"},
            {"text": "đau bụng quặn thắt từng cơn nôn ói bí trung đại tiện bụng chướng to như cái trống", "category": "gastroenterology", "name": "Tắc ruột cơ học"},
            {"text": "đau quặn hố chậu phải sốt buồn nôn tăng dần", "category": "gastroenterology", "name": "Viêm ruột thừa cấp"},

            # 15. NGỘ ĐỘC CẤP
            {"text": "cháu bé uống nhầm chai thuốc trừ sâu sùi bọt mép co giật trợn tròng", "category": "toxicology", "name": "Ngộ độc hóa chất cấp"},
            {"text": "uống quá liều thuốc ngủ gọi mãi không dậy thở khò khè", "category": "toxicology", "name": "Ngộ độc thuốc ngủ an thần"}
        ]

    def _init_universal_emergency_rules(self) -> List[Dict]:
        return [
            # ĐỘT QUỴ NÃO (FAST)
            {
                "id": "EMERGENCY_STROKE_FAST",
                "category": "neurology",
                "name": "Nghi ngờ Đột quỵ não cấp (FAST)",
                "red_flag": "Yếu liệt nửa người/tay chân, méo miệng, nói khó, lệch mặt",
                "pattern": r"((yeu|liet|te\s+liet|khong\s+cu\s+dong).*(nua\s+nguoi|mot\s+ben|tay\s+chan)|(tay\s+chan|nua\s+nguoi|mot\s+ben).*(yeu|liet|te\s+liet)|(meo|lech).*(mieng|mat|mom)|(mieng|mat|mom).*(meo|lech)|noi\s+(ngong|kho|lap|khong\s+ra\s+tieng|khong\s+thanh\s+tieng))",
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
            # HẠ ĐƯỜNG HUYẾT
            {
                "id": "EMERGENCY_HYPOGLYCEMIA",
                "category": "endocrinology",
                "name": "Cơn Hạ đường huyết nặng / Hôn mê tiểu đường",
                "red_flag": "Tiểu đường kèm run bần bật, vã mồ hôi, lơ mơ, ngất xỉu",
                "pattern": r"((tieu\s+duong|insulin|tut\s+duong).*(run|mo\s+hoi|lo\s+mo|la\s+di|ngat)|run\s+ban\s+bat.*(va\s+mo\s+hoi|lo\s+mo|xiu))",
                "emergency_message": "BÁO ĐỘNG HẠ ĐƯỜNG HUYẾT NẶNG: Cho uống ngay nước đường/nước ngọt nếu còn tỉnh, gọi 115 nếu lơ mơ hôn mê."
            },
            # BỎNG DIỆN RỘNG
            {
                "id": "EMERGENCY_SEVERE_BURNS",
                "category": "trauma",
                "name": "Bỏng diện rộng / Bỏng đường thở",
                "red_flag": "Bỏng nước sôi/lửa diện rộng, lột da, bỏng đường hô hấp",
                "pattern": r"(bong\s+(nuoc\s+soi|lua|dien|axit|hoa\s+chat).*(dien\s+rong|lot\s+(het\s+(ca\s+)?)?da|khap\s+nguoi|phong\s+da)|bong\s+duong\s+tho)",
                "emergency_message": "CẤP CỨU BỎNG DIỆN RỘNG: Ngâm rửa vùng bỏng dưới nước sạch mát 15-20 phút, đắp gạc sạch, chuyển viện cấp cứu ngay."
            },
            # ĐIỆN GIẬT
            {
                "id": "EMERGENCY_ELECTROCUTION",
                "category": "trauma",
                "name": "Tai nạn Điện giật",
                "red_flag": "Điện giật té ngã, loạn nhịp tim, ngưng thở",
                "pattern": r"(dien\s+giat.*(loan\s+nhip|tuc\s+nguc|ngat|bat\s+tinh|ngung\s+tim|te\s+nga)|bi\s+dien\s+giat)",
                "emergency_message": "CẤP CỨU ĐIỆN GIẬT: Ngắt nguồn điện an toàn, kiểm tra hô hấp tuần hoàn, gọi 115 cấp cứu lập tức."
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
            # CHẢY MÁU ĐỘNG MẠCH & VẾT THƯƠNG
            {
                "id": "EMERGENCY_ARTERIAL_BLEED",
                "category": "trauma",
                "name": "Chảy máu động mạch / Vết thương mạch máu lớn",
                "red_flag": "Máu phun thành tia, dao cắt cứa mạch máu chảy ồ ạt không cầm",
                "pattern": r"(phun\s+thanh\s+tia|phun\s+mau|chay\s+xoi\s+xa|khong\s+cam\s+duoc|dut\s+dong\s+mach|dut\s+mach\s+mau|ban\s+tung\s+toe|(dao\s+cat|cua|chem).*(mach\s+mau|co\s+tay|dong\s+mach))",
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
            # XUẤT HUYẾT TIÊU HÓA MỌI ĐƯỜNG
            {
                "id": "EMERGENCY_GI_BLEEDING",
                "category": "gastroenterology",
                "name": "Xuất huyết tiêu hóa nặng (Nôn ra máu / Đi ngoài ra máu)",
                "red_flag": "Nôn ra máu, đi ngoài ra máu tươi xối xả hoặc phân đen mùi tanh",
                "pattern": r"(non\s+ra\s+mau|oi\s+ra\s+mau|di\s+(ngoai|cau)\s+ra\s+(toan\s+)?mau|phan\s+den|phan\s+mui\s+tanh|cau\s+ra\s+mau)",
                "emergency_message": "CẢNH BÁO XUẤT HUYẾT TIÊU HÓA: Đến ngay phòng cấp cứu để nội soi can thiệp cầm máu."
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

    def _init_embedding_matcher(self, model_path: str, require_semantic: bool = True):
        try:
            from sentence_transformers import SentenceTransformer

            device = os.getenv("BOTMED_GUARDRAIL_DEVICE", "cpu")
            self.embed_model = SentenceTransformer(model_path, device=device)
            anchor_texts = [a["text"] for a in self.semantic_anchors]
            self.anchor_embeddings = self.embed_model.encode(anchor_texts, normalize_embeddings=True)
        except Exception as exc:
            self.embed_model = None
            self.anchor_embeddings = None
            self.semantic_load_error = repr(exc)
            if require_semantic:
                raise RuntimeError(
                    f"Failed to load required semantic guardrail model '{model_path}': {exc}"
                ) from exc

    def evaluate_semantic_candidate(
        self,
        user_message: str,
        current_symptoms: Optional[List[str]] = None,
    ) -> Optional[Dict]:
        """Return a semantic candidate for confirmation, never a hard alert."""
        if self.semantic_mode == "off" or self.embed_model is None or self.anchor_embeddings is None:
            return None

        symptoms_str = " ".join(current_symptoms) if current_symptoms else ""
        combined_text = f"{symptoms_str} {user_message}".strip()
        try:
            query_vec = self.embed_model.encode([combined_text], normalize_embeddings=True)[0]
            scores = np.dot(self.anchor_embeddings, query_vec)
            best_idx = int(np.argmax(scores))
            best_score = float(scores[best_idx])
        except Exception as exc:
            raise RuntimeError(f"Semantic guardrail inference failed: {exc}") from exc

        if best_score < self.semantic_threshold:
            return None
        matched_anchor = self.semantic_anchors[best_idx]
        return {
            "is_emergency": False,
            "requires_confirmation": True,
            "tier": "semantic_advisory",
            "similarity_score": round(best_score, 4),
            "rule_id": f"SEMANTIC_{matched_anchor['category'].upper()}",
            "rule_category": matched_anchor["category"],
            "rule_name": matched_anchor["name"],
            "red_flag": (
                f"Semantic emergency candidate: {matched_anchor['name']} "
                f"(similarity {best_score:.2f}); requires independent confirmation"
            ),
        }

    def evaluate_emergency(self, user_message: str, current_symptoms: Optional[List[str]] = None) -> Optional[Dict]:
        """
        Đánh giá cấp cứu qua 2 tầng:
        1. Tầng 1: Flexible Regex (0.1ms).
        2. Tầng 2: Semantic Similarity (BGE-M3 đối xứng có dấu + không dấu, ngưỡng 0.46).
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

        # A cosine hit is only an advisory unless an approved calibration has
        # explicitly enabled legacy automatic escalation.
        if self.semantic_mode == "auto":
            candidate = self.evaluate_semantic_candidate(user_message, current_symptoms)
            if candidate:
                return {
                    **candidate,
                    "is_emergency": True,
                    "requires_confirmation": False,
                    "tier": "semantic_auto",
                    "emergency_reply": (
                        f"BÁO ĐỘNG CẤP CỨU Y TẾ ({candidate['rule_name'].upper()}):\n"
                        "HÀNH ĐỘNG NGAY: Gọi cấp cứu 115 hoặc đến Khoa Cấp cứu gần nhất."
                    ),
                }

        return None
