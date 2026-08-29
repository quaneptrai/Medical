import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
import torch

from scripts.calibrate_guardrail_threshold import load_labeled_cases
from scripts.blend_embedding_models import reconstruct_target_tensor
from scripts.compare_embeddings import (
    _is_expected,
    _matches,
    _mcnemar_exact_pvalue,
    enforce_quality_gate,
)
from src.safety.guardrails import ClinicalGuardrailEngine
from src.retrieval.search_engine import (
    FALLBACK_EMBEDDING_MODEL,
    FALLBACK_GENERAL_BM25_WEIGHT,
    HybridDiseaseSearcher,
)
from src.llm.triage_bot import TriageBot
from src.conversation.state import ConversationState


ROOT = Path(__file__).resolve().parent.parent


def test_embedding_metric_requires_exact_canonical_name():
    assert _matches(["Béo phì"], "Béo phì")
    assert not _matches(["Béo phì"], "Béo phì độ 1")
    assert not _matches(["Bệnh trĩ"], "Bệnh trĩ huyết khối")


def test_target_blend_can_be_reconstructed_from_known_linear_blend():
    base = np.asarray([1.0, -2.0], dtype=np.float32)
    tuned = np.asarray([3.0, 2.0], dtype=np.float32)
    source = base + 0.07 * (tuned - base)
    recovered = reconstruct_target_tensor(
        torch.from_numpy(base),
        torch.from_numpy(source),
        source_alpha=0.07,
        target_alpha=0.5,
    )
    expected = base + 0.5 * (tuned - base)
    assert np.allclose(recovered.numpy(), expected, atol=1e-6)


def test_production_retrieval_defaults_to_evaluated_candidate():
    assert FALLBACK_GENERAL_BM25_WEIGHT == pytest.approx(0.15)
    assert FALLBACK_EMBEDDING_MODEL.endswith(
        "models\\bge-m3-medical-v2-recovered-a050-fp16"
    ) or FALLBACK_EMBEDDING_MODEL == "bge-m3"


def test_embedding_metric_prefers_disease_id():
    disease = SimpleNamespace(disease_id="EXP_042", name_vi="Tên có thể thay đổi")
    assert _is_expected({"disease_id": "EXP_042", "expected_disease": "khác"}, disease)
    assert not _is_expected({"disease_id": "EXP_043", "expected_disease": "Tên có thể thay đổi"}, disease)


def test_quality_gate_rejects_any_emergency_recall_regression():
    common = {"recall@1": 0.5, "recall@5": 0.8, "emergency_cases": 34}
    baseline = {
        "generated_colloquial": {
            "dense": {**common, "emergency_recall@5": 1.0},
            "hybrid": {**common, "emergency_recall@5": 0.5},
        }
    }
    candidate = {
        "generated_colloquial": {
            "dense": {**common, "emergency_recall@5": 33 / 34},
            "hybrid": {**common, "emergency_recall@5": 0.5},
        }
    }
    with pytest.raises(SystemExit, match=r"dense\.emergency_recall@5"):
        enforce_quality_gate({"base": baseline, "candidate": candidate}, tolerance=0.005)


def test_exact_mcnemar_uses_paired_disagreements():
    baseline = np.asarray([True, True, False, False])
    candidate = np.asarray([True, False, True, True])
    assert _mcnemar_exact_pvalue(baseline, candidate) == 1.0


def test_calibration_dataset_meets_minimum_size():
    cases = load_labeled_cases(ROOT / "data" / "test_cases" / "generated_benchmark.json")
    emergency_count = sum(row["is_emergency"] for row in cases)
    assert emergency_count >= 30
    assert len(cases) - emergency_count >= 100


def test_guardrail_default_consumes_runtime_config(tmp_path, monkeypatch):
    report = tmp_path / "guardrail_calibration.json"
    report.write_text(
        json.dumps({
            "model": "models/bge-m3-medical-v2",
            "selected_threshold": 0.57,
            "runtime_verified": True,
        }),
        encoding="utf-8",
    )

    def fake_init(self, model_path, require_semantic=True):
        self.embed_model = object()
        self.anchor_embeddings = object()

    monkeypatch.setattr(ClinicalGuardrailEngine, "_init_embedding_matcher", fake_init)
    engine = ClinicalGuardrailEngine(calibration_path=str(report))
    assert engine.semantic_threshold == 0.57
    assert engine.semantic_mode == "advisory"
    assert Path(engine.model_path) == ROOT / "models" / "bge-m3-medical-v2"


def test_guardrail_rejects_unverified_runtime_config(tmp_path):
    report = tmp_path / "guardrail_calibration.json"
    report.write_text(
        json.dumps({
            "model": "models/bge-m3-medical-v2",
            "selected_threshold": 0.57,
            "runtime_verified": False,
            "deployment_approved": True,
        }),
        encoding="utf-8",
    )
    with pytest.raises(RuntimeError, match="has not passed production wiring verification"):
        ClinicalGuardrailEngine(calibration_path=str(report), semantic_mode="auto")


def test_guardrail_rejects_auto_semantic_without_deployment_approval(tmp_path):
    report = tmp_path / "guardrail_calibration.json"
    report.write_text(json.dumps({
        "model": "models/bge-m3-medical-v2",
        "selected_threshold": 0.58,
        "runtime_verified": True,
        "deployment_approved": False,
    }), encoding="utf-8")
    with pytest.raises(RuntimeError, match="deployment-approved"):
        ClinicalGuardrailEngine(calibration_path=str(report), semantic_mode="auto")


def test_semantic_advisory_does_not_become_hard_emergency():
    class FakeModel:
        def encode(self, *_args, **_kwargs):
            return np.asarray([[1.0, 0.0]])

    engine = ClinicalGuardrailEngine.__new__(ClinicalGuardrailEngine)
    engine.semantic_mode = "advisory"
    engine.semantic_threshold = 0.5
    engine.embed_model = FakeModel()
    engine.anchor_embeddings = np.asarray([[1.0, 0.0]])
    engine.semantic_anchors = [{"category": "cardiology", "name": "Test", "text": "test"}]
    engine.emergency_rules = []
    engine._normalize = lambda value: value

    advisory = engine.evaluate_semantic_candidate("routine text")
    assert advisory["requires_confirmation"] is True
    assert advisory["is_emergency"] is False
    assert engine.evaluate_emergency("routine text") is None


def test_semantic_inference_errors_are_not_silenced():
    class BrokenModel:
        def encode(self, *_args, **_kwargs):
            raise ValueError("broken encoder")

    engine = ClinicalGuardrailEngine.__new__(ClinicalGuardrailEngine)
    engine.semantic_mode = "advisory"
    engine.embed_model = BrokenModel()
    engine.anchor_embeddings = np.asarray([[1.0]])
    with pytest.raises(RuntimeError, match="Semantic guardrail inference failed"):
        engine.evaluate_semantic_candidate("test")


def test_emergency_search_route_is_explicitly_dense_only(monkeypatch):
    searcher = HybridDiseaseSearcher.__new__(HybridDiseaseSearcher)
    captured = {}

    def fake_search(query, top_k=5, bm25_weight=None, route="general"):
        captured.update(query=query, top_k=top_k, bm25_weight=bm25_weight, route=route)
        return []

    monkeypatch.setattr(searcher, "search", fake_search)
    searcher.search_emergency("đau ngực", top_k=7)
    assert captured == {
        "query": "đau ngực",
        "top_k": 7,
        "bm25_weight": None,
        "route": "emergency",
    }


@pytest.mark.parametrize("hard_alert,expected_route", [(True, "emergency"), (False, "general")])
def test_triage_routes_only_confirmed_rule_hits_to_dense(monkeypatch, hard_alert, expected_route):
    bot = TriageBot.__new__(TriageBot)
    bot.provider = "ollama"
    bot.gemini_client = None
    bot.openai_client = object()
    alert = {
        "is_emergency": True,
        "red_flag": "confirmed red flag",
        "emergency_reply": "call 115",
    } if hard_alert else None
    bot.guardrail_engine = SimpleNamespace(evaluate_emergency=lambda *_args: alert)
    captured = {}

    class FakeSearcher:
        diseases = []

        def search(self, query, top_k=3, route="general"):
            captured["route"] = route
            return []

    bot.search_engine = FakeSearcher()
    monkeypatch.setattr(
        bot,
        "_call_ollama",
        lambda *_args: json.dumps({
            "new_symptoms": [],
            "new_red_flags": [],
            "stage": "follow_up",
            "bot_reply": "follow up",
        }),
    )
    _reply, state = bot.process_turn("test message", ConversationState(session_id="route-test"))
    assert captured["route"] == expected_route
    assert (state.diagnostic_stage == "emergency") is hard_alert
