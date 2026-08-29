import sys
import json
import requests
from pathlib import Path
from tqdm import tqdm
import time

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from knowledge.schema import load_all_diseases

def call_ollama(prompt, retries=3):
    payload = {
        "model": "qwen2.5:32b",
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "top_p": 0.9}
    }
    for _ in range(retries):
        try:
            res = requests.post("http://127.0.0.1:11434/api/generate", json=payload, timeout=30)
            res.raise_for_status()
            data = json.loads(res.json()["response"])
            return data.get("disease", "LỖI_FORMAT")
        except Exception:
            time.sleep(2)
    return "API_ERROR"

def calibrate_qwen_judge():
    diseases = load_all_diseases(ROOT / "data/diseases")
    
    disease_context = ""
    for d in diseases:
        symptoms = [s.name_vi for sym_list in d.symptoms.values() for s in sym_list]
        disease_context += f"- Bệnh: {d.name_vi}\n  Triệu chứng: {', '.join(symptoms)}\n"
        
    test_cases = []
    
    # 1. Source: user_language_variants
    for d in diseases:
        for variant in d.user_language_variants:
            test_cases.append({"query": variant, "true_label": d.name_vi, "source": "variants"})
            
    # 2. Source: generated_benchmark.json
    gen_bench_path = ROOT / "data/test_cases/generated_benchmark.json"
    if gen_bench_path.exists():
        with open(gen_bench_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            gen_cases = raw.get("cases", []) if isinstance(raw, dict) else raw
            for case in gen_cases:
                test_cases.append({"query": case["query"], "true_label": case["expected_top"], "source": "generated"})
    
    # 3. Source: Negative samples
    try:
        from datasets import load_dataset
        from rank_bm25 import BM25Okapi
        import re
        def tokenize_vi(text):
            return re.sub(r'[^\w\s]', ' ', text.lower()).split()
            
        dataset = load_dataset("hungnm/vietnamese-medical-qa", split="train")
        queries = [row["question"].strip() for row in dataset if row.get("question")]
        disease_docs = []
        for d in diseases:
            syms = [s.name_vi for sym_list in d.symptoms.values() for s in sym_list]
            doc = " ".join([d.name_vi, " ".join(d.aliases), " ".join(d.user_language_variants), " ".join(syms)])
            disease_docs.append(tokenize_vi(doc))
            
        bm25 = BM25Okapi(disease_docs)
        scored = []
        for q in queries:
            tk_q = tokenize_vi(q)
            if len(tk_q) < 5: continue
            scored.append((q, bm25.get_scores(tk_q).max()))
            
        scored.sort(key=lambda x: x[1])
        for q, _ in scored[:100]:
            test_cases.append({"query": q, "true_label": "KHONG_THUOC", "source": "negative"})
    except Exception as e:
        print(f"Warning: Failed to load negative samples from HuggingFace - {e}")
        
    print(f"\nBắt đầu sát hạch với {len(test_cases)} câu hỏi...")
    
    stats = {"variants": {"total": 0, "correct": 0}, "generated": {"total": 0, "correct": 0}, "negative": {"total": 0, "correct": 0}}
    api_errors = 0
    false_positives = []
    
    for case in tqdm(test_cases):
        prompt = f"""Bạn là Bác sĩ Chuyên khoa. Nhiệm vụ của bạn là phân loại câu hỏi của bệnh nhân vào ĐÚNG 1 TRONG 30 BỆNH dưới đây.
Nếu câu hỏi hỏi về thuốc, tác dụng phụ, hoặc không khớp bệnh nào dưới đây, HÃY TRẢ LỜI LÀ: KHONG_THUOC.

DANH SÁCH 30 BỆNH:
{disease_context}

CÂU HỎI BỆNH NHÂN: "{case['query']}"

Vui lòng trả lời bằng định dạng JSON với key duy nhất là "disease".
Ví dụ: {{"disease": "Tên Bệnh Chính Xác"}} hoặc {{"disease": "KHONG_THUOC"}}"""

        ans = call_ollama(prompt)
        
        if ans == "API_ERROR":
            api_errors += 1
            continue
            
        src = case["source"]
        stats[src]["total"] += 1
        
        ans_lower = ans.lower().strip()
        true_lower = case["true_label"].lower().strip()
        
        if ans_lower == true_lower:
            stats[src]["correct"] += 1
        else:
            if src == "negative" and ans_lower != "khong_thuoc":
                false_positives.append(f"Q: {case['query'][:80]}... -> Qwen đoán: {ans}")
                
    print("\n================ [KẾT QUẢ SÁT HẠCH] ================")
    print(f"API Errors bị loại khỏi mẫu số: {api_errors}")
    
    for src, st in stats.items():
        if st["total"] > 0:
            acc = st["correct"] / st["total"]
            print(f"- Accuracy trên tập {src.upper()}: {acc:.2%} ({st['correct']}/{st['total']})")
            
    if stats["negative"]["total"] > 0:
        fpr = 1.0 - (stats["negative"]["correct"] / stats["negative"]["total"])
        print(f"\n[CẢNH BÁO FALSE POSITIVE RATE]")
        print(f"Tỉ lệ gán nhầm rác thành bệnh: {fpr:.2%}")
        if fpr > 0.2:
            print("🚨 NGUY HIỂM: Tỉ lệ báo nhầm > 20%! Model quá ảo tưởng, KHÔNG ĐƯỢC DÙNG!")
            print("Các ca báo nhầm tiêu biểu:")
            for e in false_positives[:10]: print("  -", e)

if __name__ == "__main__":
    calibrate_qwen_judge()
