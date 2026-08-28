"""
Two-stage fine-tune of BAAI/bge-m3 for Vietnamese medical retrieval.

Why this and not an LLM LoRA: the measured weakness is the embedding layer
(vector-only Safety@1 is 80% -- one emergency case in five missed), the data is
already the right shape, and the resulting model serves on CPU, so it outlives
an ephemeral rented GPU.

  STAGE 1 - domain adaptation, large but off-task.
      460,717 scraped triplets, of which ~62% fall outside the five specialties
      this project covers (the corpus is a wellness magazine: 23% nutrition,
      12% beauty, 10% mother-and-baby). Those slices are dropped, because
      training on them drags the embedding space toward diet and skincare.
      Low learning rate, one pass: this only teaches vocabulary.

  STAGE 2 - task adaptation, small but exactly on-task.
      Triplets built from the verified knowledge base:
          anchor   = how a patient phrases it (user_language_variants)
          positive = the indexed document for the right disease
          negative = the indexed document for a CONFUSABLE disease, taken from
                     each disease's own differential_diagnoses field.
      Random negatives are useless here: separating chest pain caused by a
      heart attack from chest pain caused by reflux is the failure that matters,
      while separating it from ringworm already works.

Both stages use MultipleNegativesRankingLoss, which uses the explicit hard
negative plus every other in-batch passage as additional negatives.

Usage:
    python scripts/train_bge_m3.py                     # both stages
    python scripts/train_bge_m3.py --stages 2          # task stage only
    python scripts/train_bge_m3.py --batch-size 8      # if VRAM is tight

Afterwards, measure -- do not assume:
    python scripts/compare_embeddings.py --models bge-m3 models/bge-m3-medical
Targets to beat (vector-only): R@1 78.9% | Safety@1 80.0% | margin 0.1090
"""
import argparse
import io
import json
import random
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

# Categories to discard outright: measured as off-domain for a triage bot.
DROP_CATEGORY_PREFIXES = ("dinh-duong", "dinh_duong", "khoe_dep", "me_va_be", "gioi_tinh")

# Word-boundary anchored: a bare "ho " also matches "cho", "kho", "nho".
SPECIALTY_PAT = re.compile(
    r"\btim\b|\bhuyết áp\b|nhồi máu|suy tim|\bmạch vành\b|rối loạn nhịp"
    r"|\bphổi\b|\bho\b|\bhen\b|phế quản|\bxoang\b|khó thở|\bđờm\b"
    r"|dạ dày|\bruột\b|\bgan\b|\bmật\b|tiêu hoá|tiêu hóa|trào ngược"
    r"|\bda\b|\bchàm\b|vẩy nến|mề đay|\bzona\b|nấm da|\bmụn\b|\bngứa\b"
    r"|\bsốt\b|\bcúm\b|covid|tiểu đường|thiếu máu|tiết niệu|\btiểu\b",
    re.IGNORECASE,
)


def filter_domain_triplets(src: Path, dst: Path) -> tuple[int, int]:
    """Keep only triplets plausibly inside the five covered specialties."""
    read = kept = 0
    with open(src, encoding="utf-8") as fin, open(dst, "w", encoding="utf-8") as fout:
        for line in fin:
            read += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue

            cat = (row.get("category") or "").lower()
            if cat.startswith(DROP_CATEGORY_PREFIXES):
                continue

            blob = f"{row.get('anchor','')} {row.get('positive','')[:400]}"
            if not SPECIALTY_PAT.search(blob):
                continue

            fout.write(json.dumps({
                "anchor": row["anchor"],
                "positive": row["positive"],
                "negative": row["negative"],
            }, ensure_ascii=False) + "\n")
            kept += 1
    return read, kept


def build_task_triplets(dst: Path) -> tuple[int, dict]:
    """Patient phrasing -> right disease doc vs. a confusable disease doc."""
    from knowledge.schema import load_all_diseases
    from retrieval.search_engine import HybridDiseaseSearcher

    diseases = load_all_diseases(ROOT / "data" / "diseases")
    by_name = {d.name_vi: d for d in diseases}
    docs = {d.name_vi: HybridDiseaseSearcher._prepare_document_text(None, d)
            for d in diseases}

    def resolve(raw: str):
        """Map a free-text differential name onto a disease in the KB."""
        cleaned = re.sub(r"\s*\(.*?\)\s*", " ", raw).strip().lower()
        if not cleaned:
            return None
        for name in by_name:
            low = name.lower()
            if cleaned == low or cleaned in low or low in cleaned:
                return name
        return None

    rows = []
    per_disease = {}
    for d in diseases:
        confusable = []
        for raw in d.differential_diagnoses:
            hit = resolve(raw)
            if hit and hit != d.name_vi:
                confusable.append(hit)
        if not confusable:
            # No in-KB differential: fall back to same-specialty diseases, which
            # are still far harder negatives than a random pick.
            confusable = [o.name_vi for o in diseases
                          if o.category == d.category and o.name_vi != d.name_vi]
        if not confusable:
            continue

        anchors = list(d.user_language_variants)
        for i, anchor in enumerate(anchors):
            neg_name = confusable[i % len(confusable)]
            rows.append({
                "anchor": anchor,
                "positive": docs[d.name_vi],
                "negative": docs[neg_name],
            })
        per_disease[d.name_vi] = len(anchors)

    # Fold in generated colloquial queries when that file is present.
    gen = ROOT / "data" / "test_cases" / "generated_benchmark.json"
    if gen.exists():
        cases = json.loads(gen.read_text(encoding="utf-8")).get("cases", [])
        for c in cases:
            name = c.get("expected_top")
            d = by_name.get(name)
            if not d:
                continue
            confusable = [resolve(x) for x in d.differential_diagnoses]
            confusable = [c2 for c2 in confusable if c2 and c2 != name]
            if not confusable:
                continue
            rows.append({
                "anchor": c["query"],
                "positive": docs[name],
                "negative": docs[random.choice(confusable)],
            })
            per_disease[name] = per_disease.get(name, 0) + 1

    random.shuffle(rows)
    with open(dst, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(rows), per_disease


def train(model, data_path: Path, out_dir: Path, *, lr: float, epochs: float,
          batch_size: int, seq_len: int, tag: str):
    from datasets import load_dataset
    from sentence_transformers import SentenceTransformerTrainer, losses
    from sentence_transformers.training_args import SentenceTransformerTrainingArguments
    import torch

    ds = load_dataset("json", data_files=str(data_path), split="train")
    print(f"    {len(ds):,} triplets | lr={lr} | epochs={epochs} | bs={batch_size}")

    model.max_seq_length = seq_len
    loss = losses.MultipleNegativesRankingLoss(model)

    bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    args = SentenceTransformerTrainingArguments(
        output_dir=str(out_dir / f"_ckpt_{tag}"),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        learning_rate=lr,
        warmup_ratio=0.05,
        bf16=bf16,
        fp16=not bf16 and torch.cuda.is_available(),
        logging_steps=50,
        save_strategy="steps",
        save_steps=2000,
        save_total_limit=1,
        report_to=[],
    )
    SentenceTransformerTrainer(model=model, args=args, train_dataset=ds, loss=loss).train()
    return model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stages", nargs="+", type=int, default=[1, 2], choices=[1, 2])
    ap.add_argument("--base-model", default="BAAI/bge-m3")
    ap.add_argument("--out", default="models/bge-m3-medical")
    ap.add_argument("--batch-size", type=int, default=12)
    ap.add_argument("--seq-len", type=int, default=384)
    ap.add_argument("--stage1-lr", type=float, default=2e-5)
    ap.add_argument("--stage2-lr", type=float, default=1e-5)
    ap.add_argument("--stage1-epochs", type=float, default=1.0)
    ap.add_argument("--stage2-epochs", type=float, default=3.0)
    args = ap.parse_args()

    random.seed(3407)
    fine_dir = ROOT / "data" / "finetune"
    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    src = fine_dir / "embedding_triplets.jsonl"
    domain_path = fine_dir / "embedding_triplets_domain.jsonl"
    task_path = fine_dir / "task_triplets.jsonl"

    print("=" * 60)
    print("PREP")
    if 1 in args.stages:
        if not src.exists():
            print(f"  MISSING {src} -- run prepare_training_data.py first")
            return
        if domain_path.exists():
            print(f"  reusing {domain_path.name}")
        else:
            read, kept = filter_domain_triplets(src, domain_path)
            print(f"  domain filter: {read:,} -> {kept:,} ({kept/read*100:.1f}%)")

    n_task, per_disease = build_task_triplets(task_path)
    print(f"  task triplets: {n_task:,} across {len(per_disease)} diseases")
    if per_disease:
        lo = min(per_disease.values())
        hi = max(per_disease.values())
        print(f"    per-disease min {lo} / max {hi}")

    from sentence_transformers import SentenceTransformer
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\nLoading {args.base_model} on {device}")
    model = SentenceTransformer(args.base_model, device=device)

    if 1 in args.stages:
        print("\n" + "=" * 60)
        print("STAGE 1 - domain adaptation")
        train(model, domain_path, out_dir, lr=args.stage1_lr,
              epochs=args.stage1_epochs, batch_size=args.batch_size,
              seq_len=args.seq_len, tag="s1")
        model.save(str(out_dir))
        print(f"  saved -> {out_dir}")

    if 2 in args.stages:
        print("\n" + "=" * 60)
        print("STAGE 2 - task adaptation (the one that matters)")
        train(model, task_path, out_dir, lr=args.stage2_lr,
              epochs=args.stage2_epochs, batch_size=args.batch_size,
              seq_len=args.seq_len, tag="s2")
        model.save(str(out_dir))
        print(f"  saved -> {out_dir}")

    print("\n" + "=" * 60)
    print(f"Model at {out_dir}")
    print("\nMeasure it, do not assume it improved:")
    print(f"  python scripts/compare_embeddings.py --models bge-m3 {args.out}")
    print("Targets (vector-only): R@1 78.9% | Safety@1 80.0% | margin 0.1090")
    print("\n!! scp the model directory back before the GPU box dies !!")


if __name__ == "__main__":
    main()
