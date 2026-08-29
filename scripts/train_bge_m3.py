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

def train(model, data_path: Path, out_dir: Path, *, lr: float, epochs: float,
          batch_size: int, seq_len: int):
    from datasets import load_dataset
    from sentence_transformers import SentenceTransformerTrainer, losses
    from sentence_transformers.training_args import SentenceTransformerTrainingArguments
    import torch

    ds = load_dataset("json", data_files=str(data_path), split="train")
    print(f"-> Huấn luyện: {len(ds):,} triplets | lr={lr} | epochs={epochs} | batch_size={batch_size} | seq_len={seq_len}")

    model.max_seq_length = seq_len
    loss = losses.MultipleNegativesRankingLoss(model)

    bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    fp16 = torch.cuda.is_available() and not bf16

    out_dir.mkdir(parents=True, exist_ok=True)
    ckpt_dir = out_dir / "_ckpt"
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    args = SentenceTransformerTrainingArguments(
        output_dir=str(ckpt_dir),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        learning_rate=lr,
        warmup_ratio=0.05,
        bf16=bf16,
        fp16=fp16,
        logging_steps=50,
        save_strategy="no",
        report_to=[],
    )
    trainer = SentenceTransformerTrainer(model=model, args=args, train_dataset=ds, loss=loss)
    trainer.train()
    return model

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--triplets-file", default="data/finetune/task_triplets_633.jsonl")
    ap.add_argument("--base-model", default="BAAI/bge-m3")
    ap.add_argument("--out", default="models/bge-m3-medical-v2")
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--seq-len", type=int, default=384)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--epochs", type=float, default=2.0)
    args = ap.parse_args()

    triplets_path = ROOT / args.triplets_file
    out_path = ROOT / args.out
    (ROOT / "data" / "finetune").mkdir(parents=True, exist_ok=True)
    (ROOT / "models").mkdir(parents=True, exist_ok=True)

    if not triplets_path.exists():
        print(f"[!] Không tìm thấy {triplets_path}. Đang chạy build_task_triplets_633.py...")
        from scripts.build_task_triplets_633 import build_triplets
        build_triplets(triplets_path)

    print(f"=== BẮT ĐẦU FINE-TUNE BGE-M3 TRÊN 633 BỆNH ===")
    print(f"- Base model: {args.base_model}")
    print(f"- File dữ liệu: {triplets_path}")
    print(f"- Thư mục lưu: {out_path}")

    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(args.base_model)
    model = train(model, triplets_path, out_path, lr=args.lr, epochs=args.epochs,
                  batch_size=args.batch_size, seq_len=args.seq_len)

    print(f"\n-> Lưu mô hình hoàn tất vào: {out_path}")
    model.save_pretrained(str(out_path))
    print(f"[THÀNH CÔNG] Đã lưu model tại: {out_path}")

if __name__ == "__main__":
    main()
