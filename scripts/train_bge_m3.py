"""Fine-tune BGE-M3 for Vietnamese medical retrieval.

Cloud profiles use GradCache so the contrastive batch can be large without
keeping all texts in GPU memory. A disease-aware sampler prevents positives
for the same disease from becoming false in-batch negatives.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import platform
import random
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterator

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))


@dataclass(frozen=True)
class TrainProfile:
    batch_size: int
    mini_batch_size: int
    seq_len: int
    dataloader_workers: int
    gradient_checkpointing: bool


PROFILES = {
    "cloud-a100": TrainProfile(128, 16, 768, 8, False),
    "cloud-48gb": TrainProfile(128, 8, 768, 6, True),
    "local-debug": TrainProfile(8, 2, 256, 0, True),
}

TEXT_COLUMNS = ("anchor", "positive", "negative")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _latest_checkpoint(checkpoint_dir: Path) -> str | None:
    if not checkpoint_dir.exists():
        return None
    candidates = []
    for path in checkpoint_dir.glob("checkpoint-*"):
        try:
            candidates.append((int(path.name.rsplit("-", 1)[1]), path))
        except (IndexError, ValueError):
            continue
    return str(max(candidates)[1]) if candidates else None


def _prepare_dataset(data_path: Path):
    from datasets import load_dataset

    dataset = load_dataset("json", data_files=str(data_path), split="train")
    missing = set(TEXT_COLUMNS + ("target_disease",)) - set(dataset.column_names)
    if missing:
        raise ValueError(f"Training data is missing required columns: {sorted(missing)}")

    disease_names = sorted(set(dataset["target_disease"]))
    disease_to_label = {name: idx for idx, name in enumerate(disease_names)}
    dataset = dataset.map(
        lambda row: {"label": disease_to_label[row["target_disease"]]},
        desc="Assign disease labels for false-negative-safe batching",
    )
    dataset = dataset.select_columns([*TEXT_COLUMNS, "label"])
    return dataset, disease_names


def _make_sampler_class():
    import torch
    from torch.utils.data import BatchSampler

    class DiseaseAwareNoDuplicatesBatchSampler(BatchSampler):
        """Yield batches with unique disease labels and unique text values."""

        def __init__(self, dataset, batch_size, drop_last, generator=None, seed=42):
            super().__init__(dataset, batch_size, drop_last)
            self.dataset = dataset
            self.batch_size = batch_size
            self.drop_last = drop_last
            self.generator = generator
            self.seed = seed
            self.epoch = 0

        def set_epoch(self, epoch: int) -> None:
            self.epoch = epoch

        def __iter__(self) -> Iterator[list[int]]:
            generator = self.generator or torch.Generator()
            generator.manual_seed(self.seed + self.epoch)
            remaining = dict.fromkeys(torch.randperm(len(self.dataset), generator=generator).tolist())

            while remaining:
                batch_indices: list[int] = []
                batch_labels: set[int] = set()
                batch_texts: set[str] = set()

                for index in remaining:
                    sample = self.dataset[index]
                    label = int(sample["label"])
                    texts = {sample[column] for column in TEXT_COLUMNS}
                    if label in batch_labels or texts & batch_texts:
                        continue
                    batch_indices.append(index)
                    batch_labels.add(label)
                    batch_texts.update(texts)
                    if len(batch_indices) == self.batch_size:
                        break

                if len(batch_indices) == self.batch_size or (batch_indices and not self.drop_last):
                    yield batch_indices
                for index in batch_indices:
                    del remaining[index]

                if not batch_indices:
                    raise RuntimeError("Unable to construct a unique training batch")

        def __len__(self) -> int:
            size, remainder = divmod(len(self.dataset), self.batch_size)
            return size + (bool(remainder) and not self.drop_last)

    return DiseaseAwareNoDuplicatesBatchSampler


def train(args, profile: TrainProfile):
    import torch
    from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, losses
    from sentence_transformers.training_args import SentenceTransformerTrainingArguments
    from transformers import set_seed

    if not torch.cuda.is_available() and not args.allow_cpu:
        raise RuntimeError(
            "CUDA is not available. Refusing an accidental CPU training run. "
            "Install a CUDA PyTorch wheel or pass --allow-cpu only for a smoke test."
        )

    random.seed(args.seed)
    set_seed(args.seed)
    dataset, disease_names = _prepare_dataset(args.triplets_path)
    if args.batch_size > len(disease_names):
        raise ValueError(
            f"batch_size={args.batch_size} exceeds {len(disease_names)} unique diseases; "
            "the disease-aware sampler cannot build such a batch."
        )

    model = SentenceTransformer(args.base_model)
    model.max_seq_length = args.seq_len

    if args.loss == "cached-mnrl":
        loss = losses.CachedMultipleNegativesRankingLoss(
            model,
            mini_batch_size=args.mini_batch_size,
            show_progress_bar=False,
        )
    else:
        loss = losses.MultipleNegativesRankingLoss(model)

    bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    fp16 = torch.cuda.is_available() and not bf16
    if torch.cuda.is_available():
        torch.backends.cuda.matmul.allow_tf32 = args.tf32
        torch.backends.cudnn.allow_tf32 = args.tf32

    args.out_path.mkdir(parents=True, exist_ok=True)
    checkpoint_dir = args.out_path / "_checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    training_args = SentenceTransformerTrainingArguments(
        output_dir=str(checkpoint_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.lr,
        warmup_ratio=args.warmup_ratio,
        weight_decay=args.weight_decay,
        lr_scheduler_type="cosine",
        bf16=bf16,
        fp16=fp16,
        tf32=args.tf32 if torch.cuda.is_available() else None,
        gradient_checkpointing=args.gradient_checkpointing,
        max_grad_norm=1.0,
        logging_strategy="steps",
        logging_steps=args.logging_steps,
        logging_first_step=True,
        save_strategy="steps",
        save_steps=args.save_steps,
        save_total_limit=3,
        seed=args.seed,
        data_seed=args.seed,
        dataloader_num_workers=args.dataloader_workers,
        dataloader_pin_memory=torch.cuda.is_available(),
        dataloader_drop_last=True,
        report_to=[],
        run_name=args.run_name,
    )

    sampler_class = _make_sampler_class()

    class MedicalEmbeddingTrainer(SentenceTransformerTrainer):
        def get_batch_sampler(
            self, dataset, batch_size, drop_last, valid_label_columns=None, generator=None
        ):
            return sampler_class(
                dataset=dataset,
                batch_size=batch_size,
                drop_last=drop_last,
                generator=generator,
                seed=args.seed,
            )

    trainer = MedicalEmbeddingTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        loss=loss,
    )

    resume_checkpoint = None
    if args.resume == "auto":
        resume_checkpoint = _latest_checkpoint(checkpoint_dir)
    elif args.resume:
        resume_checkpoint = args.resume

    print("=== BGE-M3 MEDICAL FINE-TUNING ===")
    print(f"Profile: {args.profile}")
    print(f"Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
    print(f"Rows / diseases: {len(dataset):,} / {len(disease_names):,}")
    print(f"Input columns: {dataset.column_names} (metadata is not encoded by the loss)")
    print(f"Loss: {args.loss} | contrastive batch: {args.batch_size} | cache mini-batch: {args.mini_batch_size}")
    print(f"Sequence length: {args.seq_len} | bf16={bf16} | fp16={fp16} | tf32={args.tf32}")
    print(f"Resume checkpoint: {resume_checkpoint or 'none'}")

    result = trainer.train(resume_from_checkpoint=resume_checkpoint)
    model.save_pretrained(str(args.out_path))

    manifest = {
        "base_model": args.base_model,
        "output_dir": str(args.out_path),
        "profile": args.profile,
        "profile_defaults": asdict(profile),
        "training": {
            "loss": args.loss,
            "batch_size": args.batch_size,
            "mini_batch_size": args.mini_batch_size,
            "seq_len": args.seq_len,
            "learning_rate": args.lr,
            "epochs": args.epochs,
            "warmup_ratio": args.warmup_ratio,
            "weight_decay": args.weight_decay,
            "seed": args.seed,
        },
        "data": {
            "path": str(args.triplets_path),
            "sha256": _sha256(args.triplets_path),
            "rows": len(dataset),
            "diseases": len(disease_names),
        },
        "runtime": {
            "python": platform.python_version(),
            "torch": torch.__version__,
            "cuda": torch.version.cuda,
            "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        },
        "train_metrics": result.metrics,
    }
    with (args.out_path / "training_manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
    print(f"[SUCCESS] Model and manifest saved to {args.out_path}")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--triplets-file", default="data/finetune/task_triplets_633.jsonl")
    parser.add_argument("--base-model", default="BAAI/bge-m3")
    parser.add_argument("--out", default="models/bge-m3-medical-v2")
    parser.add_argument("--profile", choices=sorted(PROFILES), default="cloud-a100")
    parser.add_argument("--loss", choices=("cached-mnrl", "mnrl"), default="cached-mnrl")
    parser.add_argument("--batch-size", type=int)
    parser.add_argument("--mini-batch-size", type=int)
    parser.add_argument("--seq-len", type=int)
    parser.add_argument("--dataloader-workers", type=int)
    parser.add_argument("--lr", type=float, default=1e-5)
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--warmup-ratio", type=float, default=0.10)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--save-steps", type=int, default=100)
    parser.add_argument("--logging-steps", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--resume", default="auto", help="auto, an explicit checkpoint path, or empty")
    parser.add_argument("--run-name", default="bge-m3-medical-v2")
    parser.add_argument("--allow-cpu", action="store_true")
    parser.add_argument("--tf32", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--gradient-checkpointing", action=argparse.BooleanOptionalAction)
    args = parser.parse_args()

    profile = PROFILES[args.profile]
    args.batch_size = args.batch_size or profile.batch_size
    args.mini_batch_size = args.mini_batch_size or profile.mini_batch_size
    args.seq_len = args.seq_len or profile.seq_len
    if args.dataloader_workers is None:
        args.dataloader_workers = profile.dataloader_workers
    if args.gradient_checkpointing is None:
        args.gradient_checkpointing = profile.gradient_checkpointing

    args.triplets_path = ROOT / args.triplets_file
    args.out_path = ROOT / args.out
    if not args.triplets_path.exists():
        raise FileNotFoundError(
            f"Missing {args.triplets_path}. Run scripts/build_task_triplets_633.py first."
        )
    if args.batch_size <= 1 or args.mini_batch_size <= 0:
        parser.error("batch sizes must be positive and contrastive batch-size must be > 1")
    if args.mini_batch_size > args.batch_size:
        parser.error("mini-batch-size cannot exceed batch-size")
    return args, profile


def main():
    args, profile = parse_args()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    train(args, profile)


if __name__ == "__main__":
    main()
