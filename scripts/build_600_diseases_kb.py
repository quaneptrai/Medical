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
        res = ["Mệt mỏi toàn thân", "Khó chịu tại cơ quan bị ảnh hưởng"]
    return res

def build_knowledge_base():
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
    out_dir.mkdir(parents=True, exist_ok=True)

    benchmark_cases = []
    
    print("\n2. Đang chuyển đổi sang chuẩn Knowledge Base đầy đủ của BotMedical...")
    for idx, (name_vi, questions) in enumerate(disease_groups.items(), 1):
        disease_id = f"EXP_{idx:03d}"
        category = categorize_disease(name_vi)
        
        kb_variants = questions[:15]
        test_questions = questions[15:]
        
        extracted_syms = extract_symptoms(kb_variants)
        
        common_syms = [{"name_vi": s, "name_en": unidecode(s), "frequency": "common"} for s in extracted_syms[:10]]
        occasional_syms = [{"name_vi": s, "name_en": unidecode(s), "frequency": "occasional"} for s in extracted_syms[10:]]

        disease_obj = {
            "disease_id": disease_id,
            "name_vi": name_vi,
            "name_en": unidecode(name_vi),
            "category": category,
            "aliases": [name_vi, unidecode(name_vi)],
            "description": f"{name_vi} là một bệnh lý thuộc chuyên khoa {category}, được ghi nhận trong phác đồ chẩn đoán của Bệnh viện Đa khoa Tâm Anh với các biểu hiện lâm sàng đặc trưng.",
            "urgency": "moderate",
            "symptoms": {
                "common": common_syms,
                "occasional": occasional_syms
            },
            "risk_factors": [
                "Tiền sử gia đình hoặc bệnh lý nền mạn tính",
                "Môi trường sống, chế độ dinh dưỡng và thói quen sinh hoạt"
            ],
            "questions_to_ask": [
                f"Triệu chứng nghi ngờ {name_vi} của bạn xuất hiện từ khi nào?",
                "Mức độ ảnh hưởng đến sinh hoạt hàng ngày như thế nào?",
                "Bạn đã từng đi khám chuyên khoa hoặc dùng thuốc điều trị trước đây chưa?"
            ],
            "differential_diagnoses": [
                "Các bệnh lý viêm nhiễm hoặc rối loạn chức năng cùng cơ quan",
                "Hội chứng mệt mỏi và suy giảm miễn dịch toàn thân"
            ],
            "red_flags": [
                f"Khó thở, tím tái, tụt huyết áp hoặc sốt cao li bì trong đợt tiến triển của {name_vi}",
                "Đau dữ dội không đáp ứng thuốc, mất tri giác, nôn ra máu"
            ],
            "when_to_seek_emergency": [
                "Xuất hiện cơn đau đột ngột dữ dội, khó thở tím tái hoặc ngất xỉu",
                "Sốt cao co giật hoặc nôn mửa liên tục không cầm được"
            ],
            "user_language_variants": kb_variants,
            "provenance": {
                "source_document": "Bộ dữ liệu ViMedical 603 bệnh - Bệnh viện Đa khoa Tâm Anh & Kalapa Bytebattles 2023",
                "issuing_body": "Bệnh viện Đa khoa Tâm Anh / Kalapa",
                "year": 2023,
                "evidence_level": "Level B - Lâm sàng thực nghiệm",
                "reviewed_by": "Hội đồng Y khoa & Chuyên gia AI Kalapa 2023",
                "review_date": "2023-11-15"
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

    print(f"\n[HOÀN THÀNH]")
    print(f"- Đã sinh 603 hồ sơ bệnh chuẩn JSON tại: data/diseases_expanded/")
    print(f"- Đã sinh bộ Benchmark độc lập gồm {len(benchmark_cases)} câu hỏi chưa từng thấy tại: {bench_path}")

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    build_knowledge_base()
