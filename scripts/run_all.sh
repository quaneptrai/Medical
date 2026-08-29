#!/usr/bin/env bash
set -e

echo "========================================================================="
echo "QUY TRÌNH TỰ ĐỘNG: HUẤN LUYỆN & ĐÁNH GIÁ BGE-M3 TRÊN 633 BỆNH"
echo "========================================================================="

# 1. Tạo sẵn thư mục
mkdir -p data/finetune models data/test_cases

# 2. Sinh tập Triplet với BM25 Hard Negatives & Kiểm tra rò rỉ 0 câu
echo -e "\n[BƯỚC 1/4] Đào Hard Negatives bằng BM25 và Kiểm tra rò rỉ dữ liệu..."
python scripts/build_task_triplets_633.py

# 3. Huấn luyện BGE-M3 từ gốc BAAI/bge-m3
echo -e "\n[BƯỚC 2/4] Bắt đầu huấn luyện BGE-M3 trên GPU..."
python scripts/train_bge_m3.py \
    --base-model BAAI/bge-m3 \
    --triplets-file data/finetune/task_triplets_633.jsonl \
    --out models/bge-m3-medical-v2 \
    --batch-size 16 \
    --seq-len 384 \
    --lr 2e-5 \
    --epochs 2.0

# 4. Đánh giá so sánh trên cả 2 bộ Benchmark
echo -e "\n[BƯỚC 3/4] Chạy bảng đánh giá so sánh 3 mô hình trên cả 2 bộ test..."
python scripts/compare_embeddings.py \
    --models BAAI/bge-m3 models/bge-m3-medical models/bge-m3-medical-v2 \
    --limit-603 500

# 5. Hiệu chỉnh lại ngưỡng Guardrails cho model mới
echo -e "\n[BƯỚC 4/4] Tái hiệu chỉnh ngưỡng Guardrails cấp cứu cho model mới..."
python scripts/calibrate_guardrail_threshold.py

echo -e "\n========================================================================="
echo "[HOÀN THÀNH] Toàn bộ quy trình đã xong. Hãy nén và tải models/bge-m3-medical-v2 về ngay!"
echo "========================================================================="
