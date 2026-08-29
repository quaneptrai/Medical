"""Calibrate and wire the semantic emergency threshold into production."""

from __future__ import annotations

import argparse
import gc
import io
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from safety.guardrails import ClinicalGuardrailEngine


def _project_reference(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())


def _atomic_json_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.flush()
    temporary.replace(path)


def load_labeled_cases(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    raw_cases = payload if isinstance(payload, list) else payload.get("cases", [])
    cases_by_query: dict[str, dict] = {}
    for row in raw_cases:
        if not isinstance(row, dict) or not row.get("query"):
            continue
        if not isinstance(row.get("is_emergency"), bool):
            raise ValueError(f"Every calibration case must have a boolean is_emergency: {row}")
        key = " ".join(row["query"].casefold().split())
        previous = cases_by_query.get(key)
        if previous and previous["is_emergency"] != row["is_emergency"]:
            raise ValueError(f"Conflicting labels for duplicate calibration query: {row['query']}")
        cases_by_query[key] = {
            "query": row["query"],
            "is_emergency": row["is_emergency"],
            "category": row.get("category"),
        }
    if not cases_by_query:
        raise ValueError(f"No labeled cases found in {path}")
    return list(cases_by_query.values())


def _wilson_interval(successes: int, total: int, z: float = 1.959963984540054) -> list[float]:
    if total == 0:
        return [0.0, 0.0]
    proportion = successes / total
    denominator = 1.0 + z * z / total
    centre = proportion + z * z / (2.0 * total)
    margin = z * math.sqrt((proportion * (1.0 - proportion) + z * z / (4.0 * total)) / total)
    return [(centre - margin) / denominator, (centre + margin) / denominator]


def _score_cases(engine: ClinicalGuardrailEngine, cases: list[dict], batch_size: int):
    queries = [row["query"] for row in cases]
    regex_hits = np.asarray([
        any(re.search(rule["pattern"], engine._normalize(query)) for rule in engine.emergency_rules)
        for query in queries
    ])
    query_embeddings = engine.embed_model.encode(
        queries,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    semantic_scores = np.max(
        np.matmul(np.asarray(query_embeddings), np.asarray(engine.anchor_embeddings).T),
        axis=1,
    )
    return regex_hits, semantic_scores


def _metrics(labels: np.ndarray, predictions: np.ndarray) -> dict:
    tp = int(np.sum(predictions & labels))
    fn = int(np.sum(~predictions & labels))
    fp = int(np.sum(predictions & ~labels))
    tn = int(np.sum(~predictions & ~labels))
    positives = tp + fn
    negatives = tn + fp
    recall = tp / positives if positives else 0.0
    precision = tp / (tp + fp) if tp + fp else 0.0
    specificity = tn / negatives if negatives else 0.0
    return {
        "true_positives": tp,
        "false_negatives": fn,
        "false_positives": fp,
        "true_negatives": tn,
        "recall": recall,
        "precision": precision,
        "specificity": specificity,
        "recall_wilson_95": _wilson_interval(tp, positives),
        "specificity_wilson_95": _wilson_interval(tn, negatives),
    }


def run_threshold_sweep(
    model_path: Path,
    dataset_path: Path,
    report_path: Path,
    *,
    thresholds: list[float],
    batch_size: int,
    min_emergencies: int,
    min_non_emergencies: int,
):
    cases = load_labeled_cases(dataset_path)
    labels = np.asarray([row["is_emergency"] for row in cases], dtype=bool)
    emergency_count = int(labels.sum())
    non_emergency_count = int((~labels).sum())
    if emergency_count < min_emergencies or non_emergency_count < min_non_emergencies:
        raise SystemExit(
            "Calibration dataset is too small: "
            f"{emergency_count} emergency / {non_emergency_count} non-emergency; "
            f"required at least {min_emergencies} / {min_non_emergencies}."
        )

    print(f"Loading required semantic model: {model_path}")
    engine = ClinicalGuardrailEngine(model_path=str(model_path), require_semantic=True)
    if engine.embed_model is None or engine.anchor_embeddings is None:
        raise RuntimeError("Semantic guardrail model did not initialize")

    regex_hits, semantic_scores = _score_cases(engine, cases, batch_size)
    sweep = []
    print(f"Cases: {len(cases)} ({emergency_count} emergency / {non_emergency_count} non-emergency)")
    print(f"{'threshold':>10} {'FN':>6} {'FP':>6} {'recall':>10} {'precision':>10} {'specificity':>12}")
    for threshold in thresholds:
        predictions = regex_hits | (semantic_scores >= threshold)
        row = {"threshold": threshold, **_metrics(labels, predictions)}
        sweep.append(row)
        print(
            f"{threshold:>10.3f} {row['false_negatives']:>6} {row['false_positives']:>6} "
            f"{row['recall']:>10.2%} {row['precision']:>10.2%} {row['specificity']:>12.2%}"
        )

    zero_observed_fn = [row for row in sweep if row["false_negatives"] == 0]
    selected = min(
        zero_observed_fn,
        key=lambda row: (row["false_positives"], -row["threshold"]),
        default=None,
    )
    if selected is None:
        raise SystemExit(
            "No threshold achieved zero observed false negatives on the calibration set; candidate rejected."
        )

    report = {
        "schema_version": 1,
        "model": _project_reference(model_path),
        "selected_threshold": selected["threshold"],
        "selection_rule": "zero observed false negatives, then minimum false positives, then highest threshold",
        "dataset": _project_reference(dataset_path),
        "sample_counts": {
            "total_unique": len(cases),
            "emergency": emergency_count,
            "non_emergency": non_emergency_count,
        },
        "selected_metrics": selected,
        "runtime_verified": False,
        "limitations": [
            "Zero observed false negatives is not a guarantee of zero false negatives in production.",
            "The Wilson confidence interval quantifies sampling uncertainty.",
            "Clinical review and a larger independently sourced emergency holdout remain required before safety claims.",
        ],
        "sweep": sweep,
    }
    _atomic_json_write(report_path, report)

    # Verify the exact default production constructor consumes this artifact.
    del engine
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass
    runtime_engine = ClinicalGuardrailEngine(
        calibration_path=str(report_path),
        require_semantic=True,
        allow_unverified_config=True,
    )
    if Path(runtime_engine.model_path).resolve() != model_path.resolve():
        raise RuntimeError(
            f"Runtime loaded {runtime_engine.model_path}, expected {model_path.resolve()}"
        )
    if not math.isclose(runtime_engine.semantic_threshold, selected["threshold"], abs_tol=1e-12):
        raise RuntimeError(
            f"Runtime loaded threshold {runtime_engine.semantic_threshold}, expected {selected['threshold']}"
        )
    report["runtime_verified"] = True
    _atomic_json_write(report_path, report)
    print(
        f"Selected threshold {selected['threshold']:.3f}; observed FN={selected['false_negatives']}, "
        f"FP={selected['false_positives']}, recall 95% CI={selected['recall_wilson_95']}."
    )
    print(f"Production runtime wiring verified via {report_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="models/bge-m3-medical-v2")
    parser.add_argument("--dataset", default="data/test_cases/generated_benchmark.json")
    parser.add_argument("--report", default="artifacts/evaluation/guardrail_calibration.json")
    parser.add_argument("--threshold-start", type=float, default=0.35)
    parser.add_argument("--threshold-stop", type=float, default=0.70)
    parser.add_argument("--threshold-step", type=float, default=0.01)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--min-emergencies", type=int, default=30)
    parser.add_argument("--min-non-emergencies", type=int, default=100)
    args = parser.parse_args()

    def rooted(value: str) -> Path:
        path = Path(value)
        return path if path.is_absolute() else ROOT / path

    model_path = rooted(args.model)
    dataset_path = rooted(args.dataset)
    report_path = rooted(args.report)
    if not model_path.exists():
        raise FileNotFoundError(f"Candidate guardrail model does not exist: {model_path}")
    if not dataset_path.exists():
        raise FileNotFoundError(f"Calibration dataset does not exist: {dataset_path}")
    if args.threshold_step <= 0 or args.threshold_stop < args.threshold_start:
        parser.error("invalid threshold range")
    thresholds = np.arange(
        args.threshold_start,
        args.threshold_stop + args.threshold_step / 2.0,
        args.threshold_step,
    ).round(6).tolist()
    run_threshold_sweep(
        model_path,
        dataset_path,
        report_path,
        thresholds=thresholds,
        batch_size=args.batch_size,
        min_emergencies=args.min_emergencies,
        min_non_emergencies=args.min_non_emergencies,
    )


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    main()
