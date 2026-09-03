import argparse
import hashlib
import sys
import json
import unicodedata
from pathlib import Path
from unidecode import unidecode
from rank_bm25 import BM25Okapi
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from knowledge.schema import DiseaseSchema, load_all_diseases
from retrieval.search_engine import HybridDiseaseSearcher, tokenize_vietnamese
from runtime_config import get_setting, resolve_project_path


def normalize_query(text: str) -> str:
    """Normalize Unicode/case/whitespace consistently for leakage checks."""
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def load_forbidden_benchmark_queries() -> set[str]:
    benchmark_files = [
        ROOT / "data" / "test_cases" / "benchmark_603_diseases.json",
        ROOT / "data" / "test_cases" / "generated_benchmark.json",
        ROOT / "data" / "test_cases" / "golden_cases.json",
        ROOT / "data" / "test_cases" / "common_49_validation.json",
        ROOT / "data" / "test_cases" / "clinical_holdout.json",
    ]
    forbidden: set[str] = set()
    for path in benchmark_files:
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        cases = payload if isinstance(payload, list) else payload.get("cases", [])
        loaded = 0
        for item in cases:
            if not isinstance(item, dict):
                continue
            queries = []
            if item.get("query"):
                queries.append(item["query"])
            for turn in item.get("dialogue", []):
                if isinstance(turn, dict) and turn.get("user_utterance"):
                    queries.append(turn["user_utterance"])
            for raw_query in queries:
                query = normalize_query(raw_query)
                forbidden.add(query)
                forbidden.add(normalize_query(unidecode(query)))
                loaded += 1
        print(f"-> Reserved benchmark: {path.name} ({loaded:,} cases)")
    return forbidden

def _mine_dense_negatives(
    all_diseases: list[DiseaseSchema],
    documents: list[str],
    forbidden: set[str],
    model_name: str,
) -> dict[tuple[str, str], list[str]]:
    from sentence_transformers import SentenceTransformer

    print(f"\n=== 4. ĐÀO HARD NEGATIVE TỪ LỖI/CẬN KỀ CỦA INCUMBENT: {model_name} ===")
    anchors = []
    owners = []
    for disease in all_diseases:
        for variant in disease.user_language_variants:
            clean = variant.strip()
            normalized = normalize_query(clean)
            if clean and normalized not in forbidden and normalize_query(unidecode(normalized)) not in forbidden:
                anchors.append(clean)
                owners.append(disease.name_vi)
    model = SentenceTransformer(model_name)
    model.max_seq_length = 768
    document_embeddings = model.encode(
        documents, batch_size=32, normalize_embeddings=True, show_progress_bar=True
    )
    query_embeddings = model.encode(
        anchors, batch_size=32, normalize_embeddings=True, show_progress_bar=True
    )
    scores = np.matmul(np.asarray(query_embeddings), np.asarray(document_embeddings).T)
    names = [disease.name_vi for disease in all_diseases]
    aliases_by_owner = {}
    for disease in all_diseases:
        aliases_by_owner[disease.name_vi] = {
            disease.name_vi.casefold().strip(),
            unidecode(disease.name_vi.casefold().strip()),
            *(alias.casefold().strip() for alias in disease.aliases),
            *(unidecode(alias.casefold().strip()) for alias in disease.aliases),
        }
    result = {}
    for row, owner, anchor in zip(scores, owners, anchors):
        excluded = aliases_by_owner[owner]
        negatives = []
        for index in np.argsort(row)[::-1]:
            candidate = names[int(index)]
            normalized_candidate = candidate.casefold().strip()
            if normalized_candidate not in excluded and unidecode(normalized_candidate) not in excluded:
                negatives.append(candidate)
            if len(negatives) == 2:
                break
        result[(owner, anchor)] = negatives
    print(f"-> Đã đào dense hard negatives cho {len(result):,} anchor không thuộc benchmark/holdout.")
    return result


def build_triplets(dst_path: Path, corpus_dir: Path, mining_model: str | None = None):
    print("=== 1. NẠP ĐÚNG KNOWLEDGE BASE ĐANG CHẠY PRODUCTION ===")
    all_diseases = load_all_diseases(corpus_dir)
    print(f"-> Corpus: {corpus_dir}")
    print(f"-> Tổng số bệnh nạp vào: {len(all_diseases)}")

    # Dựng tài liệu chuẩn duy nhất qua HybridDiseaseSearcher._prepare_document_text
    doc_map = {}
    disease_map = {}
    disease_names = []
    corpus_tokens = []
    
    for d in all_diseases:
        doc_text = HybridDiseaseSearcher._prepare_document_text(d)
        doc_map[d.name_vi] = doc_text
        disease_map[d.name_vi] = d
        disease_names.append(d.name_vi)
        corpus_tokens.append(tokenize_vietnamese(doc_text))
        
    print("\n=== 2. XÂY DỰNG CHỈ MỤC BM25 ĐỂ ĐÀO HARD NEGATIVES ===")
    bm25 = BM25Okapi(corpus_tokens)

    print("\n=== 3. NẠP BỘ TEST ĐỘC LẬP ĐỂ KIỂM SOÁT CHỐNG RÒ RỈ ===")
    benchmark_queries = load_forbidden_benchmark_queries()

    print(f"-> Đã ghi nhận {len(benchmark_queries)} câu hỏi thuộc tập Benchmark cấm.")

    dense_negative_map = (
        _mine_dense_negatives(all_diseases, list(doc_map.values()), benchmark_queries, mining_model)
        if mining_model else {}
    )

    print("\n=== 5. KHAI THÁC TRIPLET VỚI LEAVE-ONE-OUT & CHỐNG RÒ RỈ ===")
    triplets = []
    triplet_keys = set()
    leakage_count = 0
    duplicate_count = 0
    
    for d in all_diseases:
        excluded_names = {d.name_vi.lower().strip(), unidecode(d.name_vi.lower().strip())}
        for alias in d.aliases:
            excluded_names.add(alias.lower().strip())
            excluded_names.add(unidecode(alias.lower().strip()))

        for variant in d.user_language_variants:
            v_clean = variant.strip()
            if not v_clean:
                continue
                
            # Kiểm tra rò rỉ vào benchmark
            v_normalized = normalize_query(v_clean)
            if v_normalized in benchmark_queries or normalize_query(unidecode(v_normalized)) in benchmark_queries:
                leakage_count += 1
                continue # Bỏ ngay, tuyệt đối không cho vào train!

            # LEAVE-ONE-OUT: Positive document bỏ câu variant hiện tại ra để chống học vẹt chuỗi
            pos_doc_leave_one_out = HybridDiseaseSearcher._prepare_document_text(d, exclude_variant=v_clean)

            # Đào Hard Negative từ BM25
            q_tok = tokenize_vietnamese(v_clean)
            scores = bm25.get_scores(q_tok)
            top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
            
            # Prefer one or two mistakes/near-neighbours from the incumbent,
            # then fill with lexical BM25 negatives. This prevents another paid
            # run from merely repeating the old BM25-only objective.
            hard_neg_candidates = list(dense_negative_map.get((d.name_vi, v_clean), []))
            for idx in top_indices:
                cand_name = disease_names[idx]
                if (
                    cand_name not in hard_neg_candidates
                    and cand_name.lower().strip() not in excluded_names
                    and unidecode(cand_name.lower().strip()) not in excluded_names
                ):
                    hard_neg_candidates.append(cand_name)
                    if len(hard_neg_candidates) >= 2:
                        break
            hard_neg_candidates = hard_neg_candidates[:2]
                        
            if not hard_neg_candidates:
                continue

            # Thêm triplet chuẩn có dấu
            for neg_name in hard_neg_candidates:
                triplet = {
                    "anchor": v_clean,
                    "positive": pos_doc_leave_one_out,
                    "negative": doc_map[neg_name],
                    "target_disease": d.name_vi,
                    "confusable_disease": neg_name,
                }
                key = (triplet["anchor"], triplet["positive"], triplet["negative"])
                if key not in triplet_keys:
                    triplets.append(triplet)
                    triplet_keys.add(key)
                else:
                    duplicate_count += 1

            # Thêm bản không dấu (symmetric anchor trick)
            v_unidecode = unidecode(v_clean)
            if v_unidecode != v_clean:
                for neg_name in hard_neg_candidates:
                    triplet = {
                        "anchor": v_unidecode,
                        "positive": pos_doc_leave_one_out,
                        "negative": doc_map[neg_name],
                        "target_disease": d.name_vi,
                        "confusable_disease": neg_name,
                    }
                    key = (triplet["anchor"], triplet["positive"], triplet["negative"])
                    if key not in triplet_keys:
                        triplets.append(triplet)
                        triplet_keys.add(key)
                    else:
                        duplicate_count += 1

    # 5. Báo cáo kiểm tra rò rỉ bắt buộc
    print(f"\n================ [BÁO CÁO KIỂM SOÁT RÒ RỈ DỮ LIỆU] ================")
    print(f"Số câu hỏi huấn luyện bị trùng với Benchmark (đã chặn): {leakage_count}")
    print(f"Kiểm tra chéo lại toàn bộ tập Triplet đã sinh...")
    
    final_overlap = 0
    for t in triplets:
        anc = normalize_query(t["anchor"])
        if anc in benchmark_queries or normalize_query(unidecode(anc)) in benchmark_queries:
            final_overlap += 1
            
    print(f"[LEAKAGE CHECK] Số câu trùng giữa tập Train và Benchmark: {final_overlap}")
    assert final_overlap == 0, "NGUY HIỂM: Phát hiện rò rỉ dữ liệu giữa tập Train và Benchmark!"
    print("-> XÁC NHẬN: Tập Train và Benchmark độc lập 100% (0 câu trùng lặp)!")
    print(f"-> Exact duplicate triplets removed: {duplicate_count:,}")

    # 6. Lưu file
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    with open(dst_path, "w", encoding="utf-8") as f:
        for t in triplets:
            f.write(json.dumps(t, ensure_ascii=False) + "\n")

    digest = hashlib.sha256(dst_path.read_bytes()).hexdigest()
    manifest_path = dst_path.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps({
        "schema_version": 1,
        "corpus_dir": str(corpus_dir.resolve()),
        "rows": len(triplets),
        "diseases": len(all_diseases),
        "sha256": digest,
        "reserved_query_count": len(benchmark_queries),
        "exact_reserved_overlap": final_overlap,
        "duplicate_triplets_removed": duplicate_count,
        "hard_negative_sources": ["incumbent_dense", "bm25"] if mining_model else ["bm25"],
        "mining_model": mining_model,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n-> Đã lưu thành công {len(triplets):,} triplets vào: {dst_path}")
    print(f"-> Manifest: {manifest_path} | SHA256: {digest}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/finetune/task_triplets_633.jsonl")
    parser.add_argument(
        "--corpus-dir",
        default=str(get_setting("retrieval.diseases_dir")),
        help="Must match the production retrieval corpus",
    )
    parser.add_argument(
        "--mining-model",
        help="Current production model used to mine model-aware hard negatives",
    )
    args = parser.parse_args()
    out_file = resolve_project_path(args.output)
    corpus_dir = resolve_project_path(args.corpus_dir)
    build_triplets(out_file, corpus_dir, args.mining_model)
