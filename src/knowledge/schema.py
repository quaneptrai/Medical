"""
Disease Schema — Pydantic models for validating disease JSON files.
Ensures every disease file has complete, consistent data before being loaded into the system.
"""

from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import Optional
import json

from pydantic import BaseModel, Field, field_validator


class SymptomFrequency(str, Enum):
    VERY_COMMON = "very_common"      # >80% bệnh nhân
    COMMON = "common"                # 50-80%
    OCCASIONAL = "occasional"        # 20-50%
    RARE = "rare"                    # <20%


class Urgency(str, Enum):
    LOW = "low"                      # Khám thường, không gấp
    MODERATE = "moderate"            # Nên khám trong vài ngày
    MODERATE_TO_HIGH = "moderate_to_high"
    HIGH = "high"                    # Cần khám trong 24h
    EMERGENCY = "emergency"          # Gọi cấp cứu ngay
    UNKNOWN = "unknown"              # Chưa phân loại / Tier 2


class Symptom(BaseModel):
    name_vi: str = Field(..., min_length=1, description="Tên triệu chứng tiếng Việt")
    name_en: str = Field(..., min_length=1, description="Tên triệu chứng tiếng Anh")
    frequency: SymptomFrequency = Field(default=SymptomFrequency.COMMON)


class Provenance(BaseModel):
    source_document: str = Field(..., description="Tên tài liệu / Nguồn dữ liệu")
    issuing_body: str = Field(..., description="Cơ quan ban hành hoặc nguồn thu thập")
    year: int = Field(..., description="Năm ban hành hoặc thu thập")
    evidence_level: Optional[str] = Field(None, description="Mức độ bằng chứng")
    reviewed_by: Optional[str] = Field(None, description="Người thẩm định nếu có")
    review_date: Optional[str] = Field(None, description="Ngày thẩm định")


class DiseaseSchema(BaseModel):
    disease_id: str = Field(..., pattern=r"^[A-Z]{2,5}_\d{3}$", description="ID dạng RESP_001, EXP_002...")
    name_vi: str = Field(..., min_length=2)
    name_en: str = Field(..., min_length=2)
    category: str = Field(..., description="Chuyên khoa y tế")
    aliases: list[str] = Field(default_factory=list, description="Các tên gọi khác")
    tier: int = Field(default=1, description="1: Core duyệt tay, 2: Scaled từ dataset thực nghiệm")

    description: Optional[str] = Field(default=None, description="Mô tả bệnh nếu có")

    symptoms: dict[str, list[Symptom]] = Field(
        default_factory=dict,
        description="Triệu chứng chia theo nhóm: common, occasional, rare"
    )

    red_flags: list[str] = Field(default_factory=list, description="Dấu hiệu nguy hiểm cần cấp cứu")
    risk_factors: list[str] = Field(default_factory=list, description="Yếu tố nguy cơ")
    questions_to_ask: list[str] = Field(default_factory=list, description="Câu hỏi khai thác triệu chứng")
    differential_diagnoses: list[str] = Field(default_factory=list, description="Các bệnh dễ nhầm lẫn")

    urgency: Urgency = Field(default=Urgency.UNKNOWN)
    when_to_seek_emergency: list[str] = Field(default_factory=list, description="Khi nào cần đi cấp cứu")

    user_language_variants: list[str] = Field(
        default_factory=list,
        description="Các cách người dùng VN thực tế mô tả triệu chứng"
    )

    provenance: Optional[Provenance] = Field(
        default=None,
        description="Truy vết nguồn gốc tài liệu y khoa"
    )

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        valid = {
            "respiratory", "digestive", "general", "dermatology", "cardiology",
            "neurology", "urology", "oncology", "musculoskeletal", "ophthalmology",
            "ent", "obstetrics_gynecology", "andrology", "infectious", "endocrinology",
            "hematology", "pediatrics", "toxicology"
        }
        if v not in valid:
            raise ValueError(f"category must be one of {valid}, got '{v}'")
        return v

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms_not_empty(cls, v: dict) -> dict:
        total = sum(len(syms) for syms in v.values())
        if total < 2:
            raise ValueError("Disease must have at least 2 symptoms total")
        return v


def load_disease(path: Path) -> DiseaseSchema:
    """Load and validate a single disease JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return DiseaseSchema(**data)


def load_all_diseases(diseases_dir: Path) -> list[DiseaseSchema]:
    """Load and validate all disease JSON files from a directory tree."""
    diseases: list[DiseaseSchema] = []
    seen_names = set()
    errors: list[str] = []

    for json_file in sorted(diseases_dir.rglob("*.json")):
        try:
            disease = load_disease(json_file)
            name_lower = disease.name_vi.lower().strip()
            if name_lower not in seen_names:
                diseases.append(disease)
                seen_names.add(name_lower)
        except Exception as e:
            errors.append(f"❌ {json_file.name}: {e}")

    # Cập nhật: Kiểm tra trùng lặp bệnh ngoài khối try-except
    id_counts = {}
    for d in diseases:
        id_counts[d.disease_id] = id_counts.get(d.disease_id, 0) + 1
        
    duplicates = [d_id for d_id, count in id_counts.items() if count > 1]
    if duplicates:
        raise ValueError(f"Duplicate disease_id(s) found: {', '.join(duplicates)}")

    if errors:
        print(f"\n[!] {len(errors)} file(s) failed validation:")
        for err in errors:
            print(f"  {err}")

    print(f"\n[OK] Loaded {len(diseases)} / {len(diseases) + len(errors)} disease(s) successfully.")
    return diseases


if __name__ == "__main__":
    import sys

    diseases_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/diseases")
    load_all_diseases(diseases_dir)
