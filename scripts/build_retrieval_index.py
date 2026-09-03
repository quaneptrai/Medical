"""Build or resume the persistent production retrieval index."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys
from time import perf_counter


ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build/resume the configured BotMedical Chroma index"
    )
    parser.add_argument("--device", choices=("cpu", "cuda"), default=None)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--force", action="store_true", help="Rebuild even if the index is ready")
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")

    os.environ["BOTMED_INDEX_BATCH_SIZE"] = str(args.batch_size)

    from src.retrieval.search_engine import HybridDiseaseSearcher

    started = perf_counter()
    searcher = HybridDiseaseSearcher(
        rebuild_index=args.force,
        device=args.device,
    )
    elapsed = perf_counter() - started
    print(
        f"[READY] {searcher.collection.count()} documents indexed on "
        f"{searcher.device} in {elapsed:.1f}s"
    )


if __name__ == "__main__":
    main()

