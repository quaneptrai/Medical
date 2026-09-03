"""One-shot final evaluation after every model-selection decision is frozen."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "src"))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import HybridDiseaseSearcher, tokenize_vietnamese
from safety.guardrails import ClinicalGuardrailEngine
from scripts.calibrate_guardrail_threshold import _wilson_interval
from scripts.compare_embeddings import _mcnemar_exact_pvalue
from scripts.preflight_gpu_training import validate_frozen_holdout
from src.evaluation.holdout_schema import ClinicalHoldoutDataset
from src.runtime_config import get_setting


def _model_hash(model_reference: str) -> str | None:
    path = Path(model_reference)
    if not path.is_absolute():
        path = ROOT / path
    weights = path / "model.safetensors"
    return hashlib.sha256(weights.read_bytes()).hexdigest() if weights.exists() else None


def _retrieval_results(
    model_reference: str,
    cases: list,
    *,
    device: str,
    batch_size: int,
    bm25_weight: float,
) -> dict:
    diseases = load_all_diseases(ROOT / "data" / "diseases_expanded")
    documents = [HybridDiseaseSearcher._prepare_document_text(disease) for disease in diseases]
    disease_index = {disease.disease_id: index for index, disease in enumerate(diseases)}
    labeled = [case for case in cases if case.ground_truth_disease_id in disease_index]
    if not labeled:
        return {
            "labeled_cases": 0,
            "recall@1": None,
            "recall@5": None,
            "per_case": [],
            "warning": "No holdout rows had a resolvable ground_truth_disease_id.",
        }
    model = SentenceTransformer(
        model_reference,
        device=device,
    )
    model.max_seq_length = 768
    document_vectors = np.asarray(model.encode(
        documents, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=True
    ))
    query_vectors = np.asarray(model.encode(
        [case.query for case in labeled],
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    ))
    dense_scores = np.matmul(query_vectors, document_vectors.T)
    bm25 = BM25Okapi([tokenize_vietnamese(document) for document in documents])
    rows = []
    for case, dense_row in zip(labeled, dense_scores):
        scores = dense_row
        route = "emergency_dense" if case.is_emergency else "general_hybrid"
        if not case.is_emergency:
            lexical = np.asarray(bm25.get_scores(tokenize_vietnamese(case.query)))
            maximum = float(lexical.max())
            lexical = lexical / maximum if maximum > 0 else lexical
            cosine = np.clip((dense_row + 1.0) / 2.0, 0.0, 1.0)
            scores = bm25_weight * lexical + (1.0 - bm25_weight) * cosine
        ranking = np.argsort(scores)[::-1]
        expected = disease_index[case.ground_truth_disease_id]
        rank = int(np.where(ranking == expected)[0][0]) + 1
        rows.append({
            "case_id": case.case_id,
            "is_emergency": case.is_emergency,
            "route": route,
            "ground_truth_disease_id": case.ground_truth_disease_id,
            "rank": rank,
            "hit@1": rank <= 1,
            "hit@5": rank <= 5,
        })
    return {
        "model": model_reference,
        "model_sha256": _model_hash(model_reference),
        "labeled_cases": len(rows),
        "recall@1": sum(row["hit@1"] for row in rows) / len(rows),
        "recall@5": sum(row["hit@5"] for row in rows) / len(rows),
        "emergency_recall@5": (
            sum(row["hit@5"] for row in rows if row["is_emergency"])
            / sum(row["is_emergency"] for row in rows)
            if any(row["is_emergency"] for row in rows)
            else None
        ),
        "per_case": rows,
    }


def _paired(before: dict, after: dict) -> dict:
    if not before["per_case"] or not after["per_case"]:
        return {"available": False}
    before_by_id = {row["case_id"]: row for row in before["per_case"]}
    after_by_id = {row["case_id"]: row for row in after["per_case"]}
    ids = sorted(before_by_id.keys() & after_by_id.keys())
    result = {"available": True, "paired_cases": len(ids), "metrics": {}}
    rng = np.random.default_rng(20260830)
    for metric in ("hit@1", "hit@5"):
        old = np.asarray([before_by_id[case_id][metric] for case_id in ids], dtype=bool)
        new = np.asarray([after_by_id[case_id][metric] for case_id in ids], dtype=bool)
        delta = new.astype(float) - old.astype(float)
        samples = delta[rng.integers(0, len(delta), size=(10_000, len(delta)))].mean(axis=1)
        interval = [float(np.quantile(samples, 0.025)), float(np.quantile(samples, 0.975))]
        result["metrics"][metric] = {
            "delta": float(delta.mean()),
            "paired_bootstrap_95": interval,
            "mcnemar_exact_p": _mcnemar_exact_pvalue(old, new),
            "gain_proven": interval[0] > 0 and _mcnemar_exact_pvalue(old, new) < 0.05,
        }
    return result


def _confusion(labels: list[bool], predictions: list[bool]) -> dict:
    tp = sum(label and prediction for label, prediction in zip(labels, predictions))
    fn = sum(label and not prediction for label, prediction in zip(labels, predictions))
    tn = sum(not label and not prediction for label, prediction in zip(labels, predictions))
    fp = sum(not label and prediction for label, prediction in zip(labels, predictions))
    positives, negatives = tp + fn, tn + fp
    return {
        "tp": tp, "fn": fn, "tn": tn, "fp": fp,
        "recall": tp / positives if positives else 0.0,
        "recall_wilson_95": _wilson_interval(tp, positives),
        "specificity": tn / negatives if negatives else 0.0,
        "specificity_wilson_95": _wilson_interval(tn, negatives),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--holdout", default="data/test_cases/clinical_holdout.json")
    parser.add_argument("--holdout-manifest", default="artifacts/evaluation/clinical_holdout_manifest.json")
    parser.add_argument("--incumbent", default="models/bge-m3-medical-v2-recovered-a050-fp16")
    parser.add_argument("--candidate", default="models/bge-m3-medical-v3-retrieval-a050-fp16")
    parser.add_argument("--guardrail-calibration", default="artifacts/evaluation/guardrail_v3_candidate_calibration.json")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--report", default="artifacts/evaluation/final_clinical_holdout_v3.json")
    parser.add_argument(
        "--acknowledge-final-evaluation",
        action="store_true",
        help="Required because this reveals the untouched final holdout",
    )
    args = parser.parse_args()
    if not args.acknowledge_final_evaluation:
        raise SystemExit(
            "Refusing to reveal final-holdout results without --acknowledge-final-evaluation"
        )
    holdout_info = validate_frozen_holdout(
        ROOT / args.holdout, ROOT / args.holdout_manifest
    )
    dataset = ClinicalHoldoutDataset.model_validate_json(
        (ROOT / args.holdout).read_text(encoding="utf-8")
    )
    incumbent = _retrieval_results(
        args.incumbent,
        dataset.cases,
        device=args.device,
        batch_size=args.batch_size,
        bm25_weight=float(get_setting("retrieval.bm25_weight")),
    )
    candidate = _retrieval_results(
        args.candidate,
        dataset.cases,
        device=args.device,
        batch_size=args.batch_size,
        bm25_weight=float(get_setting("retrieval.bm25_weight")),
    )
    paired = _paired(incumbent, candidate)

    engine = ClinicalGuardrailEngine(
        calibration_path=str(ROOT / args.guardrail_calibration),
        semantic_mode="advisory",
        require_semantic=True,
    )
    labels = [case.is_emergency for case in dataset.cases]
    hard = [engine.evaluate_emergency(case.query) is not None for case in dataset.cases]
    semantic = [
        engine.evaluate_semantic_candidate(case.query) is not None for case in dataset.cases
    ]
    combined = [hard_hit or semantic_hit for hard_hit, semantic_hit in zip(hard, semantic)]
    guardrail = {
        "deterministic_regex": _confusion(labels, hard),
        "semantic_at_frozen_threshold": _confusion(labels, semantic),
        "combined_candidate": _confusion(labels, combined),
    }
    final_guardrail = guardrail["combined_candidate"]
    no_retrieval_regression = (
        candidate["recall@5"] is None
        or incumbent["recall@5"] is None
        or candidate["recall@5"] >= incumbent["recall@5"]
    ) and (
        candidate.get("emergency_recall@5") is None
        or incumbent.get("emergency_recall@5") is None
        or candidate["emergency_recall@5"] >= incumbent["emergency_recall@5"]
    )
    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "evaluation_role": "untouched_final_holdout_one_shot",
        "holdout": holdout_info,
        "retrieval": {"incumbent": incumbent, "candidate": candidate, "paired": paired},
        "guardrail": guardrail,
        "release_decision": {
            "retrieval_no_regression": no_retrieval_regression,
            "semantic_auto_supported": (
                final_guardrail["fn"] == 0 and final_guardrail["specificity"] >= 0.90
            ),
            "clinical_gain_proven": any(
                row.get("gain_proven", False)
                for row in paired.get("metrics", {}).values()
            ),
            "warning": (
                "If this final evaluation fails, do not tune on these results and rerun the same "
                "holdout. Build a new versioned holdout before evaluating a changed candidate."
            ),
        },
    }
    output = ROOT / args.report
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["release_decision"], ensure_ascii=False, indent=2))
    print(f"Final report: {output}")


if __name__ == "__main__":
    main()
