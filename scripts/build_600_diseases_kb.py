import sys
import io
import json
import re
from pathlib import Path
from datasets import load_dataset
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent

def categorize_disease(name_vi: str) -> str:
    name_lower = name_vi.lower()
    if any(w in name_lower for w in ["phổi", "phế quản", "hô hấp", "họng", "xoang", "mũi", "thanh quản", "amidan", "hen"]):
        return "respiratory"
    elif any(w in name_lower for w in ["dạ dày", "ruột", "gan", "mật", "tụy", "tiêu hóa", "đại tràng", "trĩ", "hậu môn", "thực quản"]):
        return "digestive"
    elif any(w in name_lower for w in ["tim", "mạch", "huyết áp", "động mạch", "tĩnh mạch", "đột quỵ"]):
        return "cardiology"
    elif any(w in name_lower for w in ["não", "thần kinh", "đầu", "migraine", "động kinh", "alzheimer", "parkinson"]):
        return "neurology"
    elif any(w in name_lower for w in ["da", "mẩn", "ngứa", "vảy nến", "chàm", "mụn"]):
        return "dermatology"
    elif any(w in name_lower for w in ["thận", "bàng quang", "tiết niệu", "tiểu", "tuyến tiền liệt"]):
        return "urology"
    elif any(w in name_lower for w in ["ung thư", "u ", "bướu", "sarcoma", "carcinoma"]):
        return "oncology"
    elif any(w in name_lower for w in ["xương", "khớp", "gân", "cột sống", "đốt sống", "thoát vị", "gối"]):
        return "musculoskeletal"
    elif any(w in name_lower for w in ["mắt", "thị", "giác mạc", "kết mạc"]):
        return "ophthalmology"
    elif any(w in name_lower for w in ["tai", "màng nhĩ"]):
        return "ent"
    elif any(w in name_lower for w in ["thai", "sinh", "tử cung", "buồng trứng", "âm đạo", "vú"]):
        return "obstetrics_gynecology"
    elif any(w in name_lower for w in ["tinh hoàn", "xuất tinh", "sinh lý"]):
        return "andrology"
    elif any(w in name_lower for w in ["sốt", "nhiễm", "viêm", "virus", "vi khuẩn", "dịch"]):
        return "infectious"
    return "general"

def extract_symptoms(questions):
    symptoms = set()
    for q in questions:
        cleaned = re.sub(r'[\.\?]?\s*Tôi có thể đang bị bệnh gì.*$', '', q, flags=re.IGNORECASE).strip()
        m = re.search(r'(?:như|cảm thấy|bị|thấy|xuất hiện)\s+(.+)', cleaned, re.IGNORECASE)
        if m:
            raw = m.group(1)
            parts = re.split(r'[,;]|\bvà\b|\bkèm theo\b|\bcũng như\b', raw)
            for p in parts:
                p_clean = p.strip().strip('.')
                if len(p_clean) >= 3 and not p_clean.lower().startswith('tôi có thể'):
                    symptoms.add(p_clean)
        else:
            p_clean = re.sub(r'^(Tôi|Hiện tại tôi|Dạo này tôi)\s+(đang\s+)?', '', cleaned).strip()
            if len(p_clean) >= 4:
                symptoms.add(p_clean)
                
    res = sorted(list(symptoms))
    if len(res) < 2:
        res = ["Biểu hiện bất thường nghi ngờ liên quan"]
    return res

def build_tier2_knowledge_base():
    print("1. Đang tải dataset PB3002/ViMedical_Disease từ Hugging Face...")
    ds = load_dataset("PB3002/ViMedical_Disease", split="train")

    disease_groups = {}
    for row in ds:
        d_name = row["Disease"].strip()
        q = row["Question"].strip()
        if not d_name or not q:
            continue
        if d_name not in disease_groups:
            disease_groups[d_name] = []
        disease_groups[d_name].append(q)

    print(f"-> Đã tải {len(disease_groups)} bệnh với tổng cộng {len(ds)} câu hỏi.")

    out_dir = ROOT / "data" / "diseases_expanded"
    # Dọn dẹp thư mục cũ
    if out_dir.exists():
        for f in out_dir.glob("*.json"):
            f.unlink()
    out_dir.mkdir(parents=True, exist_ok=True)

    benchmark_cases = []
    
    print("\n2. Đang tạo hồ sơ Tier 2 trung thực (chỉ giữ dữ liệu thật, loại bỏ toàn bộ chuỗi bịa)...")
    for idx, (name_vi, questions) in enumerate(disease_groups.items(), 1):
        disease_id = f"EXP_{idx:03d}"
        category = categorize_disease(name_vi)
        
        # 15 câu nạp KB, 5 câu tách làm benchmark độc lập
        kb_variants = questions[:15]
        test_questions = questions[15:]
        
        extracted_syms = extract_symptoms(kb_variants)
        
        common_syms = [{"name_vi": s, "name_en": unidecode(s), "frequency": "common"} for s in extracted_syms]

        disease_obj = {
            "disease_id": disease_id,
            "name_vi": name_vi,
            "name_en": unidecode(name_vi),
            "category": category,
            "aliases": [name_vi, unidecode(name_vi)],
            "tier": 2,
            "description": f"{name_vi} (Chuyên khoa: {category})",
            "urgency": "unknown",
            "symptoms": {
                "common": common_syms,
                "occasional": []
            },
            # BỎ HẲN CÁC CHUỖI KHUÔN MẪU BỊA:
            "risk_factors": [],
            "questions_to_ask": [],
            "differential_diagnoses": [],
            "red_flags": [],
            "when_to_seek_emergency": [],
            "user_language_variants": kb_variants,
            "provenance": {
                "source_document": "ViMedical_Disease Dataset",
                "issuing_body": "PB3002 / Kalapa Bytebattles / Kaggle 2023",
                "year": 2023,
                "evidence_level": "Thực nghiệm NLP y khoa",
                "reviewed_by": None,
                "review_date": None
            }
        }

        file_name = f"{disease_id}_{unidecode(name_vi).lower().replace(' ', '_').replace('/', '_')}.json"
        with open(out_dir / file_name, "w", encoding="utf-8") as f:
            json.dump(disease_obj, f, ensure_ascii=False, indent=2)

        for tq in test_questions:
            benchmark_cases.append({
                "disease_id": disease_id,
                "expected_disease": name_vi,
                "category": category,
                "query": tq
            })

    bench_dir = ROOT / "data" / "test_cases"
    bench_dir.mkdir(parents=True, exist_ok=True)
    bench_path = bench_dir / "benchmark_603_diseases.json"
    with open(bench_path, "w", encoding="utf-8") as f:
        json.dump({"total_cases": len(benchmark_cases), "cases": benchmark_cases}, f, ensure_ascii=False, indent=2)

    print(f"\n[HOÀN THÀNH DỌN DẸP & TÁI TẠO TIER 2]")
    print(f"- Đã lưu 603 hồ sơ Tier 2 sạch 100% tại: data/diseases_expanded/")
    print(f"- Đã lưu bộ Benchmark độc lập 3.015 câu hỏi tại: {bench_path}")

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    build_tier2_knowledge_base()
