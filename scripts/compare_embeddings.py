import argparse
import io
import json
import sys
import time
from pathlib import Path
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import HybridDiseaseSearcher, tokenize_vietnamese, resolve_device
from tests.test_retrieval import RETRIEVAL_BENCHMARK
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from unidecode import unidecode

def _matches(expected_list, name: str) -> bool:
    low = name.lower()
    return any(exp.lower() in low or low in exp.lower() for exp in expected_list)

def evaluate_tier1_30(searcher: HybridDiseaseSearcher, bm25_weight: float) -> dict:
    total = len(RETRIEVAL_BENCHMARK)
    hits_at_1 = 0
    hits_at_3 = 0
    emergency_hits = 0
    emergency_total = 0
    reciprocal_ranks = []
    margins = []

    for case in RETRIEVAL_BENCHMARK:
        results = searcher.search(case["query"], top_k=5, bm25_weight=bm25_weight)
        names = [r["name"] for r in results]

        rank = None
        for i, name in enumerate(names, start=1):
            if _matches(case["expected_in_top3"], name):
                rank = i
                break

        is_emergency = case.get("is_emergency", False)
        if is_emergency:
            emergency_total += 1

        if rank == 1:
            hits_at_1 += 1
            if is_emergency:
                emergency_hits += 1
            if len(results) >= 2:
                margins.append(results[0]["score"] - results[1]["score"])

        if rank is not None and rank <= 3:
            hits_at_3 += 1

        reciprocal_ranks.append(1.0 / rank if rank else 0.0)

    return {
        "recall@1": hits_at_1 / total,
        "recall@3": hits_at_3 / total,
        "mrr": sum(reciprocal_ranks) / total,
        "safety@1": emergency_hits / emergency_total if emergency_total else 1.0,
        "margin": sum(margins) / len(margins) if margins else 0.0,
    }

def evaluate_benchmark_603(model_path_or_name: str, device: str = "cpu", limit: int = 500) -> dict:
    diseases = load_all_diseases(ROOT / "data/diseases_expanded")
    disease_map = {d.name_vi: d for d in diseases}
    disease_names = list(disease_map.keys())

    docs = []
    bm25_tokens = []
    for name in disease_names:
        d = disease_map[name]
        doc_text = HybridDiseaseSearcher._prepare_document_text(d)
        docs.append(doc_text)
        bm25_tokens.append(tokenize_vietnamese(doc_text))

    bm25 = BM25Okapi(bm25_tokens)
    model = SentenceTransformer(model_path_or_name, device=device)
    doc_embeddings = model.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)

    bench_file = ROOT / "data/test_cases/benchmark_603_diseases.json"
    with open(bench_file, "r", encoding="utf-8") as f:
        bench_data = json.load(f)

    test_cases = bench_data["cases"][:limit]
    queries = [c["query"] for c in test_cases]
    q_vecs = model.encode(queries, batch_size=64, normalize_embeddings=True, show_progress_bar=False)

    dense_top1, dense_top3, dense_top5 = 0, 0, 0
    hybrid_top1, hybrid_top3, hybrid_top5 = 0, 0, 0
    n = len(test_cases)

    for idx, item in enumerate(test_cases):
        expected = item["expected_disease"]
        q_tok = tokenize_vietnamese(item["query"])
        bm25_raw = np.array(bm25.get_scores(q_tok))
        bm25_norm = bm25_raw / (bm25_raw.max() + 1e-6)
        dense_scores = np.dot(doc_embeddings, q_vecs[idx])

        # Dense-only
        top_dense = [disease_names[i] for i in np.argsort(dense_scores)[::-1][:5]]
        if expected == top_dense[0]: dense_top1 += 1
        if expected in top_dense[:3]: dense_top3 += 1
        if expected in top_dense[:5]: dense_top5 += 1

        # Hybrid (0.5 BM25 + 0.5 Dense)
        fused = 0.5 * bm25_norm + 0.5 * dense_scores
        top_hybrid = [disease_names[i] for i in np.argsort(fused)[::-1][:5]]
        if expected == top_hybrid[0]: hybrid_top1 += 1
        if expected in top_hybrid[:3]: hybrid_top3 += 1
        if expected in top_hybrid[:5]: hybrid_top5 += 1

    return {
        "dense_top1": dense_top1 / n,
        "dense_top3": dense_top3 / n,
        "dense_top5": dense_top5 / n,
        "hybrid_top1": hybrid_top1 / n,
        "hybrid_top5": hybrid_top5 / n,
        "cases_tested": n
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="+", default=["BAAI/bge-m3", "models/bge-m3-medical"])
    parser.add_argument("--limit-603", type=int, default=500, help="Số ca test trên bộ 603 bệnh")
    args = parser.parse_args()

    dev = resolve_device()
    print(f"Device: {dev}\n")

    print("=========================================================================================")
    print("BẢNG 1: ĐÁNH GIÁ TRÊN BỘ 30 BỆNH TIER 1 (Golden Test Set)")
    print("=========================================================================================")
    print(f"{'Mô hình':<30} | {'Vec R@1':<10} | {'Safety@1':<10} | {'Margin':<10} | {'MRR':<10}")
    print("-" * 75)

    for m in args.models:
        try:
            searcher = HybridDiseaseSearcher(
                diseases_dir=str(ROOT / "data" / "diseases"),
                db_path=str(ROOT / "data" / "embeddings"),
                embedding_model=m,
                device=dev
            )
            v_metrics = evaluate_tier1_30(searcher, bm25_weight=0.0)
            print(f"{m:<30} | {v_metrics['recall@1']:<10.2%} | {v_metrics['safety@1']:<10.2%} | {v_metrics['margin']:<10.4f} | {v_metrics['mrr']:<10.4f}")
        except Exception as e:
            print(f"{m:<30} | LỖI: {e}")

    print("\n=========================================================================================")
    print(f"BẢNG 2: ĐÁNH GIÁ TRÊN BỘ 603 BỆNH TIER 2 ({args.limit_603} ca test độc lập)")
    print("=========================================================================================")
    print(f"{'Mô hình':<30} | {'Dense Top-1':<12} | {'Dense Top-3':<12} | {'Dense Top-5':<12} | {'Hybrid Top-5':<12}")
    print("-" * 85)

    for m in args.models:
        try:
            res = evaluate_benchmark_603(m, device=dev, limit=args.limit_603)
            print(f"{m:<30} | {res['dense_top1']:<12.2%} | {res['dense_top3']:<12.2%} | {res['dense_top5']:<12.2%} | {res['hybrid_top5']:<12.2%}")
        except Exception as e:
            print(f"{m:<30} | LỖI: {e}")

if __name__ == "__main__":
    main()
