from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SymptomExtracted(BaseModel):
    name: str = Field(..., description="Tên triệu chứng đã được chuẩn hóa (ví dụ: đau đầu, ho, sốt)")
    duration: Optional[str] = Field(None, description="Thời gian kéo dài (nếu có), ví dụ: 3 ngày, 1 tuần")
    severity: Optional[str] = Field(None, description="Mức độ nghiêm trọng (nhẹ, vừa, dữ dội)")
    modifiers: List[str] = Field(default_factory=list, description="Các đặc tính khác (ví dụ: đau nhói, đau âm ỉ, ho có đờm xanh)")

class ConversationState(BaseModel):
    session_id: str
    
    # Những triệu chứng AI / hệ thống đã ghi nhận được
    symptoms: List[SymptomExtracted] = Field(default_factory=list)
    
    # Danh sách các câu hệ thống đã hỏi (để tránh hỏi lặp lại)
    asked_questions: List[str] = Field(default_factory=list)
    
    # Những câu trả lời trực tiếp cho dạng yes/no
    answers: Dict[str, bool] = Field(default_factory=dict)
    
    # Red flags (dấu hiệu nguy hiểm) user đã đề cập
    red_flags_detected: List[str] = Field(default_factory=list)
    
    # Các bệnh hệ thống đang cân nhắc ở turn hiện tại
    candidate_diseases: List[str] = Field(default_factory=list)
    
    # Trạng thái hiện tại của phiên khám
    # Các mức: 'symptom_collection', 'follow_up', 'emergency', 'concluded'
    diagnostic_stage: str = "symptom_collection"
    
    # Số turn đã diễn ra
    turn_count: int = 0
    
    def get_symptoms_summary(self) -> str:
        if not self.symptoms:
            return "Chưa có"
            
        summary = []
        for s in self.symptoms:
            parts = [s.name]
            if s.modifiers:
                parts.append(f"({', '.join(s.modifiers)})")
            if s.severity:
                parts.append(f"- mức độ {s.severity}")
            if s.duration:
                parts.append(f"- trong {s.duration}")
            summary.append(" ".join(parts))
            
        return "; ".join(summary)
