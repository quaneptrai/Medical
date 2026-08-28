"""
Collect and format Vietnamese medical training data from license-clean sources.

Two independent tracks, written separately because they train different things:

  TRACK "embedding"  -> anchor/positive/negative triplets for fine-tuning BGE-M3.
      This is the priority. Measured weakness: vector-only Safety@1 is 80%, so
      one emergency case in five is missed by the embedding layer alone. The
      resulting model is ~2GB and serves fine on CPU, so it survives an
      ephemeral GPU box.

  TRACK "chat"       -> ShareGPT conversations for SFT of a chat model.
      Kept smaller and stricter. Note this does NOT teach the structured JSON
      the triage loop depends on (new_symptoms / new_red_flags / stage); prose
      SFT alone will not produce schema-valid output.

Source policy: only datasets declaring a permissive license are included.
"No license declared" means all rights reserved, not public domain, so such
datasets are listed as EXCLUDED with the reason recorded rather than silently
pulled in. Every emitted row carries its source and license for auditability.

Usage:
    python scripts/prepare_training_data.py                      # both tracks
    python scripts/prepare_training_data.py --tracks embedding
    python scripts/prepare_training_data.py --limit 5000         # quick trial
"""
import argparse
import hashlib
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent

# Sources vetted against the Hub API. Row counts are the observed split sizes.
SOURCES = {
    "embedding": [
        {
            "id": "mtue29/vietnamese-medical-dataset",
            "license": "apache-2.0",
            "rows": 463422,
            "kind": "triplet",
        },
    ],
    "chat": [
        {
            "id": "hungnm/vietnamese-medical-qa",
            "license": "apache-2.0",
            "rows": 9335,
            "kind": "qa",
        },
    ],
}

# Deliberately not pulled. Recorded so the decision is visible rather than lost.
EXCLUDED = [
    ("hungsvdut2k2/vietnamese-medical-chat-data",
     "no license declared (defaults to all rights reserved); content is drug-information "
     "Q&A, not symptom reporting"),
    ("tarudesu/ViHealthQA",
     "no license declared; sourced from VnExpress, a copyrighted news site"),
    ("ai-enthusiasm-community/vietnamese_health_dataset",
     "MIT, but context is scraped SEO health-blog text of unverified quality"),
    ("lavita/ChatDoctor-HealthCareMagic-100k and re-uploads",
     "underlying data scraped from healthcaremagic.com; permissive tags added by "
     "re-uploaders do not override the original terms"),
]

VN_CHARS = set("ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ")

# Answers that only tell the patient to go see a doctor teach deflection, not
# symptom taking. Detected as: referral phrase present AND little else said.
REFERRAL_PAT = re.compile(
    r"(đến|tới|đi)\s+(bệnh viện|phòng khám|cơ sở y tế|chuyên khoa)|"
    r"thăm khám trực tiếp|khám trực tiếp|đi khám",
    re.IGNORECASE,
)
BOILERPLATE_PAT = re.compile(
    r"^\s*(chào (bạn|anh|chị|em|bác)[^\n]*|"
    r"(để )?trả lời câu hỏi (trên|của bạn)[^\n]*|"
    r"bác sĩ xin (giải đáp|trả lời)[^\n]*|"
    r"trân trọng[!.]?|"
    r"cảm ơn (bạn|anh|chị)[^\n]*)\s*$",
    re.IGNORECASE | re.MULTILINE,
)


def vn_ratio(text: str) -> float:
    """Share of alphabetic characters that are Vietnamese-specific."""
    letters = [c for c in text.lower() if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c in VN_CHARS) / len(letters)


def strip_boilerplate(text: str) -> str:
    return BOILERPLATE_PAT.sub("", text).strip()


def norm_key(text: str) -> str:
    return hashlib.md5(re.sub(r"\s+", " ", text.lower()).strip().encode()).hexdigest()


def load_rows(ds_id: str, limit: int | None):
    from datasets import load_dataset
    ds = load_dataset(ds_id, split="train", streaming=True)
    for i, row in enumerate(ds):
        if limit and i >= limit:
            break
        yield row


def build_embedding_track(out_path: Path, limit: int | None) -> Counter:
    stats = Counter()
    seen = set()

    with open(out_path, "w", encoding="utf-8") as f:
        for src in SOURCES["embedding"]:
            print(f"  pulling {src['id']} ({src['rows']:,} rows, {src['license']})")
            for row in load_rows(src["id"], limit):
                stats["read"] += 1
                anchor = (row.get("anchor") or "").strip()
                pos = (row.get("positive") or "").strip()
                neg = (row.get("negative") or "").strip()

                if not (anchor and pos and neg):
                    stats["drop_empty"] += 1
                    continue
                if not (5 <= len(anchor) <= 500):
                    stats["drop_anchor_len"] += 1
                    continue
                if len(pos) < 40 or len(neg) < 40:
                    stats["drop_passage_len"] += 1
                    continue
                if norm_key(pos) == norm_key(neg):
                    # A negative identical to the positive is a mislabeled pair
                    # and actively teaches the wrong thing.
                    stats["drop_pos_eq_neg"] += 1
                    continue
                if vn_ratio(anchor) < 0.03:
                    stats["drop_not_vietnamese"] += 1
                    continue

                # Dedup on the full triple, not the anchor: one anchor paired
                # with several different negatives is hard-negative mining, and
                # deduping by anchor alone discards ~50% of valid training signal.
                key = norm_key(f"{anchor}\x00{pos}\x00{neg}")
                if key in seen:
                    stats["drop_dup"] += 1
                    continue
                seen.add(key)

                meta = row.get("meta") or {}
                f.write(json.dumps({
                    "anchor": anchor,
                    "positive": pos,
                    "negative": neg,
                    "category": meta.get("category") if isinstance(meta, dict) else None,
                    "source": src["id"],
                    "license": src["license"],
                }, ensure_ascii=False) + "\n")
                stats["kept"] += 1

                if stats["kept"] % 25000 == 0:
                    print(f"    kept {stats['kept']:,}")
    return stats


def build_chat_track(out_path: Path, limit: int | None) -> Counter:
    stats = Counter()
    seen = set()

    with open(out_path, "w", encoding="utf-8") as f:
        for src in SOURCES["chat"]:
            print(f"  pulling {src['id']} ({src['rows']:,} rows, {src['license']})")
            for row in load_rows(src["id"], limit):
                stats["read"] += 1
                q = (row.get("question") or "").strip()
                a = (row.get("answer") or "").strip()
                if not (q and a):
                    stats["drop_empty"] += 1
                    continue

                a_core = strip_boilerplate(a)

                if len(q.split()) < 8:
                    stats["drop_question_short"] += 1
                    continue
                if len(a_core.split()) < 25:
                    stats["drop_answer_short"] += 1
                    continue
                # The filter the previous script claimed but never implemented:
                # a short answer whose only substance is "go see a doctor".
                if REFERRAL_PAT.search(a_core) and len(a_core.split()) < 60:
                    stats["drop_referral_only"] += 1
                    continue
                if vn_ratio(q) < 0.03:
                    stats["drop_not_vietnamese"] += 1
                    continue

                key = norm_key(q)
                if key in seen:
                    stats["drop_dup"] += 1
                    continue
                seen.add(key)

                f.write(json.dumps({
                    "conversations": [
                        {"from": "human", "value": q},
                        {"from": "gpt", "value": a_core},
                    ],
                    "source": src["id"],
                    "license": src["license"],
                }, ensure_ascii=False) + "\n")
                stats["kept"] += 1
    return stats


def report(name: str, stats: Counter, path: Path):
    print(f"\n  --- {name} ---")
    kept = stats.get("kept", 0)
    read = stats.get("read", 0)
    print(f"  read {read:,} -> kept {kept:,} ({kept/read*100:.1f}%)" if read else "  no rows")
    for k in sorted(stats):
        if k.startswith("drop_"):
            print(f"    {k:<26} {stats[k]:,}")
    print(f"  -> {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tracks", nargs="+", default=["embedding", "chat"],
                    choices=["embedding", "chat"])
    ap.add_argument("--limit", type=int, default=None,
                    help="Cap rows read per source (for a quick trial run).")
    ap.add_argument("--out-dir", default="data/finetune")
    args = ap.parse_args()

    out_dir = ROOT / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    print("EXCLUDED sources (license or content-fit):")
    for ds_id, reason in EXCLUDED:
        print(f"  - {ds_id}\n      {reason}")
    print()

    results = []
    if "embedding" in args.tracks:
        print("TRACK: embedding triplets (BGE-M3 fine-tune)")
        p = out_dir / "embedding_triplets.jsonl"
        results.append(("embedding triplets", build_embedding_track(p, args.limit), p))

    if "chat" in args.tracks:
        print("\nTRACK: chat SFT (ShareGPT)")
        p = out_dir / "chat_sharegpt.jsonl"
        results.append(("chat ShareGPT", build_chat_track(p, args.limit), p))

    print("\n" + "=" * 60)
    for name, stats, path in results:
        report(name, stats, path)

    print("\n" + "=" * 60)
    print("Chat-track caveat: prose SFT does not teach the triage JSON schema")
    print("(new_symptoms / new_red_flags / stage). Do not expect schema-valid")
    print("output from a model trained on this track alone.")
    print("\n!! scp data/finetune/ back before the GPU box dies !!")


if __name__ == "__main__":
    main()
