# Agent brief 06 — Retire stale reports and publish an auditable current report

## Objective

Prevent `evaluation_report_v0.md` and `golden_evaluation_report.md` from being
mistaken for current evidence. Preserve historical evidence, regenerate what can
be reproduced, and make every current claim traceable to a tracked JSON artifact,
runtime configuration, model hash, dataset hash, and git commit.

## Inputs that are authoritative

- `config/settings.yaml`
- `models/registry.json`
- `artifacts/evaluation/recovered_alpha050_comparison.json`
- `artifacts/evaluation/bm25_weight_sweep.json`
- `artifacts/evaluation/guardrail_calibration.json`
- `artifacts/evaluation/clinical_holdout_manifest.json` when brief 05 is complete
- `src/evaluation/golden_evaluator.py` and `scripts/run_golden_eval.py`

Do not manually copy metrics from chat messages when the corresponding JSON is
available.

## Required workflow

1. Add a prominent `HISTORICAL / SUPERSEDED` banner to
   `evaluation_report_v0.md`. State that its three cases, old retrieval stack,
   and latency numbers are retained for audit only and are not release evidence.
   Do not delete the original case details.
2. Treat the existing `golden_evaluation_report.md` as invalid current evidence:
   it reports 10/10 despite GTC_009 returning a cardiology emergency response for
   asthma. Preserve it with a superseded banner or move the exact content to a
   clearly named historical report using `git mv`.
3. Confirm Ollama and `llama3.1:8b` are available. If available, run:

   ```powershell
   D:\BotMedical\venv\Scripts\python.exe scripts/run_golden_eval.py llama3.1:8b
   ```

   This must generate both the Markdown report and
   `artifacts/evaluation/golden_evaluation.json` using the audited evaluator.
4. If Ollama is unavailable, do not fabricate a new golden result. Leave the old
   report marked superseded and record the exact blocked command.
5. Verify GTC_009 is scored against stage consistency, exact Top-3 disease,
   specialty, required/forbidden reply patterns, and emergency-language
   consistency. A wrong-specialty emergency response must not pass.
6. Create `evaluation_report_current.md` as a concise index of evidence. Include:
   retrieval model ID and SHA256, alpha and reconstruction limitation, BM25 0.10
   decision and sweep artifact, dense/hybrid metrics with dataset sizes, paired
   McNemar/bootstrap results, guardrail model/hash/alpha, advisory-only status,
   calibration precision/specificity limitations, golden automated vs clinical
   pass separately, holdout status/hash, test command/results, timestamp, and git
   commit.
7. Explicitly label generated/same-distribution benchmarks as validation, not an
   independent clinical holdout. Do not use phrases such as “zero false
   negatives”, “clinically validated”, or “production safe” unless the frozen
   independently reviewed holdout directly supports them with confidence
   intervals.
8. Add links from the current report to each source artifact. Validate every
   quoted number by parsing JSON, not visual transcription.

## Acceptance criteria

- No stale report can be read as current without seeing a superseded warning.
- GTC_009 cannot receive clinical pass for a wrong-specialty response.
- Automated pass and clinician-approved pass are reported separately.
- Every metric names its dataset, sample count, model hash, retrieval route, and
  BM25 weight.
- Current report states that retrieval alpha 0.50 and semantic guardrail alpha
  0.07 are intentionally separate and why.
- All new JSON/Markdown evidence is tracked and committed.
- Final handoff includes commands run, test results, limitations, and commit hash.
