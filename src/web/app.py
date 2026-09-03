"""FastAPI application for testing the production retrieval model locally.

This UI deliberately exercises retrieval and deterministic safety guardrails only.
It does not call an LLM, persist patient text, or expose the paused V3 candidate.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from threading import Lock
from time import perf_counter
from typing import Annotated, Any, Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.runtime_config import get_setting, resolve_project_path
from src.safety.guardrails import ClinicalGuardrailEngine


ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = Path(__file__).resolve().parent / "static"
PRODUCTION_RELEASE = "bge-m3-medical-v2-recovered-a050-fp16"


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2_000)
    top_k: int = Field(default=5, ge=1, le=10)
    mode: Literal["auto", "hybrid", "dense"] = "auto"


class RetrievalRuntime:
    """Own the lightweight guardrail and lazily load the large embedding model."""

    def __init__(self) -> None:
        self.guardrail = ClinicalGuardrailEngine(
            semantic_mode="off",
            require_semantic=False,
        )
        self._searcher: Any | None = None
        self._load_lock = Lock()
        self._load_error: str | None = None

    @property
    def model_loaded(self) -> bool:
        return self._searcher is not None

    def get_searcher(self) -> Any:
        if self._searcher is None:
            with self._load_lock:
                if self._searcher is None:
                    try:
                        from src.retrieval.search_engine import HybridDiseaseSearcher

                        self._searcher = HybridDiseaseSearcher()
                        self._load_error = None
                    except Exception as exc:  # surfaced as a safe API error below
                        self._load_error = str(exc)
                        raise
        return self._searcher

    def status(self) -> dict[str, Any]:
        diseases_dir = resolve_project_path(get_setting("retrieval.diseases_dir"))
        disease_files = len(list(diseases_dir.rglob("*.json"))) if diseases_dir.exists() else 0
        index_status = self._index_status(disease_files)
        return {
            "service": "ready",
            "model_loaded": self.model_loaded,
            "model_release": PRODUCTION_RELEASE,
            "model_path": str(get_setting("retrieval.embedding_model")),
            "knowledge_base_files": disease_files,
            "vector_index": index_status,
            "general_bm25_weight": float(get_setting("retrieval.bm25_weight")),
            "deterministic_guardrail": "hard_override",
            "semantic_guardrail": "advisory_not_used_by_tester",
            "v3_status": "paused_not_deployed",
            "stores_queries": False,
        }

    def _index_status(self, target_count: int) -> dict[str, Any]:
        try:
            if self._searcher is not None:
                collection = self._searcher.collection
            else:
                import chromadb

                from src.retrieval.search_engine import (
                    DEFAULT_DISEASES_DIR,
                    DEFAULT_EMBEDDING_MODEL,
                    DEFAULT_VECTOR_DB_PATH,
                    build_collection_name,
                )

                client = chromadb.PersistentClient(path=DEFAULT_VECTOR_DB_PATH)
                collection_name = build_collection_name(
                    DEFAULT_EMBEDDING_MODEL,
                    DEFAULT_DISEASES_DIR,
                )
                if collection_name not in client.list_collections():
                    return {"state": "missing", "count": 0, "target": target_count}
                collection = client.get_collection(collection_name)
            count = collection.count()
            metadata = collection.metadata or {}
            state = "ready" if count == target_count and metadata.get("index_state") == "ready" else "building"
            return {"state": state, "count": count, "target": target_count}
        except Exception as exc:
            return {"state": "unknown", "count": 0, "target": target_count, "error": str(exc)}

    def search(self, request: SearchRequest) -> dict[str, Any]:
        query = request.query.strip()
        alert = self.guardrail.evaluate_emergency(query)

        if request.mode == "auto":
            route = "emergency" if alert else "general"
            effective_mode = "dense" if alert else "hybrid"
        elif request.mode == "dense":
            route = "emergency"
            effective_mode = "dense"
        else:
            route = "general"
            effective_mode = "hybrid"

        started = perf_counter()
        searcher = self.get_searcher()
        results = searcher.search(query, top_k=request.top_k, route=route)
        latency_ms = round((perf_counter() - started) * 1_000, 1)

        candidates = []
        fit_labels = ("Rất phù hợp", "Phù hợp")
        for index, result in enumerate(results):
            schema = result["schema"]
            symptoms = [
                symptom.name_vi
                for symptom_group in schema.symptoms.values()
                for symptom in symptom_group
            ]
            candidates.append(
                {
                    "rank": index + 1,
                    "disease_id": result["disease_id"],
                    "name": result["name"],
                    "category": result["category"],
                    "urgency": result["urgency"],
                    "tier": schema.tier,
                    "fit_label": fit_labels[index] if index < len(fit_labels) else "Có thể",
                    "description": schema.description,
                    "symptoms": symptoms[:6],
                    "score": result["score"],
                    "dense_score": result.get("dense_score"),
                    "bm25_score": result.get("bm25_score"),
                    "raw_bm25": result["raw_bm25"],
                }
            )

        emergency = None
        if alert:
            emergency = {
                "is_emergency": True,
                "tier": alert.get("tier"),
                "rule_id": alert.get("rule_id"),
                "rule_name": alert.get("rule_name"),
                "red_flag": alert.get("red_flag"),
                "message": "Có dấu hiệu nguy hiểm. Hãy gọi 115 hoặc đến Khoa Cấp cứu gần nhất ngay.",
            }

        return {
            "query": query,
            "requested_mode": request.mode,
            "effective_mode": effective_mode,
            "route_reason": "deterministic_emergency_rule" if alert and request.mode == "auto" else "user_selection" if request.mode != "auto" else "routine_query",
            "latency_ms": latency_ms,
            "model_release": PRODUCTION_RELEASE,
            "emergency": emergency,
            "candidates": candidates,
            "disclaimer": "Kết quả là gợi ý truy hồi để tham khảo, không phải xác nhận y khoa. Cần được bác sĩ kiểm tra trực tiếp.",
        }


@lru_cache(maxsize=1)
def get_runtime() -> RetrievalRuntime:
    return RetrievalRuntime()


app = FastAPI(
    title="Phòng khám YG Retrieval Tester",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
)
app.mount("/assets", StaticFiles(directory=STATIC_DIR), name="assets")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/status")
def api_status(runtime: Annotated[RetrievalRuntime, Depends(get_runtime)]) -> dict[str, Any]:
    return runtime.status()


@app.post("/api/search")
def api_search(
    request: SearchRequest,
    runtime: Annotated[RetrievalRuntime, Depends(get_runtime)],
) -> dict[str, Any]:
    try:
        return runtime.search(request)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Không thể nạp model retrieval. Kiểm tra model production, dependencies "
                f"và dung lượng máy. Chi tiết: {exc}"
            ),
        ) from exc
