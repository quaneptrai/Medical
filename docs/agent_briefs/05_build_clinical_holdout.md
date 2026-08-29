# Agent brief 05 — Label real queries and freeze the clinical holdout

## Objective

Produce `data/test_cases/clinical_holdout.json` with at least 200 adjudicated
emergency cases and 200 adjudicated non-emergency cases, then generate a tracked
SHA256 manifest. This dataset is final evaluation only and must never influence
training, model blending, BM25 selection, thresholds, prompts, or rules.

## Facts to verify first

- `real_benchmark_candidates.csv` has 441 logical CSV records, not 945. Embedded
  newlines make the physical line count misleading.
- `actual_label` is currently empty for all 441 records.
- `label_tool.html` only supports the original 30-disease labeling workflow. It
  is useful for triage, but its output is not by itself a release-ready holdout.
- The required schema is `src/evaluation/holdout_schema.py`.

## Non-negotiable review protocol

1. Do not ask an LLM to impersonate clinicians or invent reviewer identities.
2. Every included case needs three distinct real reviewer IDs: primary,
   secondary, and adjudicator.
3. Primary and secondary review independently. The adjudicator resolves every
   disagreement in disease/syndrome label, emergency status, and inclusion.
4. Remove names, phone numbers, addresses, dates of birth, record IDs, and other
   identifying details before inclusion. Preserve the clinical meaning.
5. Exclude unusable questions: administrative-only, insufficient clinical text,
   duplicates, spam, or content that cannot be safely de-identified.
6. Do not expose holdout queries to training or configuration selection after the
   dataset is frozen.

## Required workflow

1. Parse the CSV with Python's `csv` module or pandas; never count newline-delimited
   text manually.
2. Create an adjudication sheet containing at least: source row, de-identified
   query, primary label/emergency, secondary label/emergency, adjudicated result,
   syndrome category, canonical disease ID when available, reviewer IDs, notes,
   and exclusion reason.
3. Review all 441 real queries. Use accepted real cases as
   `source_type=deidentified_real_case` with a stable `source_reference` such as
   `real_benchmark_candidates.csv#row-0001`.
4. The real-query pool will probably not contain 200 genuine emergencies. Fill
   only the shortfall with independently authored cases written by clinicians,
   using `source_type=independently_authored_clinical_case`. Do not transform
   training documents or generated benchmark queries into holdout cases.
5. Balance emergency syndromes across cardiology, neurology, respiratory,
   gastroenterology/surgical abdomen, trauma/bleeding, toxicology, obstetrics,
   infectious disease, endocrinology, and anaphylaxis. Avoid satisfying the
   quota with near-duplicate templates.
6. Assign stable IDs `HLD_0001`, `HLD_0002`, ... and set every case to
   `review_status=adjudicated`, `split=final_holdout`.
7. Set `frozen_at` only after all adjudication is complete. After freezing, edits
   require a new `dataset_id`, new timestamp, new hash, and a documented reason.

## Validation command

```powershell
D:\BotMedical\venv\Scripts\python.exe scripts/validate_clinical_holdout.py data/test_cases/clinical_holdout.json
```

This must produce
`artifacts/evaluation/clinical_holdout_manifest.json` with
`release_ready=true`, at least 200 emergency cases, at least 200 non-emergency
cases, no normalized duplicate queries, and a SHA256 fingerprint.

## Acceptance criteria

- Schema validation passes with no exceptions.
- Three distinct reviewer IDs exist on every case and correspond to actual
  reviewers.
- Review disagreements and exclusions remain auditable in a separate tracked
  adjudication summary without personal data.
- Both the frozen JSON and manifest are committed to git.
- A repository search confirms no holdout query appears in training triplets or
  generated training inputs.
- No model metric is calculated until the dataset is frozen and hashed.

## Handoff report

Report exact counts by source type, emergency status, syndrome category,
agreement/disagreement rate, exclusions, dataset ID, frozen timestamp, SHA256,
validation command, and commit hash. Do not claim clinical validation beyond the
documented reviewers and protocol.
