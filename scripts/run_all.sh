#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PYTHON_BIN="${PYTHON_BIN:-python}"
TRAIN_PROFILE="${TRAIN_PROFILE:-cloud-a100}"
BASE_MODEL="${BASE_MODEL:-BAAI/bge-m3}"
BASE_MODEL_REVISION="${BASE_MODEL_REVISION:-5617a9f61b028005a4858fdac845db406aefb181}"
RAW_MODEL="${RAW_MODEL:-models/bge-m3-medical-v3-raw}"
RETRIEVAL_MODEL="${RETRIEVAL_MODEL:-models/bge-m3-medical-v3-retrieval-a050-fp16}"
GUARDRAIL_MODEL="${GUARDRAIL_MODEL:-models/bge-m3-medical-v3-guardrail-a007-fp16}"
INCUMBENT_MODEL="${INCUMBENT_MODEL:-models/bge-m3-medical-v2-recovered-a050-fp16}"
RETRIEVAL_ALPHA="${RETRIEVAL_ALPHA:-0.50}"
GUARDRAIL_ALPHA="${GUARDRAIL_ALPHA:-0.07}"
EVAL_BATCH_SIZE="${EVAL_BATCH_SIZE:-32}"
CORPUS_DIR="${CORPUS_DIR:-data/diseases_expanded}"
RETRIEVAL_REPORT="${RETRIEVAL_REPORT:-artifacts/evaluation/bge_m3_v3_candidate_comparison.json}"
GUARDRAIL_REPORT="${GUARDRAIL_REPORT:-artifacts/evaluation/guardrail_v3_candidate_calibration.json}"
PREFLIGHT_REPORT="${PREFLIGHT_REPORT:-artifacts/evaluation/gpu_training_preflight.json}"

backup_partial_run() {
    status=$?
    if (( status != 0 )); then
        targets=()
        for target in \
            "$RAW_MODEL" "$RETRIEVAL_MODEL" "$GUARDRAIL_MODEL" \
            "$RETRIEVAL_REPORT" "$GUARDRAIL_REPORT" \
            "$PREFLIGHT_REPORT" \
            data/finetune/task_triplets_633.manifest.json \
            artifacts/training/environment_freeze.txt \
            artifacts/training/source.bundle; do
            [[ -e "$target" ]] && targets+=("$target")
        done
        if (( ${#targets[@]} > 0 )); then
            "$PYTHON_BIN" scripts/create_training_backup_manifest.py \
                "${targets[@]}" \
                --output artifacts/training/failure_backup_manifest.json || true
        fi
        echo "Pipeline failed with status $status. Preserve the persistent volume and download all existing artifacts before terminating the host." >&2
    fi
}
trap backup_partial_run EXIT

echo "========================================================================="
echo "BGE-M3 MEDICAL V3: PREFLIGHT -> TRAIN -> TWO FP16 ROLES -> GATES -> BACKUP"
echo "Profile: $TRAIN_PROFILE | Base revision: $BASE_MODEL_REVISION"
echo "Raw: $RAW_MODEL"
echo "Retrieval: $RETRIEVAL_MODEL (alpha=$RETRIEVAL_ALPHA)"
echo "Guardrail: $GUARDRAIL_MODEL (alpha=$GUARDRAIL_ALPHA, advisory until approved)"
echo "========================================================================="

echo -e "\n[STEP 1/8] Paid-run preflight and frozen-holdout gate..."
"$PYTHON_BIN" scripts/preflight_gpu_training.py \
    --base-revision "$BASE_MODEL_REVISION" \
    --incumbent "$INCUMBENT_MODEL" \
    --report "$PREFLIGHT_REPORT"
"$PYTHON_BIN" scripts/check_gpu_environment.py --profile "$TRAIN_PROFILE"
"$PYTHON_BIN" -m pytest tests -q
mkdir -p artifacts/training
"$PYTHON_BIN" -m pip freeze > artifacts/training/environment_freeze.txt
git bundle create artifacts/training/source.bundle HEAD

echo -e "\n[STEP 2/8] Rebuild triplets from the exact production corpus and block leakage..."
"$PYTHON_BIN" scripts/build_task_triplets_633.py \
    --corpus-dir "$CORPUS_DIR" \
    --mining-model "$INCUMBENT_MODEL"

echo -e "\n[STEP 3/8] Fine-tune the recoverable raw checkpoint..."
"$PYTHON_BIN" scripts/train_bge_m3.py \
    --base-model "$BASE_MODEL" \
    --base-revision "$BASE_MODEL_REVISION" \
    --triplets-file data/finetune/task_triplets_633.jsonl \
    --out "$RAW_MODEL" \
    --profile "$TRAIN_PROFILE" \
    --lr 1e-5 \
    --epochs 2.0 \
    --resume auto

echo -e "\n[STEP 4/8] Build direct FP16 retrieval and guardrail artifacts from the raw checkpoint..."
"$PYTHON_BIN" scripts/blend_embedding_models.py \
    --base-model "$BASE_MODEL" \
    --base-revision "$BASE_MODEL_REVISION" \
    --tuned-model "$RAW_MODEL" \
    --output "$RETRIEVAL_MODEL" \
    --alpha "$RETRIEVAL_ALPHA" \
    --output-dtype float16
"$PYTHON_BIN" scripts/blend_embedding_models.py \
    --base-model "$BASE_MODEL" \
    --base-revision "$BASE_MODEL_REVISION" \
    --tuned-model "$RAW_MODEL" \
    --output "$GUARDRAIL_MODEL" \
    --alpha "$GUARDRAIL_ALPHA" \
    --output-dtype float16

echo -e "\n[STEP 5/8] Gate retrieval against both BGE-M3 and the production incumbent..."
"$PYTHON_BIN" scripts/compare_embeddings.py \
    --models "$BASE_MODEL" "$INCUMBENT_MODEL" "$RETRIEVAL_MODEL" \
    --gate-baselines "$BASE_MODEL" "$INCUMBENT_MODEL" \
    --base-model-name "$BASE_MODEL" \
    --base-revision "$BASE_MODEL_REVISION" \
    --seq-len 768 \
    --encode-batch-size "$EVAL_BATCH_SIZE" \
    --report "$RETRIEVAL_REPORT" \
    --quality-gate \
    --strict-medical-dominance \
    --min-dense-recall1-gain 0.02

echo -e "\n[STEP 6/8] Calibrate the separate guardrail artifact on validation only..."
"$PYTHON_BIN" scripts/calibrate_guardrail_threshold.py \
    --model "$GUARDRAIL_MODEL" \
    --dataset data/test_cases/generated_benchmark.json \
    --report "$GUARDRAIL_REPORT"

echo -e "\n[STEP 7/8] Verify advisory/auto mode matches the approval result..."
"$PYTHON_BIN" -c 'import json,sys; p=json.load(open(sys.argv[1],encoding="utf-8")); print("deployment_approved:",p["deployment_approved"]); print("semantic_mode:",p["semantic_mode"]); print("blockers:",p.get("approval_blockers",[])); assert p["semantic_mode"] == ("auto" if p["deployment_approved"] else "advisory")' "$GUARDRAIL_REPORT"

echo -e "\n[STEP 8/8] Hash every paid-run artifact before off-machine backup..."
"$PYTHON_BIN" scripts/create_training_backup_manifest.py \
    "$RAW_MODEL" "$RETRIEVAL_MODEL" "$GUARDRAIL_MODEL" \
    "$RETRIEVAL_REPORT" "$GUARDRAIL_REPORT" "$PREFLIGHT_REPORT" \
    data/finetune/task_triplets_633.manifest.json \
    artifacts/training/environment_freeze.txt \
    artifacts/training/source.bundle

echo -e "\n========================================================================="
echo "TRAINING CANDIDATE READY FOR REVIEW — NOT AUTOMATICALLY PROMOTED."
echo "The final clinical holdout remains untouched during tuning. Run its one-time"
echo "evaluation only after the candidate and thresholds are frozen."
echo "Copy raw/candidate models and artifacts/training/backup_manifest.json off the"
echo "persistent GPU volume and verify every SHA-256 before terminating the instance."
echo "========================================================================="
