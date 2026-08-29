import hashlib
import os
import re
import io
import sys
import uuid
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

import numpy as np
import chromadb
from chromadb.utils import embedding_functions
from rank_bm25 import BM25Okapi
from unidecode import unidecode

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from knowledge.schema import DiseaseSchema, load_all_diseases


def tokenize_vietnamese(text: str) -> List[str]:
    """
    Tokenize and normalize Vietnamese text for BM25 search.
    - Strips punctuation and symbols.
    - Preserves term frequency.
    - Emits both accented and unaccented tokens for each word.
    """
    if not text:
        return []
    
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    words = [w for w in cleaned.split() if w]
    
    tokens = []
    for w in words:
        tokens.append(w)
        u = unidecode(w)
        if u and u != w:
            tokens.append(u)
            
    return tokens


# Embedding model registry.
# BGE-M3 is markedly stronger on Vietnamese but is ~2.3GB and 1024-dim;
# MiniLM stays available as a lightweight CPU-friendly fallback.
EMBEDDING_MODELS = {
    "bge-m3": "BAAI/bge-m3",
    "minilm": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
}
DEFAULT_EMBEDDING_MODEL = os.getenv("BOTMED_EMBEDDING_MODEL", "minilm")


def resolve_device(device: Optional[str] = None) -> str:
    """Pick the compute device: explicit override, else CUDA when usable, else CPU."""
    if device:
        return device
    env_device = os.getenv("BOTMED_DEVICE")
    if env_device:
        return env_device
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass
    return "cpu"


class HybridDiseaseSearcher:
    """
    Production-grade Hybrid Disease Searcher:
    - BM25 for keyword & exact clinical symptom matching (with diacritics & non-diacritics support).
    - ChromaDB (SentenceTransformer: BGE-M3 or MiniLM) for semantic representation.
    - Normalized Score Fusion (alpha = 0.75 BM25 + 0.25 Vector Cosine Similarity).
    """
    def __init__(
        self,
        diseases_dir: str = "data/diseases",
        db_path: str = "data/embeddings",
        rebuild_index: bool = False,
        embedding_model: str = DEFAULT_EMBEDDING_MODEL,
        device: Optional[str] = None
    ):
        self.diseases_dir = Path(diseases_dir)
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)

        self.embedding_model_key = embedding_model
        self.model_name = EMBEDDING_MODELS.get(embedding_model, embedding_model)
        self.device = resolve_device(device)

        # Load all validated diseases
        self.diseases = load_all_diseases(self.diseases_dir)

        # Unique mapping by disease ID and name
        self.disease_map: Dict[str, DiseaseSchema] = {}
        for d in self.diseases:
            uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, d.name_vi.lower().strip()))
            self.disease_map[uid] = d

        # Initialize ChromaDB Vector Store
        self.chroma_client = chromadb.PersistentClient(path=str(self.db_path))
        self.emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=self.model_name,
            device=self.device,
            normalize_embeddings=True,
        )
        # Each model has its own collection: embedding dims differ (BGE-M3 1024 vs
        # MiniLM 384), so sharing one collection would raise a dimension mismatch.
        # Cosine space matches the normalized embeddings both models produce.
        # Chroma caps collection names at 63 chars, which a model given as a
        # filesystem path blows past; keep a readable prefix and disambiguate
        # with a hash of the full key.
        safe_key = re.sub(r"[^a-z0-9_-]", "_", embedding_model.lower())
        if len(safe_key) > 24:
            digest = hashlib.md5(embedding_model.encode()).hexdigest()[:8]
            safe_key = f"{safe_key[:24].strip('_')}_{digest}"
        self.collection = self.chroma_client.get_or_create_collection(
            name=f"disease_collection_{safe_key}",
            embedding_function=self.emb_fn,
            metadata={"hnsw:space": "cosine"},
        )
        
        # BM25 storage
        self.bm25: Optional[BM25Okapi] = None
        self.doc_ids: List[str] = []
        
        # Build index
        self._build_indexes(force_rebuild=rebuild_index)

    @staticmethod
    def _prepare_document_text(disease: DiseaseSchema, exclude_variant: Optional[str] = None) -> str:
        """
        Build a concise, high-density text representation for vector embedding and BM25.
        If exclude_variant is given, leaves that variant out (leave-one-out training).
        """
        parts = []
        
        # Primary identifiers
        parts.append(f"Tên bệnh: {disease.name_vi} ({disease.name_en})")
        if disease.aliases:
            parts.append(f"Tên gọi khác: {', '.join(disease.aliases)}")
            
        # User natural language expressions (leave-one-out support)
        variants = disease.user_language_variants or []
        if exclude_variant:
            ex_low = exclude_variant.strip().lower()
            ex_u = unidecode(ex_low)
            variants = [v for v in variants if v.strip().lower() != ex_low and unidecode(v.strip().lower()) != ex_u]
            
        if variants:
            parts.append(f"Cách người bệnh mô tả: {' | '.join(variants)}")
            
        # Red flags
        if disease.red_flags:
            parts.append(f"Dấu hiệu cấp cứu nguy hiểm: {' | '.join(disease.red_flags)}")
            
        # Symptoms by frequency
        all_syms = []
        for freq, sym_list in disease.symptoms.items():
            for s in sym_list:
                all_syms.append(s.name_vi)
        if all_syms:
            parts.append(f"Triệu chứng: {', '.join(all_syms)}")
            
        # Description
        if disease.description:
            parts.append(f"Mô tả: {disease.description}")
        if disease.risk_factors:
            parts.append(f"Yếu tố nguy cơ: {', '.join(disease.risk_factors)}")
            
        return " \n".join(parts)

    def _build_indexes(self, force_rebuild: bool = False):
        """Build or refresh ChromaDB and BM25 indexes."""
        docs = []
        metadatas = []
        ids = []
        tokenized_corpus = []
        self.doc_ids = []
        
        for disease in self.diseases:
            uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, disease.name_vi.lower().strip()))
            doc_text = self._prepare_document_text(disease)
            
            docs.append(doc_text)
            metadatas.append({
                "name_vi": disease.name_vi,
                "name_en": disease.name_en,
                "category": disease.category,
                "urgency": disease.urgency.value,
            })
            ids.append(uid)
            self.doc_ids.append(uid)
            
            # Tokenize for BM25
            tokens = tokenize_vietnamese(doc_text)
            tokenized_corpus.append(tokens)
            
        # Re-index ChromaDB if count differs or force rebuild
        existing_count = self.collection.count()
        if force_rebuild or existing_count != len(docs):
            if existing_count > 0:
                existing_ids = self.collection.get()["ids"]
                if existing_ids:
                    self.collection.delete(ids=existing_ids)
            if docs:
                self.collection.add(documents=docs, metadatas=metadatas, ids=ids)
                
        # Build BM25
        if tokenized_corpus:
            self.bm25 = BM25Okapi(tokenized_corpus)

    def get_disease_by_id(self, doc_id: str) -> Optional[DiseaseSchema]:
        return self.disease_map.get(doc_id)

    def search(
        self,
        query: str,
        top_k: int = 5,
        bm25_weight: float = 0.75
    ) -> List[Dict[str, Any]]:
        """
        Hybrid Search combining:
        1. BM25 (Keyword + Diacritics matching)
        2. ChromaDB (SentenceTransformer semantic matching)
        3. Normalized Score Fusion
        """
        if not self.diseases or not query.strip():
            return []
            
        clean_query = query.strip()
        n_docs = len(self.diseases)
        
        # --- 1. BM25 Scoring ---
        query_tokens = tokenize_vietnamese(clean_query)
        bm25_scores = np.zeros(n_docs)
        if self.bm25 and query_tokens:
            bm25_scores = self.bm25.get_scores(query_tokens)
            
        max_bm25 = np.max(bm25_scores) if np.max(bm25_scores) > 0 else 1.0
        norm_bm25 = bm25_scores / max_bm25 if np.max(bm25_scores) > 0 else bm25_scores

        # --- 2. Vector Scoring ---
        vector_results = self.collection.query(
            query_texts=[clean_query],
            n_results=n_docs
        )
        
        vec_dist_map = {}
        if vector_results and vector_results.get("ids") and vector_results["ids"][0]:
            distances = vector_results["distances"][0] if vector_results.get("distances") else [0.0] * n_docs
            for doc_id, dist in zip(vector_results["ids"][0], distances):
                vec_dist_map[doc_id] = dist
                
        max_dist = max(vec_dist_map.values()) if vec_dist_map and max(vec_dist_map.values()) > 0 else 1.0

        # --- 3. Score Fusion ---
        candidates = []
        for idx, doc_id in enumerate(self.doc_ids):
            b_score = float(norm_bm25[idx])
            
            # Convert distance to similarity
            dist = vec_dist_map.get(doc_id, max_dist)
            v_score = max(0.0, 1.0 - (dist / (max_dist + 1e-6)))
            
            # If query had zero BM25 matches, rely purely on vector search
            if np.max(bm25_scores) == 0:
                final_score = v_score
            else:
                final_score = (bm25_weight * b_score) + ((1.0 - bm25_weight) * v_score)
                
            disease = self.get_disease_by_id(doc_id)
            if disease:
                candidates.append({
                    "disease_id": disease.disease_id,
                    "doc_id": doc_id,
                    "name": disease.name_vi,
                    "category": disease.category,
                    "urgency": disease.urgency.value,
                    "score": round(float(final_score), 5),
                    "raw_bm25": round(float(bm25_scores[idx]), 2),
                    "schema": disease
                })
                
        # Sort descending by final score
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates[:top_k]
