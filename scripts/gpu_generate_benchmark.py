"""
Generate a large retrieval benchmark of colloquial patient queries, on GPU via Ollama.

The 19-case hand-written benchmark is too small to distinguish architectures
(one flipped emergency case moves Safety@1 by 20 points). This scales it up by
generating many lay-language phrasings for each ALREADY-VERIFIED disease.

Scope discipline: the model only rephrases *how a patient talks*. It never
invents clinical content — diseases, symptoms and red flags stay exactly as
authored in data/diseases/.

Vocabulary-leak guard: queries generated from a disease document tend to reuse
that document's wording, which makes retrieval look far better than it is. Two
defenses:
  1. user_language_variants are withheld from the prompt (they are indexed
     verbatim, so feeding them back would be a direct leak).
  2. Every generated query is scored for word-trigram overlap against the
     indexed document; high-overlap queries are dropped.

Results are written incrementally, so an ephemeral GPU box dying mid-run
does not lose completed work.

Usage:
    python scripts/gpu_generate_benchmark.py --model qwen2.5:7b-instruct --per-disease 20
"""
import argparse
import io
import json
import re
import sys
import time
from pathlib import Path

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import tokenize_vietnamese

OLLAMA_URL = "http://localhost:11434/api/generate"

PROMPT = """Bạn đang giúp xây dựng bộ dữ liệu KIỂM THỬ cho một hệ thống phân loại y tế tiếng Việt.

Nhiệm vụ: viết {n} câu MÔ TẢ TRIỆU CHỨNG khác nhau, giống hệt cách một người bệnh Việt Nam thật sự nhắn tin hỏi, ứng với bệnh dưới đây.

BỆNH: {name}
TRIỆU CHỨNG THAM KHẢO: {symptoms}

QUY TẮC BẮT BUỘC:
1. Viết bằng NGÔN NGỮ DÂN DÃ. TUYỆT ĐỐI KHÔNG dùng thuật ngữ y khoa, không nhắc tên bệnh.
2. Không chép lại nguyên văn danh sách triệu chứng ở trên — phải diễn đạt lại theo lời người thường.
3. Đa dạng hoá, mỗi câu một kiểu:
   - vài câu có dấu đầy đủ, vài câu KHÔNG DẤU (kiểu gõ vội)
   - vài câu viết tắt, sai chính tả nhẹ
   - vài câu giọng miền Bắc, miền Trung, miền Nam
   - vài câu do NGƯỜI NHÀ hỏi hộ ("mẹ tôi bị...", "con tôi kêu...")
   - vài câu mô tả MƠ HỒ, thiếu thông tin (như người bệnh thật hay kể)
   - độ dài khác nhau: có câu rất ngắn, có câu kể dài dòng
4. Chỉ trả về JSON, không giải thích gì thêm.

ĐỊNH DẠNG JSON:
{{"queries": ["câu 1", "câu 2", "..."]}}"""


def word_trigrams(text: str) -> set:
    words = tokenize_vietnamese(text)
    return {tuple(words[i:i + 3]) for i in range(len(words) - 2)}


def leak_ratio(query: str, doc_text: str) -> float:
    """Fraction of the query's trigrams that appear verbatim in the indexed doc."""
    q = word_trigrams(query)
    if not q:
        return 0.0
    return len(q & word_trigrams(doc_text)) / len(q)


def call_ollama(model: str, prompt: str, timeout: int = 300) -> str:
    resp = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.9, "top_p": 0.95},
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json().get("response", "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="qwen2.5:7b-instruct")
    ap.add_argument("--per-disease", type=int, default=20)
    ap.add_argument("--leak-threshold", type=float, default=0.34,
                    help="Drop queries whose trigram overlap with the indexed doc exceeds this.")
    ap.add_argument("--out", default="data/test_cases/generated_benchmark.json")
    args = ap.parse_args()

    diseases = load_all_diseases(ROOT / "data" / "diseases")
    print(f"Loaded {len(diseases)} verified diseases")
    print(f"Model: {args.model} | target {args.per_disease}/disease\n")

    # Rebuild the same document text the retriever indexes, for leak scoring.
    from retrieval.search_engine import HybridDiseaseSearcher
    searcher = HybridDiseaseSearcher(
        diseases_dir=str(ROOT / "data" / "diseases"),
        db_path=str(ROOT / "data" / "embeddings"),
    )
    doc_texts = {d.name_vi: searcher._prepare_document_text(d) for d in diseases}

    out_path = ROOT / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cases = []
    stats = {"generated": 0, "dropped_leak": 0, "dropped_short": 0}
    t_start = time.time()

    for i, d in enumerate(diseases, 1):
        symptoms = []
        for sym_list in d.symptoms.values():
            symptoms.extend(s.name_vi for s in sym_list)

        prompt = PROMPT.format(
            n=args.per_disease,
            name=d.name_vi,
            symptoms=", ".join(symptoms[:12]),
        )

        try:
            raw = call_ollama(args.model, prompt)
            queries = json.loads(raw).get("queries", [])
        except Exception as e:
            print(f"[{i}/{len(diseases)}] {d.name_vi}: FAILED ({type(e).__name__}: {e})")
            continue

        kept = 0
        for q in queries:
            if not isinstance(q, str):
                continue
            q = re.sub(r"\s+", " ", q).strip()
            stats["generated"] += 1

            if len(q.split()) < 4:
                stats["dropped_short"] += 1
                continue

            ratio = leak_ratio(q, doc_texts[d.name_vi])
            if ratio > args.leak_threshold:
                stats["dropped_leak"] += 1
                continue

            cases.append({
                "query": q,
                "expected_top": d.name_vi,
                "expected_in_top3": [d.name_vi],
                "category": d.category,
                "is_emergency": d.urgency.value == "emergency",
                "leak_ratio": round(ratio, 3),
            })
            kept += 1

        # Save after every disease: the GPU box is ephemeral.
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"cases": cases, "stats": stats, "model": args.model},
                      f, ensure_ascii=False, indent=2)

        print(f"[{i}/{len(diseases)}] {d.name_vi}: kept {kept}/{len(queries)} "
              f"(total {len(cases)})")

    elapsed = time.time() - t_start
    print(f"\n{'='*55}")
    print(f"Kept {len(cases)} cases from {stats['generated']} generated")
    print(f"  dropped (vocabulary leak): {stats['dropped_leak']}")
    print(f"  dropped (too short):       {stats['dropped_short']}")
    emg = sum(1 for c in cases if c["is_emergency"])
    print(f"Emergency cases: {emg}")
    print(f"Elapsed: {elapsed/60:.1f} min")
    print(f"Saved -> {out_path}")
    print("\n!! scp this file back before the GPU box dies !!")


if __name__ == "__main__":
    main()
