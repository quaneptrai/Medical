import sys
import io
import time
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import tokenize_vietnamese
from runtime_config import get_setting, resolve_project_path
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

def run_clean_benchmark():
    bm25_weight = float(get_setting("retrieval.bm25_weight"))
    print("1. Nạp 603 hồ sơ bệnh Tier 2 sạch...")
    diseases = load_all_diseases(ROOT / "data/diseases_expanded")
    disease_map = {d.name_vi: d for d in diseases}
    disease_names = list(disease_map.keys())

    print("2. Xây dựng tài liệu biểu diễn (BM25 keyword phong phú + Dense vector cô đọng)...")
    dense_docs = []
    bm25_tokens = []
    
    for name in disease_names:
        d = disease_map[name]
        sym_list = [s.name_vi for s in d.symptoms.get("common", [])]
        
        # Dense document: Cô đọng trọng tâm tên bệnh + triệu chứng cốt lõi (tốc độ mã hóa <5s trên CPU)
        dense_text = f"{d.name_vi}. Triệu chứng: {', '.join(sym_list[:12])}"
        dense_docs.append(dense_text)
        
        # BM25 document: Toàn bộ từ khóa + biến thể khẩu ngữ
        bm25_text = f"{d.name_vi} {' '.join(d.aliases)} {' '.join(sym_list)} {' '.join(d.user_language_variants)}"
        bm25_tokens.append(tokenize_vietnamese(bm25_text))

    bm25 = BM25Okapi(bm25_tokens)

    # 3. Mã hóa Embeddings cho 603 bệnh
    print("3. Đang mã hóa vector embeddings cho 603 bệnh...")
    model = SentenceTransformer(
        str(resolve_project_path(get_setting("retrieval.embedding_model"))),
        device="cpu",
    )
    t_enc = time.time()
    doc_embeddings = model.encode(dense_docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    print(f"-> Đã mã hóa xong 603 vector embedding trong: {time.time() - t_enc:.2f}s!")

    # 4. Chạy kiểm thử trên tập Benchmark độc lập 300 ca
    with open(ROOT / "data/test_cases/benchmark_603_diseases.json", "r", encoding="utf-8") as f:
        bench_data = json.load(f)

    test_cases = bench_data["cases"][:300]
    print(f"\n4. Đang đo lường trên {len(test_cases)} câu hỏi test độc lập (chưa từng thấy lúc index)...")

    bm25_top1, bm25_top3, bm25_top5 = 0, 0, 0
    dense_top1, dense_top3, dense_top5 = 0, 0, 0
    hybrid_top1, hybrid_top3, hybrid_top5 = 0, 0, 0

    t0 = time.time()
    for item in test_cases:
        query = item["query"]
        expected = item["expected_disease"]

        # BM25 scoring
        q_tok = tokenize_vietnamese(query)
        bm25_raw = np.array(bm25.get_scores(q_tok))
        bm25_norm = bm25_raw / (bm25_raw.max() + 1e-6)

        # Dense Vector scoring
        q_vec = model.encode([query], normalize_embeddings=True)[0]
        dense_scores = np.dot(doc_embeddings, q_vec)

        # Fused scoring from the canonical runtime configuration.
        fused_scores = bm25_weight * bm25_norm + (1.0 - bm25_weight) * dense_scores

        # Rank predictions
        top_bm25 = [disease_names[i] for i in np.argsort(bm25_raw)[::-1][:5]]
        top_dense = [disease_names[i] for i in np.argsort(dense_scores)[::-1][:5]]
        top_hybrid = [disease_names[i] for i in np.argsort(fused_scores)[::-1][:5]]

        if expected == top_bm25[0]: bm25_top1 += 1
        if expected in top_bm25[:3]: bm25_top3 += 1
        if expected in top_bm25[:5]: bm25_top5 += 1

        if expected == top_dense[0]: dense_top1 += 1
        if expected in top_dense[:3]: dense_top3 += 1
        if expected in top_dense[:5]: dense_top5 += 1

        if expected == top_hybrid[0]: hybrid_top1 += 1
        if expected in top_hybrid[:3]: hybrid_top3 += 1
        if expected in top_hybrid[:5]: hybrid_top5 += 1

    latency = (time.time() - t0) / len(test_cases) * 1000
    n = len(test_cases)

    print("\n================ [KẾT QUẢ SO SÁNH TRÊN 603 BỆNH TIER 2 SẠCH] ================")
    print(f"{'Mô hình':<22} | {'Top-1 Acc':<12} | {'Top-3 Recall':<14} | {'Top-5 Recall':<14}")
    print("-" * 70)
    print(f"{'BM25 Thuần':<22} | {bm25_top1/n:<12.2%} | {bm25_top3/n:<14.2%} | {bm25_top5/n:<14.2%}")
    print(f"{'BGE-M3 Dense':<22} | {dense_top1/n:<12.2%} | {dense_top3/n:<14.2%} | {dense_top5/n:<14.2%}")
    hybrid_label = f"Hybrid ({bm25_weight:.2f} BM)"
    print(f"{hybrid_label:<22} | {hybrid_top1/n:<12.2%} | {hybrid_top3/n:<14.2%} | {hybrid_top5/n:<14.2%}")
    print("-" * 70)
    print(f"Độ trễ trung bình trên CPU: {latency:.2f} ms / truy vấn")

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    run_clean_benchmark()
