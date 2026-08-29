"""Compare embedding models on every reserved retrieval benchmark."""

from __future__ import annotations

import argparse
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import HybridDiseaseSearcher, resolve_device, tokenize_vietnamese


def _normalize(text: str) -> str:
    return " ".join(text.casefold().split())


def _matches(expected: list[str], actual: str) -> bool:
    actual_norm = _normalize(actual)
    return any(_normalize(name) == actual_norm for name in expected)


def _load_cases(path: Path, limit: int) -> list[dict]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    cases = payload if isinstance(payload, list) else payload.get("cases", [])
    return cases[:limit] if limit > 0 else cases


def _expected_names(case: dict) -> list[str]:
    if case.get("expected_in_top3"):
        return list(case["expected_in_top3"])
    if case.get("expected_top"):
        return [case["expected_top"]]
    return [case["expected_disease"]]


def _is_expected(case: dict, disease) -> bool:
    """Use stable disease IDs when available; otherwise require exact canonical names."""
    if case.get("disease_id"):
        return disease.disease_id == case["disease_id"]
    return _matches(_expected_names(case), disease.name_vi)


def _validate_benchmark_labels(cases: list[dict], diseases: list) -> None:
    unresolved = []
    for case in cases:
        if not any(_is_expected(case, disease) for disease in diseases):
            unresolved.append({
                "disease_id": case.get("disease_id"),
                "expected_names": _expected_names(case),
            })
    if unresolved:
        raise ValueError(
            f"Benchmark has {len(unresolved)} labels that do not exactly resolve to the corpus; "
            f"examples: {unresolved[:5]}"
        )


def _ranking_metrics(rankings: list[list[int]], cases: list[dict], diseases: list) -> dict:
    hits = {1: 0, 3: 0, 5: 0}
    reciprocal_ranks = []
    emergency_hits = 0
    emergency_total = 0

    for indices, case in zip(rankings, cases):
        rank = next(
            (i for i, index in enumerate(indices, 1) if _is_expected(case, diseases[index])),
            None,
        )
        for k in hits:
            hits[k] += int(rank is not None and rank <= k)
        reciprocal_ranks.append(1.0 / rank if rank else 0.0)
        if case.get("is_emergency"):
            emergency_total += 1
            emergency_hits += int(rank is not None and rank <= 5)

    total = len(cases)
    metrics = {
        "recall@1": hits[1] / total,
        "recall@3": hits[3] / total,
        "recall@5": hits[5] / total,
        "mrr": float(np.mean(reciprocal_ranks)),
        "cases": total,
    }
    if emergency_total:
        metrics["emergency_recall@5"] = emergency_hits / emergency_total
        metrics["emergency_cases"] = emergency_total
    return metrics


def evaluate_corpus(
    model: SentenceTransformer,
    diseases_dir: Path,
    benchmark_path: Path,
    *,
    encode_batch_size: int,
    bm25_weight: float,
    limit: int,
) -> dict:
    diseases = load_all_diseases(diseases_dir)
    documents = [HybridDiseaseSearcher._prepare_document_text(d) for d in diseases]
    cases = _load_cases(benchmark_path, limit)
    _validate_benchmark_labels(cases, diseases)
    queries = [case["query"] for case in cases]

    document_embeddings = model.encode(
        documents,
        batch_size=encode_batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    query_embeddings = model.encode(
        queries,
        batch_size=encode_batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    dense_scores = np.matmul(query_embeddings, np.asarray(document_embeddings).T)
    dense_rankings = [np.argsort(row)[::-1][:5].tolist() for row in dense_scores]

    bm25 = BM25Okapi([tokenize_vietnamese(document) for document in documents])
    hybrid_rankings = []
    for case, dense_row in zip(cases, dense_scores):
        bm25_row = np.asarray(bm25.get_scores(tokenize_vietnamese(case["query"])))
        max_bm25 = float(bm25_row.max())
        bm25_norm = bm25_row / max_bm25 if max_bm25 > 0 else bm25_row
        cosine_norm = np.clip((dense_row + 1.0) / 2.0, 0.0, 1.0)
        fused = bm25_weight * bm25_norm + (1.0 - bm25_weight) * cosine_norm
        hybrid_rankings.append(np.argsort(fused)[::-1][:5].tolist())

    return {
        "dense": _ranking_metrics(dense_rankings, cases, diseases),
        "hybrid": _ranking_metrics(hybrid_rankings, cases, diseases),
    }


def evaluate_model(model_name: str, args) -> dict:
    model = SentenceTransformer(model_name, device=args.device)
    model.max_seq_length = args.seq_len
    results = {
        "generated_colloquial": evaluate_corpus(
            model,
            ROOT / "data" / "diseases",
            ROOT / "data" / "test_cases" / "generated_benchmark.json",
            encode_batch_size=args.encode_batch_size,
            bm25_weight=args.bm25_weight,
            limit=args.limit_generated,
        ),
        "diseases_603": evaluate_corpus(
            model,
            ROOT / "data" / "diseases_expanded",
            ROOT / "data" / "test_cases" / "benchmark_603_diseases.json",
            encode_batch_size=args.encode_batch_size,
            bm25_weight=args.bm25_weight,
            limit=args.limit_603,
        ),
    }
    del model
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass
    return results


def _print_model_results(model_name: str, results: dict) -> None:
    print(f"\n=== {model_name} ===")
    print(f"{'benchmark':<24} {'mode':<8} {'R@1':>8} {'R@3':>8} {'R@5':>8} {'MRR':>8}")
    for benchmark, modes in results.items():
        for mode, metrics in modes.items():
            print(
                f"{benchmark:<24} {mode:<8} "
                f"{metrics['recall@1']:>8.2%} {metrics['recall@3']:>8.2%} "
                f"{metrics['recall@5']:>8.2%} {metrics['mrr']:>8.4f}"
            )


def enforce_quality_gate(all_results: dict, tolerance: float) -> None:
    model_names = list(all_results)
    if len(model_names) < 2:
        raise ValueError("Quality gate requires baseline first and candidate last")
    baseline = all_results[model_names[0]]
    candidate = all_results[model_names[-1]]
    regressions = []
    for benchmark in baseline:
        for mode in ("dense", "hybrid"):
            for metric in ("recall@1", "recall@5"):
                before = baseline[benchmark][mode][metric]
                after = candidate[benchmark][mode][metric]
                if after + tolerance < before:
                    regressions.append(
                        f"{benchmark}.{mode}.{metric}: {before:.2%} -> {after:.2%}"
                    )
    if regressions:
        raise SystemExit("[QUALITY GATE FAILED]\n" + "\n".join(regressions))
    print(f"\n[QUALITY GATE PASSED] No key metric regressed by more than {tolerance:.2%}.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="+", default=["BAAI/bge-m3", "models/bge-m3-medical-v2"])
    parser.add_argument("--device", default=resolve_device())
    parser.add_argument("--seq-len", type=int, default=768)
    parser.add_argument("--encode-batch-size", type=int, default=32)
    parser.add_argument("--bm25-weight", type=float, default=0.75)
    parser.add_argument("--limit-generated", type=int, default=0, help="0 evaluates all cases")
    parser.add_argument("--limit-603", type=int, default=0, help="0 evaluates all cases")
    parser.add_argument("--report", default="artifacts/evaluation/bge_m3_comparison.json")
    parser.add_argument("--quality-gate", action="store_true")
    parser.add_argument("--regression-tolerance", type=float, default=0.005)
    args = parser.parse_args()

    if not 0.0 <= args.bm25_weight <= 1.0:
        parser.error("--bm25-weight must be between 0 and 1")

    all_results = {}
    for model_name in args.models:
        print(f"\nLoading and evaluating {model_name} on {args.device}...")
        results = evaluate_model(model_name, args)
        all_results[model_name] = results
        _print_model_results(model_name, results)

    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "device": args.device,
        "sequence_length": args.seq_len,
        "bm25_weight": args.bm25_weight,
        "models": all_results,
    }
    report_path = ROOT / args.report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print(f"\nReport: {report_path}")

    if args.quality_gate:
        enforce_quality_gate(all_results, args.regression_tolerance)


if __name__ == "__main__":
    main()
