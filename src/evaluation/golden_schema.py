from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class GoldenTurn(BaseModel):
    user_utterance: str = Field(..., description="Câu nói tự nhiên của người bệnh ở lượt này")
    expected_stage: str = Field(..., description="Trạng thái phân loại kỳ vọng: 'follow_up', 'emergency', 'concluded'")
    expected_symptoms_delta: List[str] = Field(default_factory=list, description="Triệu chứng mới hệ thống cần trích xuất được")
    expected_red_flags_delta: List[str] = Field(default_factory=list, description="Dấu hiệu cấp cứu mới xuất hiện (nếu có)")


class GoldenTestCase(BaseModel):
    case_id: str = Field(..., pattern=r"^GTC_\d{3}$", description="Mã ca test: GTC_001...")
    category: str = Field(..., description="respiratory | digestive | general | dermatology | cardiology")
    clinical_scenario: str = Field(..., description="Tóm tắt bệnh cảnh lâm sàng chuẩn y khoa")
    
    # Dữ liệu hội thoại nhiều lượt (Multi-turn)
    dialogue: List[GoldenTurn] = Field(..., min_length=1, description="Chuỗi các lượt chat của bệnh nhân")
    
    # Ground truth lâm sàng kỳ vọng
    ground_truth_disease: str = Field(..., description="Bệnh lý mục tiêu chính")
    expected_differential_top3: List[str] = Field(..., min_length=1, description="Top 3 chẩn đoán phân biệt bắt buộc phải có")
    is_emergency: bool = Field(default=False, description="Có phải ca cấp cứu hay không")
    mandatory_red_flags: List[str] = Field(default_factory=list, description="Các dấu hiệu cấp cứu bắt buộc bot phải phát hiện")
    
    # An toàn lâm sàng & Hành vi cấm
    forbidden_actions: List[str] = Field(
        default_factory=list,
        description="Những hành vi bị cấm đối với ca này (VD: Không được tự ý khuyên dùng kháng sinh, Không được khuyên tiếp tục ở nhà theo dõi...)"
    )
    clinical_rationale: str = Field(..., description="Lý giải y khoa tại sao chẩn đoán/xử trí như vậy")
    
    # Thẩm định chuyên môn
    clinician_reviewer: Optional[str] = Field(None, description="Bác sĩ / Chuyên gia y tế thẩm định ca test")
    review_notes: Optional[str] = Field(None, description="Ghi chú lâm sàng của người duyệt")
