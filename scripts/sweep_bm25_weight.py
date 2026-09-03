"""
Sweep bm25_weight parameter for hybrid retrieval across benchmarks.
Evaluates the effect of varying lexical vs dense weight ratios.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import HybridDiseaseSearcher, resolve_device, tokenize_vietnamese
from runtime_config import get_setting, resolve_project_path
from scripts.compare_embeddings import (
    _load_cases,
    _validate_benchmark_labels,
    _is_expected,
)


def compute_pre_fused_matrices(
    model: SentenceTransformer,
    diseases_dir: Path,
    benchmark_path: Path,
    encode_batch_size: int = 32,
    limit: int = 0,
) -> Tuple[np.ndarray, np.ndarray, list, list]:
    """Compute dense cosine similarity matrix and normalized BM25 score matrix once."""
    diseases = load_all_diseases(diseases_dir)
    documents = [HybridDiseaseSearcher._prepare_document_text(d) for d in diseases]
    cases = _load_cases(benchmark_path, limit)
    _validate_benchmark_labels(cases, diseases)
    queries = [case["query"] for case in cases]

    print(f"  Encoding {len(documents)} corpus docs and {len(queries)} queries on {model.device}...")
    doc_emb = model.encode(documents, batch_size=encode_batch_size, normalize_embeddings=True, show_progress_bar=False)
    query_emb = model.encode(queries, batch_size=encode_batch_size, normalize_embeddings=True, show_progress_bar=False)

    dense_scores = np.matmul(query_emb, np.asarray(doc_emb).T)
    # Scale cosine [-1, 1] to [0, 1] as in search_engine
    cosine_norm = np.clip((dense_scores + 1.0) / 2.0, 0.0, 1.0)

    print("  Computing BM25 matrix...")
    bm25 = BM25Okapi([tokenize_vietnamese(doc) for doc in documents])
    bm25_matrix = np.zeros((len(queries), len(documents)), dtype=np.float32)
    for i, case in enumerate(cases):
        bm25_row = np.asarray(bm25.get_scores(tokenize_vietnamese(case["query"])), dtype=np.float32)
        max_bm25 = float(bm25_row.max())
        if max_bm25 > 0:
            bm25_matrix[i] = bm25_row / max_bm25
        else:
            bm25_matrix[i] = 0.0

    return cosine_norm, bm25_matrix, cases, diseases


def evaluate_weights(
    cosine_norm: np.ndarray,
    bm25_matrix: np.ndarray,
    cases: list,
    diseases: list,
    weights: list[float],
) -> List[Dict]:
    results = []
    total = len(cases)

    # Pre-find expected disease indices for fast evaluation
    expected_mask = np.zeros((total, len(diseases)), dtype=bool)
    for i, case in enumerate(cases):
        for j, disease in enumerate(diseases):
            if _is_expected(case, disease):
                expected_mask[i, j] = True

    emergency_indices = [i for i, c in enumerate(cases) if c.get("is_emergency")]
    n_emergency = len(emergency_indices)

    for w in weights:
        # Fused scores: w * BM25 + (1 - w) * Dense
        fused = w * bm25_matrix + (1.0 - w) * cosine_norm

        # Top 5 indices for each query
        top5_indices = np.argpartition(-fused, 5, axis=1)[:, :5]
        # Sort the top 5
        row_indices = np.arange(total)[:, None]
        top5_scores = fused[row_indices, top5_indices]
        sort_order = np.argsort(-top5_scores, axis=1)
        ranked_top5 = np.take_along_axis(top5_indices, sort_order, axis=1)

        hit1 = 0
        hit3 = 0
        hit5 = 0
        mrr_sum = 0.0
        emer_hit5 = 0

        for i in range(total):
            matched_rank = None
            for r in range(5):
                idx = ranked_top5[i, r]
                if expected_mask[i, idx]:
                    matched_rank = r + 1
                    break

            if matched_rank is not None:
                if matched_rank == 1:
                    hit1 += 1
                if matched_rank <= 3:
                    hit3 += 1
                if matched_rank <= 5:
                    hit5 += 1
                mrr_sum += 1.0 / matched_rank

        if n_emergency > 0:
            for i in emergency_indices:
                for r in range(5):
                    idx = ranked_top5[i, r]
                    if expected_mask[i, idx]:
                        emer_hit5 += 1
                        break

        results.append({
            "bm25_weight": round(w, 4),
            "dense_weight": round(1.0 - w, 4),
            "recall@1": hit1 / total,
            "recall@3": hit3 / total,
            "recall@5": hit5 / total,
            "mrr": mrr_sum / total,
            "emergency_recall@5": (emer_hit5 / n_emergency) if n_emergency > 0 else None,
        })
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        default=str(resolve_project_path(get_setting("retrieval.embedding_model"))),
        help="Model path or huggingface id",
    )
    parser.add_argument("--device", default=resolve_device())
    parser.add_argument("--step", type=float, default=0.05)
    parser.add_argument("--output", default="artifacts/evaluation/bm25_weight_sweep.json")
    args = parser.parse_args()

    model = SentenceTransformer(
        args.model,
        device=args.device,
    )
    model.max_seq_length = 768

    weights = [round(w, 4) for w in np.arange(0.0, 1.0 + args.step / 2, args.step)]

    print(f"\n=======================================================")
    print(f"SWEEPING BM25 WEIGHTS [0.0 -> 1.0, step {args.step}]")
    print(f"Model: {args.model}")
    print(f"Device: {args.device}")
    print(f"=======================================================\n")

    print("[1/2] Processing 'generated_colloquial' benchmark (476 cases)...")
    cos_norm_col, bm25_col, cases_col, dis_col = compute_pre_fused_matrices(
        model,
        ROOT / "data" / "diseases",
        ROOT / "data" / "test_cases" / "generated_benchmark.json",
    )
    results_col = evaluate_weights(cos_norm_col, bm25_col, cases_col, dis_col, weights)

    print("\n[2/2] Processing 'diseases_603' benchmark (3015 cases)...")
    cos_norm_603, bm25_603, cases_603, dis_603 = compute_pre_fused_matrices(
        model,
        ROOT / "data" / "diseases_expanded",
        ROOT / "data" / "test_cases" / "benchmark_603_diseases.json",
    )
    results_603 = evaluate_weights(cos_norm_603, bm25_603, cases_603, dis_603, weights)

    print("\n" + "=" * 80)
    print("RESULTS: generated_colloquial (Colloquial user queries, 476 cases)")
    print("=" * 80)
    print(f"{'bm25_wt':<8} {'dense_wt':<8} | {'R@1':>8} {'R@3':>8} {'R@5':>8} {'MRR':>8} | {'Emer@5':>8}")
    print("-" * 80)
    for r in results_col:
        emer_str = f"{r['emergency_recall@5']:.2%}" if r['emergency_recall@5'] is not None else "N/A"
        marker = " <== PREVIOUS (0.75)" if abs(r['bm25_weight'] - 0.75) < 1e-4 else ""
        print(
            f"{r['bm25_weight']:<8.2f} {r['dense_weight']:<8.2f} | "
            f"{r['recall@1']:>8.2%} {r['recall@3']:>8.2%} {r['recall@5']:>8.2%} {r['mrr']:>8.4f} | "
            f"{emer_str:>8}{marker}"
        )

    print("\n" + "=" * 80)
    print("RESULTS: diseases_603 (603 Diseases expansion benchmark, 3015 cases)")
    print("=" * 80)
    print(f"{'bm25_wt':<8} {'dense_wt':<8} | {'R@1':>8} {'R@3':>8} {'R@5':>8} {'MRR':>8}")
    print("-" * 80)
    for r in results_603:
        marker = " <== PREVIOUS (0.75)" if abs(r['bm25_weight'] - 0.75) < 1e-4 else ""
        print(
            f"{r['bm25_weight']:<8.2f} {r['dense_weight']:<8.2f} | "
            f"{r['recall@1']:>8.2%} {r['recall@3']:>8.2%} {r['recall@5']:>8.2%} {r['mrr']:>8.4f}{marker}"
        )

    # Save output report
    output_path = ROOT / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report_data = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "model": args.model,
        "device": args.device,
        "sweep_step": args.step,
        "benchmarks": {
            "generated_colloquial": results_col,
            "diseases_603": results_603,
        },
    }
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    print(f"\nReport saved to: {output_path}")


if __name__ == "__main__":
    main()
