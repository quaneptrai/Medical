"""Compare embedding models on every reserved retrieval benchmark."""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

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
from runtime_config import get_setting


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
    per_case = []
    per_disease: dict[str, dict[str, int]] = {}

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
        per_case.append({
            "case_id": case.get("case_id") or case.get("query"),
            "disease_id": case.get("disease_id"),
            "is_emergency": bool(case.get("is_emergency")),
            "rank": rank,
            "hit@1": bool(rank is not None and rank <= 1),
            "hit@3": bool(rank is not None and rank <= 3),
            "hit@5": bool(rank is not None and rank <= 5),
        })
        disease_key = case.get("disease_id") or _expected_names(case)[0]
        disease_row = per_disease.setdefault(
            disease_key,
            {"cases": 0, "hit@1": 0, "hit@3": 0, "hit@5": 0},
        )
        disease_row["cases"] += 1
        for cutoff in (1, 3, 5):
            disease_row[f"hit@{cutoff}"] += int(rank is not None and rank <= cutoff)

    total = len(cases)
    metrics = {
        "recall@1": hits[1] / total,
        "recall@3": hits[3] / total,
        "recall@5": hits[5] / total,
        "mrr": float(np.mean(reciprocal_ranks)),
        "cases": total,
        "per_case": per_case,
        "per_disease": {
            disease_id: {
                "cases": row["cases"],
                "recall@1": row["hit@1"] / row["cases"],
                "recall@3": row["hit@3"] / row["cases"],
                "recall@5": row["hit@5"] / row["cases"],
            }
            for disease_id, row in sorted(per_disease.items())
        },
    }
    if emergency_total:
        metrics["emergency_recall@5"] = emergency_hits / emergency_total
        metrics["emergency_cases"] = emergency_total
    return metrics


def _mcnemar_exact_pvalue(baseline_hits: np.ndarray, candidate_hits: np.ndarray) -> float:
    """Two-sided exact McNemar p-value without a scipy dependency."""
    baseline_only = int(np.sum(baseline_hits & ~candidate_hits))
    candidate_only = int(np.sum(~baseline_hits & candidate_hits))
    discordant = baseline_only + candidate_only
    if discordant == 0:
        return 1.0
    tail = sum(math.comb(discordant, k) for k in range(0, min(baseline_only, candidate_only) + 1))
    return min(1.0, 2.0 * tail / (2 ** discordant))


def _paired_comparison(all_results: dict, bootstrap_samples: int = 10_000) -> dict:
    model_names = list(all_results)
    if len(model_names) < 2:
        return {}
    baseline_name, candidate_name = model_names[0], model_names[-1]
    rng = np.random.default_rng(20260829)
    comparisons = {}
    for benchmark in all_results[baseline_name]:
        comparisons[benchmark] = {}
        for mode in ("dense", "hybrid"):
            baseline_rows = all_results[baseline_name][benchmark][mode]["per_case"]
            candidate_rows = all_results[candidate_name][benchmark][mode]["per_case"]
            if [row["case_id"] for row in baseline_rows] != [row["case_id"] for row in candidate_rows]:
                raise ValueError(f"Unpaired case order for {benchmark}.{mode}")
            mode_stats = {}
            for cutoff in (1, 3, 5):
                key = f"hit@{cutoff}"
                before = np.asarray([row[key] for row in baseline_rows], dtype=bool)
                after = np.asarray([row[key] for row in candidate_rows], dtype=bool)
                delta = after.astype(float) - before.astype(float)
                indices = rng.integers(0, len(delta), size=(bootstrap_samples, len(delta)))
                boot = delta[indices].mean(axis=1)
                mode_stats[f"recall@{cutoff}"] = {
                    "delta": float(delta.mean()),
                    "paired_bootstrap_95": [
                        float(np.quantile(boot, 0.025)),
                        float(np.quantile(boot, 0.975)),
                    ],
                    "mcnemar_exact_p": _mcnemar_exact_pvalue(before, after),
                    "baseline_only_hits": int(np.sum(before & ~after)),
                    "candidate_only_hits": int(np.sum(~before & after)),
                }
            comparisons[benchmark][mode] = mode_stats
    return {
        "baseline": baseline_name,
        "candidate": candidate_name,
        "bootstrap_samples": bootstrap_samples,
        "warning": "If this benchmark was used to select alpha/hyperparameters, these intervals are validation statistics, not final-holdout evidence.",
        "benchmarks": comparisons,
    }


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
    revision = args.base_revision if model_name == args.base_model_name else None
    model = SentenceTransformer(
        model_name,
        device=args.device,
        revision=revision,
    )
    model.max_seq_length = args.seq_len
    results = {}
    if "generated_colloquial" in args.benchmarks:
        results["generated_colloquial"] = evaluate_corpus(
            model,
            ROOT / "data" / "diseases",
            ROOT / "data" / "test_cases" / "generated_benchmark.json",
            encode_batch_size=args.encode_batch_size,
            bm25_weight=args.bm25_weight,
            limit=args.limit_generated,
        )
    if "diseases_603" in args.benchmarks:
        results["diseases_603"] = evaluate_corpus(
            model,
            ROOT / "data" / "diseases_expanded",
            ROOT / "data" / "test_cases" / "benchmark_603_diseases.json",
            encode_batch_size=args.encode_batch_size,
            bm25_weight=args.bm25_weight,
            limit=args.limit_603,
        )
    if "common_49" in args.benchmarks:
        results["common_49"] = evaluate_corpus(
            model,
            ROOT / "data" / "diseases_expanded",
            ROOT / "data" / "test_cases" / "common_49_validation.json",
            encode_batch_size=args.encode_batch_size,
            bm25_weight=args.bm25_weight,
            limit=args.limit_common_49,
        )
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


def enforce_quality_gate(
    all_results: dict,
    tolerance: float,
    baseline_names: list[str] | None = None,
) -> None:
    model_names = list(all_results)
    if len(model_names) < 2:
        raise ValueError("Quality gate requires baseline first and candidate last")
    candidate_name = model_names[-1]
    candidate = all_results[candidate_name]
    baseline_names = baseline_names or [model_names[0]]
    missing_baselines = [name for name in baseline_names if name not in all_results]
    if missing_baselines:
        raise ValueError(f"Quality gate baselines were not evaluated: {missing_baselines}")
    if candidate_name in baseline_names:
        raise ValueError("Candidate cannot also be a quality-gate baseline")
    regressions = []
    for baseline_name in baseline_names:
        baseline = all_results[baseline_name]
        for benchmark in baseline:
            for mode in ("dense", "hybrid"):
                metrics = ["recall@1", "recall@5"]
                if "emergency_recall@5" in baseline[benchmark][mode]:
                    metrics.append("emergency_recall@5")
                for metric in metrics:
                    before = baseline[benchmark][mode][metric]
                    after = candidate[benchmark][mode].get(metric)
                    metric_tolerance = 0.0 if metric == "emergency_recall@5" else tolerance
                    prefix = f"vs {baseline_name}: " if len(baseline_names) > 1 else ""
                    if after is None:
                        regressions.append(f"{prefix}{benchmark}.{mode}.{metric}: missing in candidate")
                    elif after + metric_tolerance < before:
                        regressions.append(
                            f"{prefix}{benchmark}.{mode}.{metric}: {before:.2%} -> {after:.2%}"
                        )
    if regressions:
        raise SystemExit("[QUALITY GATE FAILED]\n" + "\n".join(regressions))
    print(
        f"\n[QUALITY GATE PASSED] Candidate did not regress against "
        f"{', '.join(baseline_names)} by more than {tolerance:.2%}."
    )


def enforce_common_49_gate(all_results: dict, incumbent_name: str) -> None:
    """Require useful coverage, not merely non-regression, on every new disease."""
    candidate_name = list(all_results)[-1]
    candidate = all_results[candidate_name].get("common_49")
    if candidate is None:
        raise SystemExit("[COMMON-49 GATE FAILED] common_49 benchmark was not evaluated")
    floors = {
        "dense": {"recall@1": 0.80, "recall@5": 0.95},
        "hybrid": {"recall@1": 0.90, "recall@5": 0.98},
    }
    failures = []
    for mode, metrics in floors.items():
        for metric, floor in metrics.items():
            actual = candidate[mode][metric]
            if actual < floor:
                failures.append(f"{mode}.{metric}: {actual:.2%} < required {floor:.2%}")
        weak = [
            disease_id
            for disease_id, row in candidate[mode]["per_disease"].items()
            if row["recall@5"] < 0.80
        ]
        if weak:
            failures.append(
                f"{mode}.per_disease.recall@5 < 80% for {len(weak)} diseases: {weak[:12]}"
            )
    if incumbent_name not in all_results:
        failures.append(f"incumbent was not evaluated: {incumbent_name}")
    else:
        before = all_results[incumbent_name]["common_49"]["dense"]["recall@1"]
        after = candidate["dense"]["recall@1"]
        if after < 0.90 and after < before + 0.02:
            failures.append(
                f"dense.recall@1 did not improve by 2 points vs incumbent: "
                f"{before:.2%} -> {after:.2%} (90% absolute waives gain requirement)"
            )
    if failures:
        raise SystemExit("[COMMON-49 GATE FAILED]\n" + "\n".join(failures))
    print("\n[COMMON-49 GATE PASSED] Aggregate and per-disease coverage floors passed.")


def enforce_medical_dominance(
    all_results: dict,
    base_name: str,
    incumbent_name: str,
    *,
    min_dense_recall1_gain: float = 0.02,
) -> None:
    """Accept only a candidate that Pareto-dominates base on medical validation."""
    candidate_name = list(all_results)[-1]
    missing = [name for name in (base_name, incumbent_name) if name not in all_results]
    if missing:
        raise ValueError(f"Medical-dominance references were not evaluated: {missing}")
    if candidate_name in {base_name, incumbent_name}:
        raise ValueError("Candidate must be distinct from base and incumbent")

    base = all_results[base_name]
    incumbent = all_results[incumbent_name]
    candidate = all_results[candidate_name]
    failures = []
    for benchmark, base_benchmark in base.items():
        if benchmark not in incumbent or benchmark not in candidate:
            failures.append(f"{benchmark}: missing from incumbent or candidate")
            continue
        for mode in ("dense", "hybrid"):
            for metric in ("recall@1", "recall@3", "recall@5", "mrr"):
                before = base_benchmark[mode].get(metric)
                current = candidate[benchmark][mode].get(metric)
                production = incumbent[benchmark][mode].get(metric)
                if before is None or current is None or production is None:
                    failures.append(f"{benchmark}.{mode}.{metric}: missing metric")
                    continue
                # A metric already at its mathematical ceiling may only tie.
                if before >= 1.0 - 1e-12:
                    if current < before:
                        failures.append(
                            f"{benchmark}.{mode}.{metric}: ceiling regressed "
                            f"{before:.2%} -> {current:.2%}"
                        )
                elif current <= before:
                    failures.append(
                        f"{benchmark}.{mode}.{metric}: candidate does not beat base "
                        f"({before:.4f} -> {current:.4f})"
                    )
                if current < production:
                    failures.append(
                        f"{benchmark}.{mode}.{metric}: candidate regresses incumbent "
                        f"({production:.4f} -> {current:.4f})"
                    )

            for metric in ("emergency_recall@5",):
                if metric not in base_benchmark[mode]:
                    continue
                before = base_benchmark[mode][metric]
                current = candidate[benchmark][mode].get(metric)
                production = incumbent[benchmark][mode].get(metric)
                if current is None or current < before or (
                    production is not None and current < production
                ):
                    failures.append(
                        f"{benchmark}.{mode}.{metric}: safety recall must not regress"
                    )

        base_r1 = base_benchmark["dense"]["recall@1"]
        candidate_r1 = candidate[benchmark]["dense"]["recall@1"]
        if base_r1 < 1.0 - 1e-12 and candidate_r1 - base_r1 < min_dense_recall1_gain:
            failures.append(
                f"{benchmark}.dense.recall@1 gain is only "
                f"{candidate_r1 - base_r1:+.2%}; required >= {min_dense_recall1_gain:.2%}"
            )

    if failures:
        raise SystemExit("[MEDICAL DOMINANCE GATE FAILED]\n" + "\n".join(failures))
    print(
        "\n[MEDICAL DOMINANCE GATE PASSED] Candidate beats base on every "
        "non-ceiling medical metric, preserves ceiling/safety metrics, and does not "
        "regress the production incumbent."
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", nargs="+", default=["BAAI/bge-m3", "models/bge-m3-medical-v2"])
    parser.add_argument("--device", default=resolve_device())
    parser.add_argument("--base-model-name", default="BAAI/bge-m3")
    parser.add_argument("--base-revision")
    parser.add_argument("--seq-len", type=int, default=768)
    parser.add_argument("--encode-batch-size", type=int, default=32)
    parser.add_argument(
        "--benchmarks",
        nargs="+",
        choices=("generated_colloquial", "diseases_603", "common_49"),
        default=["generated_colloquial", "diseases_603", "common_49"],
    )
    parser.add_argument(
        "--bm25-weight",
        type=float,
        default=float(get_setting("retrieval.bm25_weight")),
    )
    parser.add_argument("--limit-generated", type=int, default=0, help="0 evaluates all cases")
    parser.add_argument("--limit-603", type=int, default=0, help="0 evaluates all cases")
    parser.add_argument("--limit-common-49", type=int, default=0, help="0 evaluates all cases")
    parser.add_argument("--report", default="artifacts/evaluation/bge_m3_comparison.json")
    parser.add_argument("--quality-gate", action="store_true")
    parser.add_argument(
        "--gate-baselines",
        nargs="+",
        help="Evaluated model names that the final candidate must not regress against",
    )
    parser.add_argument("--regression-tolerance", type=float, default=0.005)
    parser.add_argument("--strict-medical-dominance", action="store_true")
    parser.add_argument("--min-dense-recall1-gain", type=float, default=0.02)
    args = parser.parse_args()

    if not 0.0 <= args.bm25_weight <= 1.0:
        parser.error("--bm25-weight must be between 0 and 1")
    if args.base_revision and len(args.base_revision) != 40:
        parser.error("--base-revision must be a full 40-character commit SHA")
    if not 0.0 <= args.min_dense_recall1_gain <= 1.0:
        parser.error("--min-dense-recall1-gain must be between 0 and 1")
    if args.strict_medical_dominance and not args.quality_gate:
        parser.error("--strict-medical-dominance requires --quality-gate")

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
        "base_model_name": args.base_model_name,
        "base_revision": args.base_revision,
        "models": all_results,
        "paired_comparison": _paired_comparison(all_results),
        "evaluation_role": "validation",
        "limitations": [
            "The alpha blend was selected using these benchmarks, so they are not an untouched final holdout.",
            "A separately sourced and clinician-reviewed final holdout is required for clinical claims.",
        ],
    }
    report_path = ROOT / args.report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print(f"\nReport: {report_path}")

    if args.quality_gate:
        enforce_quality_gate(all_results, args.regression_tolerance, args.gate_baselines)
        if not args.gate_baselines or len(args.gate_baselines) < 2:
            raise SystemExit("[COMMON-49 GATE FAILED] base and incumbent baselines are both required")
        enforce_common_49_gate(all_results, args.gate_baselines[-1])
        if args.strict_medical_dominance:
            enforce_medical_dominance(
                all_results,
                args.gate_baselines[0],
                args.gate_baselines[-1],
                min_dense_recall1_gain=args.min_dense_recall1_gain,
            )


if __name__ == "__main__":
    main()
