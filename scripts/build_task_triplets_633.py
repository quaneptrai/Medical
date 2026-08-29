import sys
import json
import unicodedata
from pathlib import Path
from unidecode import unidecode
from rank_bm25 import BM25Okapi

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from knowledge.schema import DiseaseSchema, load_all_diseases
from retrieval.search_engine import HybridDiseaseSearcher, tokenize_vietnamese


def normalize_query(text: str) -> str:
    """Normalize Unicode/case/whitespace consistently for leakage checks."""
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def load_forbidden_benchmark_queries() -> set[str]:
    benchmark_files = [
        ROOT / "data" / "test_cases" / "benchmark_603_diseases.json",
        ROOT / "data" / "test_cases" / "generated_benchmark.json",
        ROOT / "data" / "test_cases" / "golden_cases.json",
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
            if not isinstance(item, dict) or not item.get("query"):
                continue
            query = normalize_query(item["query"])
            forbidden.add(query)
            forbidden.add(normalize_query(unidecode(query)))
            loaded += 1
        print(f"-> Reserved benchmark: {path.name} ({loaded:,} cases)")
    return forbidden

def build_triplets(dst_path: Path):
    print("=== 1. NẠP KNOWLEDGE BASE (TIER 1 + TIER 2) ===")
    t1_diseases = load_all_diseases(ROOT / "data" / "diseases")
    t2_diseases = load_all_diseases(ROOT / "data" / "diseases_expanded")
    
    # Gộp và khử trùng lặp theo tên bệnh tiếng Việt
    all_diseases = []
    seen_names = set()
    for d in t1_diseases + t2_diseases:
        n_low = d.name_vi.lower().strip()
        if n_low not in seen_names:
            all_diseases.append(d)
            seen_names.add(n_low)
            
    print(f"-> Tổng số bệnh nạp vào: {len(all_diseases)} bệnh ({len(t1_diseases)} Tier 1, {len(all_diseases)-len(t1_diseases)} Tier 2)")

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

    print("\n=== 4. KHAI THÁC TRIPLET VỚI LEAVE-ONE-OUT & CHỐNG RÒ RỈ ===")
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
            
            hard_neg_candidates = []
            for idx in top_indices:
                cand_name = disease_names[idx]
                if cand_name.lower().strip() not in excluded_names and unidecode(cand_name.lower().strip()) not in excluded_names:
                    hard_neg_candidates.append(cand_name)
                    if len(hard_neg_candidates) >= 2:
                        break
                        
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
            
    print(f"\n-> Đã lưu thành công {len(triplets):,} triplets vào: {dst_path}")

if __name__ == "__main__":
    out_file = ROOT / "data" / "finetune" / "task_triplets_633.jsonl"
    build_triplets(out_file)
