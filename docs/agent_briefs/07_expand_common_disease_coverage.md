# Agent brief 07 — Expand common/primary-care disease coverage

## Objective

Add primary-care / everyday conditions that are currently missing from
`data/diseases_expanded/` so retrieval stops defaulting to severe or oncology
diagnoses when a user describes a mild, self-limiting complaint. Do this
**before** the next paid GPU training run — new diseases must exist before
`scripts/build_task_triplets_633.py` runs, otherwise the model never sees
them as fine-tuning targets.

## Root cause (already confirmed, do not re-derive)

`data/diseases_expanded/` is not hand-curated. It is generated entirely by
`scripts/build_600_diseases_kb.py`, which:

1. Downloads `PB3002/ViMedical_Disease` from Hugging Face.
2. **Deletes every file in `data/diseases_expanded/` and rebuilds from
   scratch** (`for f in out_dir.glob("*.json"): f.unlink()` at line 82).
3. Groups the dataset's `Disease` column into 603 named entries.

That source dataset was scraped from medical Q&A sites where people ask
about formal diagnoses (skewed toward oncology — 79/603 entries — and named
chronic/severe conditions). Nobody posts "tôi bị nhiệt miệng" on those sites
because it self-resolves, so the KB has a structural blind spot for everyday
primary-care complaints. This is a coverage gap in the source data, not a
curation mistake.

Ad-hoc keyword search already confirmed at least these are missing (this
list is a **starting point, not the target** — see Methodology):

```
cảm lạnh, nhiệt miệng, ho khan, ho có đờm, sổ mũi, nghẹt mũi, ợ chua,
khó tiêu, nấc cụt, chuột rút, đau lưng, đau vai gáy, bong gân, trầy xước da,
côn trùng cắn, gàu, nấm da (hắc lào, lang ben), hôi miệng, sâu răng,
viêm lợi, đau răng, khô mắt, mỏi mắt, đau mắt đỏ, ù tai, zona thần kinh,
say nắng, say tàu xe, nôn nghén, sốt phát ban, suy nhược cơ thể, căng thẳng
```

The user explicitly does not want this capped at ~30 — they want systematic
coverage broad enough to catch real-world everyday queries, not just this
seed list.

## Methodology — do not rely on ad-hoc keyword guessing

1. Use a structured primary-care taxonomy as the source of truth for "what
   should exist," e.g. ICPC-2 (International Classification of Primary
   Care) rubrics, or a published "top reasons for outpatient/GP visits"
   list. Cross-reference systematically against the existing 603 `name_vi`
   values (case-insensitive, includes synonyms/aliases — many are already
   covered under a different name, e.g. "mề đay" already exists even though
   "nổi mề đay" as a literal substring does not match).
2. Produce a gap list with count, not a fixed quota decided in advance —
   let the taxonomy comparison determine how many entries are actually
   missing. Expect the real number to be larger than the 30-term seed list
   above (order of 100+ is plausible once synonyms/variants are enumerated
   properly, e.g. separate entries or aliases for "ho khan" vs "ho có đờm"
   vs "ho gà" if not already distinguished).
3. Deduplicate aggressively against existing entries before writing new
   files — check both `name_vi` and `aliases` in every existing
   `data/diseases_expanded/*.json`.

## Required JSON schema

Validated by `src/knowledge/schema.py::DiseaseSchema` (Pydantic). Every new
file must pass `python -c "from knowledge.schema import load_all_diseases; from pathlib import Path; load_all_diseases(Path('data/diseases_expanded'))"`
with zero errors. Key constraints:

- `disease_id`: pattern `^[A-Z]{2,5}_\d{3}$` — continue the existing `EXP_`
  prefix starting at `EXP_604` (current max is `EXP_603`, 603 files). The
  3-digit suffix caps the prefix at 999, so there is headroom for ~396 more
  `EXP_` entries; watch this ceiling if the gap list approaches that size.
- `category`: must be one of the fixed enum in `schema.py` (`respiratory`,
  `digestive`, `general`, `dermatology`, `cardiology`, `neurology`,
  `urology`, `oncology`, `musculoskeletal`, `ophthalmology`, `ent`,
  `obstetrics_gynecology`, `andrology`, `infectious`, `endocrinology`,
  `hematology`, `pediatrics`, `toxicology`) — anything else raises a
  validation error.
- `symptoms.common` / `symptoms.occasional`: at least 2 symptoms total
  (schema minimum), but match the density of existing entries for retrieval
  quality — look at `data/diseases_expanded/EXP_074_benh_viem_hong_cap.json`
  as a reference: 10-20 symptoms split across common/occasional, each with
  `name_vi`, `name_en` (unidecode-transliterated), `frequency`.
- `tier`: use `1` (manually curated) to distinguish from the `2` used by the
  raw dataset-scaled entries.
- `provenance`: be honest, do not fabricate authority. Use something like
  `{"source_document": "Curated common primary-care conditions (non-clinician-authored)", "issuing_body": "BotMedical KB curation", "year": 2026, "evidence_level": "Kiến thức y khoa phổ thông, cần bác sĩ rà soát", "reviewed_by": null, "review_date": null}`.
  This is consistent with the existing 603 entries, which also all carry
  `reviewed_by: null` — you are not lowering the bar, just being accurate.
- `user_language_variants`: write the way real Vietnamese users actually
  type (colloquial, not textbook phrasing) — this is what the retrieval
  and triplet-building pipeline indexes against.

## Make additions durable across KB rebuilds

Do **not** just drop new files into `data/diseases_expanded/` and stop —
the next time anyone runs `scripts/build_600_diseases_kb.py` it wipes the
whole directory and only the 603 dataset-derived entries come back.

Required fix: create `data/common_diseases_manual.json` (a JSON array of
dicts matching `DiseaseSchema`, minus `disease_id`/`tier`/`provenance`
which the build script fills in) as the durable source of truth, then patch
`scripts/build_600_diseases_kb.py` to, after it finishes writing the 603
dataset-derived files, load `data/common_diseases_manual.json` and write
one file per entry with continuing `EXP_` IDs, `tier=1`, and the provenance
block above. This way a future full rebuild regenerates both the dataset
entries and the curated common-disease entries every time.

## Non-negotiables (mirrors brief 05's standards)

- No fabricated clinical authority — do not write `reviewed_by` with an
  invented name, do not claim clinician review that didn't happen.
- No content copied verbatim from a copyrighted source; write original
  symptom/description text grounded in general medical knowledge.
- Do not touch `data/test_cases/benchmark_603_diseases.json`,
  `generated_benchmark.json`, `golden_cases.json`, or
  `data/test_cases/clinical_holdout.json` — these are reserved eval sets
  and `build_task_triplets_633.py` already excludes their queries from
  training via `load_forbidden_benchmark_queries()`; adding overlapping
  text to a new disease file risks accidental leakage if phrased
  identically to a reserved query. Keep new `user_language_variants`
  original.

## Validation before handoff

1. `python -c "from knowledge.schema import load_all_diseases; from pathlib import Path; load_all_diseases(Path('data/diseases_expanded'))"` — zero errors, no duplicate `disease_id`, no duplicate `name_vi`.
2. `venv/Scripts/python.exe -m pytest tests/test_schema.py tests/test_retrieval.py tests/test_pipeline_hardening.py -q` — all pass. This runs on CPU, no GPU rental needed.
3. `python scripts/build_task_triplets_633.py` — rerun locally (CPU-only, fast) to confirm the new diseases produce triplets and the leakage check still passes cleanly before anyone pays for GPU time.
4. Re-run `python scripts/build_600_diseases_kb.py` once to confirm the manual-merge patch survives a full wipe-and-rebuild, then verify the new count (603 + N) and that all EXP_604+ files reappear identically.

## Handoff report

Report: taxonomy/source used for the gap analysis, final gap count found,
how many entries were written, any category or ID-space concerns, pytest
result, triplet leakage-check result, and confirmation that a full KB
rebuild (`build_600_diseases_kb.py`) regenerates the manual entries without
loss. Do not claim clinical accuracy beyond "curated, not clinician
reviewed" — that claim requires the same review protocol as brief 05.
