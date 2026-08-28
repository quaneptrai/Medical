import sys
import json
import requests
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import time
import random

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

def auto_label_with_ollama():
    diseases = load_all_diseases(ROOT / "data/diseases")
    
    disease_names = [d.name_vi.lower().strip() for d in diseases]
    emergency_names = [d.name_vi for d in diseases if d.urgency.value in ["high", "emergency"]]
    
    context_list = []
    for d in diseases:
        symptoms = [s.name_vi for sym_list in d.symptoms.values() for s in sym_list]
        context_list.append(f"- Bệnh: {d.name_vi}\n  Triệu chứng: {', '.join(symptoms)}")
        
    context_1 = "\n".join(context_list)
    context_2 = "\n".join(reversed(context_list))

    df = pd.read_csv(ROOT / "data/test_cases/real_benchmark_candidates.csv")
    results = []
    
    print("\nBắt đầu gán nhãn Consensus (Hỏi 2 lần) bằng Qwen2.5:14b...")
    for index, row in tqdm(df.iterrows(), total=len(df)):
        query = row["query"]
        
        def ask_qwen(context):
            prompt = f"""Bạn là Bác sĩ Chuyên khoa. Phân loại câu hỏi của bệnh nhân vào ĐÚNG 1 TRONG 30 BỆNH dưới đây.
Nếu câu hỏi hỏi thuốc, không khớp, hoặc vô lý, trả lời: KHONG_THUOC.

DANH SÁCH 30 BỆNH:
{context}

CÂU HỎI BỆNH NHÂN: "{query}"

Vui lòng trả lời bằng định dạng JSON với key duy nhất là "disease".
Ví dụ: {{"disease": "Tên Bệnh Chính Xác"}} hoặc {{"disease": "KHONG_THUOC"}}"""
            return call_ollama(prompt)
                
        ans1 = ask_qwen(context_1).strip()
        ans2 = ask_qwen(context_2).strip()
        
        # Chỉ lấy khi 2 lần trả lời giống hệt nhau (Consensus)
        if ans1 == "API_ERROR" or ans2 == "API_ERROR":
            continue
            
        if ans1.lower() == ans2.lower() and ans1.lower() != "khong_thuoc":
            # Strict match với KB
            if ans1.lower() in disease_names:
                # Find original cased name
                matched_name = next(d.name_vi for d in diseases if d.name_vi.lower() == ans1.lower())
                results.append({"patient_query": query, "label": matched_name})

    print("\nTrích xuất Spot-Check (Mẫu rà soát thủ công)...")
    
    emergencies = [r for r in results if r["label"] in emergency_names]
    non_emergencies = [r for r in results if r["label"] not in emergency_names]
    
    sample_size = max(0, 40 - len(emergencies))
    random_samples = random.sample(non_emergencies, min(sample_size, len(non_emergencies)))
    
    spot_check = emergencies + random_samples
    
    out_file = ROOT / "data/test_cases/llm_annotated_benchmark.json"
    spot_check_file = ROOT / "data/test_cases/spot_check_sample.json"
    
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=4)
        
    with open(spot_check_file, "w", encoding="utf-8") as f:
        json.dump(spot_check, f, ensure_ascii=False, indent=4)
        
    print(f"\n[THÀNH CÔNG] Thu được {len(results)} ca có độ đồng thuận tuyệt đối (Consensus).")
    print(f"Đã lưu Benchmark: {out_file}")
    print(f"Đã lưu Mẫu rà soát (Spot-check) {len(spot_check)} ca (Gồm TẤT CẢ ca cấp cứu): {spot_check_file}")

if __name__ == "__main__":
    auto_label_with_ollama()
