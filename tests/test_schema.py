import pytest
import json
from pathlib import Path
from src.knowledge.schema import load_all_diseases

def test_load_all_diseases_duplicate_id(tmp_path):
    """Test that loading diseases raises ValueError if disease_id is duplicated."""
    # Create two dummy disease JSON files with the SAME disease_id but different names
    d1 = {
        "disease_id": "TEST_001",
        "name_vi": "Bệnh test 1",
        "name_en": "Test 1",
        "category": "general",
        "aliases": ["t1"],
        "description": "A"*50,
        "symptoms": {"common": [{"name_vi": "Sốt", "name_en": "Fever", "frequency": "common"}, {"name_vi": "Ho", "name_en": "Cough", "frequency": "common"}]},
        "red_flags": ["Khó thở"],
        "risk_factors": ["Hút thuốc"],
        "questions_to_ask": ["Bạn sốt bao lâu rồi?", "Ho có đờm không?", "Có khó thở không?"],
        "differential_diagnoses": ["Bệnh khác"],
        "urgency": "low",
        "when_to_seek_emergency": ["Khó thở dữ dội"],
        "user_language_variants": ["sốt đùng đùng", "cảm sốt", "nóng trong người"]
    }
    
    d2 = d1.copy()
    d2["name_vi"] = "Bệnh test 2" # Different name so it bypasses seen_names
    
    file1 = tmp_path / "d1.json"
    file2 = tmp_path / "d2.json"
    
    file1.write_text(json.dumps(d1), encoding="utf-8")
    file2.write_text(json.dumps(d2), encoding="utf-8")
    
    with pytest.raises(ValueError, match="Duplicate disease_id"):
        load_all_diseases(tmp_path)
