import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from scripts.calibrate_guardrail_threshold import load_labeled_cases
from scripts.compare_embeddings import _is_expected, _matches, enforce_quality_gate
from src.safety.guardrails import ClinicalGuardrailEngine


ROOT = Path(__file__).resolve().parent.parent


def test_embedding_metric_requires_exact_canonical_name():
    assert _matches(["Béo phì"], "Béo phì")
    assert not _matches(["Béo phì"], "Béo phì độ 1")
    assert not _matches(["Bệnh trĩ"], "Bệnh trĩ huyết khối")


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
    assert Path(engine.model_path) == ROOT / "models" / "bge-m3-medical-v2"


def test_guardrail_rejects_unverified_runtime_config(tmp_path):
    report = tmp_path / "guardrail_calibration.json"
    report.write_text(
        json.dumps({
            "model": "models/bge-m3-medical-v2",
            "selected_threshold": 0.57,
            "runtime_verified": False,
        }),
        encoding="utf-8",
    )
    with pytest.raises(RuntimeError, match="has not passed production wiring verification"):
        ClinicalGuardrailEngine(calibration_path=str(report))
