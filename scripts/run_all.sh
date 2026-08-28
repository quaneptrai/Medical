#!/bin/bash
# run_all.sh — Chạy tuần tự toàn bộ pipeline trên GPU box.
# Cách dùng: bash run_all.sh
#
# Yêu cầu:
#   - Đã git pull bundle mới nhất
#   - Ollama đang chạy (systemctl start ollama)
#   - pip install sentence-transformers datasets rank_bm25 tqdm requests pandas
#
# Dừng ngay nếu bất kỳ bước nào lỗi.
set -euo pipefail

cd /workspace/BotMedical

echo "============================================================"
echo "BƯỚC 0: Kéo Qwen2.5:32b cho labeling (nếu chưa có)"
echo "============================================================"
ollama pull qwen2.5:32b

echo ""
echo "============================================================"
echo "BƯỚC 1: Train BGE-M3 (Stage 2 only, ~68 giây)"
echo "         588 triplets (294 có dấu + 294 không dấu)"
echo "============================================================"
python scripts/train_bge_m3.py --stages 2 --batch-size 4 --seq-len 256

echo ""
echo "============================================================"
echo "BƯỚC 2: Đo lường BGE-M3 gốc vs fine-tuned"
echo "         Mốc phải vượt: R@1 78.9% | Safety@1 80% | margin 0.1090"
echo "============================================================"
python scripts/compare_embeddings.py --models bge-m3 models/bge-m3-medical

echo ""
echo "============================================================"
echo "BƯỚC 3: Chẩn đoán ca cấp cứu bị trượt (nếu còn)"
echo "============================================================"
python scripts/diagnose_failure.py || true

echo ""
echo "============================================================"
echo "BƯỚC 4: Sát hạch Qwen2.5:32b (giám khảo gán nhãn)"
echo "         Nếu FPR > 20% → DỪNG, không chạy bước 5"
echo "============================================================"
python scripts/calibrate_llm_judge.py

echo ""
echo "============================================================"
echo "BƯỚC 5: Gán nhãn 441 ca (Consensus, 2 lượt đảo danh sách)"
echo "         ⚠️ Chỉ chạy nếu bước 4 đạt chuẩn!"
echo "============================================================"
read -p "Bước 4 đạt chuẩn? Tiếp tục gán nhãn? (y/N): " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    python scripts/auto_label_ollama.py
else
    echo "⏭️  Bỏ qua gán nhãn — chờ đánh giá thủ công."
fi

echo ""
echo "============================================================"
echo "HOÀN TẤT. Kéo kết quả về máy NGAY:"
echo ""
echo "  scp -P 1740 -r root@n2.ckey.vn:/workspace/BotMedical/models D:/BotMedical/"
echo "  scp -P 1740 root@n2.ckey.vn:/workspace/BotMedical/data/test_cases/llm_annotated_benchmark.json D:/BotMedical/data/test_cases/"
echo "  scp -P 1740 root@n2.ckey.vn:/workspace/BotMedical/data/test_cases/spot_check_sample.json D:/BotMedical/data/test_cases/"
echo ""
echo "!! GPU box là máy thuê one-session. Tắt là mất hết !!"
echo "============================================================"
