"""
Discover real medical/health datasets on the Hugging Face Hub.

Dataset IDs, sizes and licenses change often, so this queries the Hub API
directly instead of relying on a hardcoded list. Output is a ranked report
used to decide what is actually worth downloading.

License is reported verbatim and NOT interpreted: several widely used medical
dialogue corpora are research-only or were scraped from sites whose terms
forbid redistribution. Check each one before shipping anything built on it.

Usage:
    python scripts/discover_datasets.py
    python scripts/discover_datasets.py --queries "vietnamese medical" "triage"
"""
import argparse
import io
import json
import sys

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

API = "https://huggingface.co/api/datasets"

DEFAULT_QUERIES = [
    # Vietnamese-language health/medical resources
    "vietnamese medical",
    "vietnamese health",
    "vihealth",
    "vimq",
    "vietnamese question answering medical",
    # Patient-doctor dialogue
    "medical dialogue",
    "patient doctor conversation",
    "healthcaremagic",
    "chatdoctor",
    "meddialog",
    # Symptom -> diagnosis structured
    "symptom disease",
    "differential diagnosis",
    "ddxplus",
    "symptom checker",
    "triage",
]


def search(query: str, limit: int = 12):
    try:
        r = requests.get(
            API,
            params={"search": query, "limit": limit, "full": "true", "sort": "downloads",
                    "direction": -1},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  ! query '{query}' failed: {type(e).__name__}: {e}")
        return []


def get_license(ds: dict) -> str:
    tags = ds.get("tags", []) or []
    for t in tags:
        if isinstance(t, str) and t.startswith("license:"):
            return t.split("license:", 1)[1]
    card = ds.get("cardData") or {}
    lic = card.get("license")
    if isinstance(lic, list):
        return ", ".join(str(x) for x in lic)
    return str(lic) if lic else "?"


def get_languages(ds: dict) -> str:
    tags = ds.get("tags", []) or []
    langs = [t.split("language:", 1)[1] for t in tags
             if isinstance(t, str) and t.startswith("language:")]
    return ",".join(langs) if langs else "?"


def get_rows(ds: dict):
    """Row count from the dataset-info tag, when the Hub exposes one."""
    for t in ds.get("tags", []) or []:
        if isinstance(t, str) and t.startswith("size_categories:"):
            return t.split("size_categories:", 1)[1]
    return "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--queries", nargs="+", default=DEFAULT_QUERIES)
    ap.add_argument("--min-downloads", type=int, default=50)
    ap.add_argument("--out", default="dataset_candidates.json")
    args = ap.parse_args()

    seen = {}
    for q in args.queries:
        print(f"Searching: {q}")
        for ds in search(q):
            ds_id = ds.get("id")
            if not ds_id or ds_id in seen:
                continue
            downloads = ds.get("downloads", 0) or 0
            if downloads < args.min_downloads:
                continue
            seen[ds_id] = {
                "id": ds_id,
                "downloads": downloads,
                "likes": ds.get("likes", 0) or 0,
                "license": get_license(ds),
                "languages": get_languages(ds),
                "size": get_rows(ds),
                "matched_query": q,
            }

    rows = sorted(seen.values(), key=lambda x: -x["downloads"])
    print(f"\n{len(rows)} candidate datasets\n")

    # Vietnamese-language datasets first: they need no translation, so they
    # carry no translation-error risk.
    vi = [r for r in rows if "vi" in r["languages"].split(",")]
    other = [r for r in rows if r not in vi]

    def show(title, items):
        if not items:
            return
        print(f"### {title}")
        print(f"{'dataset':<52} {'downloads':>10} {'lang':<12} {'size':<14} license")
        print("-" * 110)
        for r in items[:30]:
            print(f"{r['id'][:52]:<52} {r['downloads']:>10} {r['languages'][:12]:<12} "
                  f"{r['size'][:14]:<14} {r['license'][:28]}")
        print()

    show("VIETNAMESE (no translation needed)", vi)
    show("OTHER LANGUAGES (translation required — adds error risk)", other)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"Saved -> {args.out}")


if __name__ == "__main__":
    main()
