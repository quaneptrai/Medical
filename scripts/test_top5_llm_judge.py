import sys
import io
import json
import requests
from pathlib import Path
from tqdm import tqdm
import time

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
from knowledge.schema import load_all_diseases
from retrieval.search_engine import tokenize_vietnamese
from rank_bm25 import BM25Okapi

def call_ollama(prompt, model="qwen2.5:32b", retries=3):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "top_p": 0.9}
    }
    for _ in range(retries):
        try:
            res = requests.post("http://127.0.0.1:11434/api/generate", json=payload, timeout=45)
            res.raise_for_status()
            data = json.loads(res.json()["response"])
            return data.get("disease", "LỖI_FORMAT")
        except Exception:
            time.sleep(2)
    return "API_ERROR"

def run_top5_judge_calibration():
    diseases = load_all_diseases(ROOT / "data/diseases")
    disease_map = {d.name_vi: d for d in diseases}
    
    # 1. Chuẩn bị BM25 Retriever để lọc Top 5 ứng viên
    corpus_tokens = []
    disease_names = list(disease_map.keys())
    for name in disease_names:
        d = disease_map[name]
        symptoms = [s.name_vi for sym_list in d.symptoms.values() for s in sym_list]
        doc_text = " ".join([d.name_vi, " ".join(d.aliases), " ".join(d.user_language_variants), " ".join(symptoms)])
        corpus_tokens.append(tokenize_vietnamese(doc_text))
        
    bm25 = BM25Okapi(corpus_tokens)

    def get_top5_candidates(query: str):
        q_tokens = tokenize_vietnamese(query)
        scores = bm25.get_scores(q_tokens)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:5]
        return [disease_names[i] for i in top_indices]

    # 2. Chuẩn bị tập test
    test_cases = []
    
    # Variants (293 ca)
    for d in diseases:
        for v in d.user_language_variants:
            test_cases.append({"query": v, "true_label": d.name_vi, "source": "variants"})
            
    # Generated (lấy 150 ca mẫu để test nhanh)
    gen_bench_path = ROOT / "data/test_cases/generated_benchmark.json"
    if gen_bench_path.exists():
        with open(gen_bench_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            gen_cases = raw.get("cases", []) if isinstance(raw, dict) else raw
            for c in gen_cases[:150]:
                test_cases.append({"query": c["query"], "true_label": c["expected_top"], "source": "generated"})
                
    # Negatives (50 ca mẫu)
    try:
        from datasets import load_dataset
        dataset = load_dataset("hungnm/vietnamese-medical-qa", split="train")
        neg_queries = [row["question"].strip() for row in dataset if row.get("question")]
        scored_neg = []
        for q in neg_queries[:500]:
            tk = tokenize_vietnamese(q)
            if len(tk) < 5: continue
            scored_neg.append((q, bm25.get_scores(tk).max()))
        scored_neg.sort(key=lambda x: x[1])
        for q, _ in scored_neg[:50]:
            test_cases.append({"query": q, "true_label": "KHONG_THUOC", "source": "negative"})
    except Exception as e:
        print(f"Warning load negative: {e}")

    print(f"=== BẮT ĐẦU SÁT HẠCH GIÁM KHẢO RAG TOP-5 ({len(test_cases)} CÂU) ===")
    
    stats = {
        "variants": {"total": 0, "correct": 0, "false_khong_thuoc": 0, "wrong_disease": 0},
        "generated": {"total": 0, "correct": 0, "false_khong_thuoc": 0, "wrong_disease": 0},
        "negative": {"total": 0, "correct": 0, "false_positive": 0}
    }
    
    top5_miss_count = 0
    confusion_pairs = []

    for case in tqdm(test_cases):
        query = case["query"]
        true_label = case["true_label"]
        src = case["source"]
        
        top5 = get_top5_candidates(query)
        
        # Kiểm tra xem đáp án đúng có lọt vào Top 5 của BM25 không
        if src != "negative" and true_label not in top5:
            top5_miss_count += 1
            
        # Xây dựng prompt ngắn gọn chỉ gồm 5 ứng viên
        candidates_text = ""
        for idx, name in enumerate(top5, 1):
            d = disease_map[name]
            syms = [s.name_vi for sym_list in d.symptoms.values() for s in sym_list]
            candidates_text += f"{idx}. {name} (Triệu chứng gợi ý: {', '.join(syms[:8])})\n"

        prompt = f"""Bạn là Bác sĩ Trưởng khoa. Hãy đối chiếu câu hỏi của bệnh nhân với 5 bệnh ứng viên dưới đây.

CÂU HỎI BỆNH NHÂN: "{query}"

5 BỆNH ỨNG VIÊN:
{candidates_text}

QUY TẮC PHÂN LOẠI:
1. Nếu câu hỏi khớp rõ với 1 trong 5 bệnh trên, hãy trả lời đúng tên bệnh đó.
2. Nếu câu hỏi hỏi về thuốc, ngoài luồng, hoặc không khớp bệnh nào trong 5 bệnh trên, hãy trả lời: KHONG_THUOC.

ĐỊNH DẠNG JSON BẮT BUỘC:
{{"disease": "Tên Bệnh Chính Xác"}} hoặc {{"disease": "KHONG_THUOC"}}"""

        ans = call_ollama(prompt, model="qwen2.5:32b")
        if ans == "API_ERROR":
            continue
            
        stats[src]["total"] += 1
        ans_clean = ans.strip().lower()
        true_clean = true_label.strip().lower()
        
        if ans_clean == true_clean:
            stats[src]["correct"] += 1
        else:
            if src == "negative":
                stats[src]["false_positive"] += 1
            else:
                if ans_clean == "khong_thuoc":
                    stats[src]["false_khong_thuoc"] += 1
                else:
                    stats[src]["wrong_disease"] += 1
                    confusion_pairs.append(f"Đúng: {true_label} -> Đoán nhầm: {ans}")

    print("\n================ [KẾT QUẢ SÁT HẠCH RAG TOP-5] ================")
    if stats["variants"]["total"] > 0:
        v = stats["variants"]
        acc_v = v["correct"] / v["total"]
        print(f"1. Tập VARIANTS:")
        print(f"   - Accuracy: {acc_v:.2%} ({v['correct']}/{v['total']})")
        print(f"   - Từ chối nhầm (trả KHONG_THUOC): {v['false_khong_thuoc']} ca ({v['false_khong_thuoc']/v['total']:.1%})")
        print(f"   - Đoán nhầm sang bệnh khác: {v['wrong_disease']} ca ({v['wrong_disease']/v['total']:.1%})")

    if stats["generated"]["total"] > 0:
        g = stats["generated"]
        acc_g = g["correct"] / g["total"]
        print(f"\n2. Tập GENERATED:")
        print(f"   - Accuracy: {acc_g:.2%} ({g['correct']}/{g['total']})")
        print(f"   - Từ chối nhầm (KHONG_THUOC): {g['false_khong_thuoc']}")
        print(f"   - Đoán nhầm sang bệnh khác: {g['wrong_disease']}")

    if stats["negative"]["total"] > 0:
        n = stats["negative"]
        acc_n = n["correct"] / n["total"]
        fpr = n["false_positive"] / n["total"]
        print(f"\n3. Tập NEGATIVE (Khả năng từ chối):")
        print(f"   - Accuracy từ chối: {acc_n:.2%} ({n['correct']}/{n['total']})")
        print(f"   - Tỉ lệ báo nhầm (FPR): {fpr:.2%}")

    print(f"\nTop 5 BM25 bỏ sót nhãn đúng ở vòng gửi xe: {top5_miss_count} ca")
    if confusion_pairs:
        print("\nCác ca nhầm lẫn tiêu biểu:")
        for cp in confusion_pairs[:8]:
            print(f"   * {cp}")

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    run_top5_judge_calibration()
