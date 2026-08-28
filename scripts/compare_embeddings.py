"""
A/B benchmark between embedding models (MiniLM vs BGE-M3).

The fused benchmark is already saturated at 30 diseases, so fused Recall@1 alone
cannot distinguish the models. This script therefore also reports:

  - VECTOR-ONLY metrics (bm25_weight=0.0), isolating embedding quality from BM25.
  - Score margin (top1 - top2), a robustness proxy: a wider margin means the
    correct disease is less likely to be overtaken as the knowledge base grows.

Usage:
    python scripts/compare_embeddings.py
    python scripts/compare_embeddings.py --models minilm bge-m3
"""
import argparse
import io
import sys
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from retrieval.search_engine import HybridDiseaseSearcher, resolve_device
from tests.test_retrieval import RETRIEVAL_BENCHMARK


def _matches(expected_list, name: str) -> bool:
    """Two-way substring match, consistent with tests/test_retrieval.py."""
    low = name.lower()
    return any(exp.lower() in low or low in exp.lower() for exp in expected_list)


def evaluate(searcher: HybridDiseaseSearcher, bm25_weight: float) -> dict:
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
            # Margin is only meaningful when the top hit is correct.
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="+", default=["minilm", "bge-m3"])
    args = parser.parse_args()

    print(f"Device: {resolve_device()}")
    print(f"Benchmark cases: {len(RETRIEVAL_BENCHMARK)}\n")

    rows = []
    for model_key in args.models:
        print(f"--- Loading '{model_key}' ---")
        t0 = time.time()
        try:
            searcher = HybridDiseaseSearcher(
                diseases_dir=str(ROOT / "data" / "diseases"),
                db_path=str(ROOT / "data" / "embeddings"),
                embedding_model=model_key,
            )
        except Exception as e:
            print(f"  SKIPPED ({type(e).__name__}: {e})\n")
            continue
        load_time = time.time() - t0

        t0 = time.time()
        fused = evaluate(searcher, bm25_weight=0.75)
        fused_time = time.time() - t0

        vector_only = evaluate(searcher, bm25_weight=0.0)

        per_query_ms = fused_time / len(RETRIEVAL_BENCHMARK) * 1000
        rows.append((model_key, fused, vector_only, load_time, per_query_ms))
        print(f"  loaded in {load_time:.1f}s | {per_query_ms:.0f} ms/query\n")

    if not rows:
        print("No models evaluated.")
        return

    header = f"{'Model':<10} {'Mode':<12} {'R@1':>7} {'R@3':>7} {'MRR':>7} {'Safety':>7} {'Margin':>8}"
    print(header)
    print("-" * len(header))
    for model_key, fused, vec, _, _ in rows:
        for label, m in (("fused", fused), ("vector-only", vec)):
            print(
                f"{model_key:<10} {label:<12} "
                f"{m['recall@1']:>6.1%} {m['recall@3']:>6.1%} {m['mrr']:>7.3f} "
                f"{m['safety@1']:>6.1%} {m['margin']:>8.4f}"
            )
    print()
    print(f"{'Model':<10} {'Load (s)':>10} {'ms/query':>10}")
    print("-" * 32)
    for model_key, _, _, load_time, per_query_ms in rows:
        print(f"{model_key:<10} {load_time:>10.1f} {per_query_ms:>10.0f}")


if __name__ == "__main__":
    main()
