#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PYTHON_BIN="${PYTHON_BIN:-python}"
TRAIN_PROFILE="${TRAIN_PROFILE:-cloud-a100}"
OUTPUT_MODEL="${OUTPUT_MODEL:-models/bge-m3-medical-v2}"
RAW_MODEL="${RAW_MODEL:-${OUTPUT_MODEL}-raw}"
BLEND_ALPHA="${BLEND_ALPHA:-0.07}"
EVAL_BATCH_SIZE="${EVAL_BATCH_SIZE:-32}"

echo "========================================================================="
echo "BGE-M3 MEDICAL: BUILD -> TRAIN -> SAFE BLEND -> EVAL -> CALIBRATION"
echo "Profile: $TRAIN_PROFILE | Raw: $RAW_MODEL | Output: $OUTPUT_MODEL | Blend: $BLEND_ALPHA"
echo "========================================================================="

echo -e "\n[STEP 1/6] Environment preflight..."
"$PYTHON_BIN" -c 'import torch; print("torch:", torch.__version__); print("cuda:", torch.cuda.is_available()); print("gpu:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else None); assert torch.cuda.is_available(), "CUDA PyTorch is required for the production run"'
"$PYTHON_BIN" -m pytest tests/test_schema.py tests/test_retrieval.py tests/test_pipeline_hardening.py -q

echo -e "\n[STEP 2/6] Rebuild hard-negative triplets and enforce leakage checks..."
"$PYTHON_BIN" scripts/build_task_triplets_633.py

echo -e "\n[STEP 3/6] Fine-tune the raw BGE-M3 candidate (checkpoints auto-resume)..."
"$PYTHON_BIN" scripts/train_bge_m3.py \
    --base-model BAAI/bge-m3 \
    --triplets-file data/finetune/task_triplets_633.jsonl \
    --out "$RAW_MODEL" \
    --profile "$TRAIN_PROFILE" \
    --lr 1e-5 \
    --epochs 2.0 \
    --resume auto

echo -e "\n[STEP 4/6] Scale the learned delta to preserve general retrieval and safety..."
"$PYTHON_BIN" scripts/blend_embedding_models.py \
    --base-model BAAI/bge-m3 \
    --tuned-model "$RAW_MODEL" \
    --output "$OUTPUT_MODEL" \
    --alpha "$BLEND_ALPHA"

echo -e "\n[STEP 5/6] Evaluate every reserved case and enforce all no-regression gates..."
"$PYTHON_BIN" scripts/compare_embeddings.py \
    --models BAAI/bge-m3 "$OUTPUT_MODEL" \
    --seq-len 768 \
    --encode-batch-size "$EVAL_BATCH_SIZE" \
    --quality-gate

echo -e "\n[STEP 6/6] Recalibrate emergency semantic threshold with the candidate model..."
"$PYTHON_BIN" scripts/calibrate_guardrail_threshold.py \
    --model "$OUTPUT_MODEL" \
    --report artifacts/evaluation/guardrail_calibration.json

echo -e "\n========================================================================="
echo "SUCCESS: model, manifest, full evaluation report, and safety calibration are ready."
echo "Do not promote the model until the reports in artifacts/evaluation are reviewed."
echo "========================================================================="
