#!/bin/bash
# run_all.sh — Pipeline tự động chạy tuần tự trên GPU box (có chốt an toàn)
# Cách dùng: bash scripts/run_all.sh

cd /workspace/BotMedical

# Khởi động Ollama nếu chưa chạy ngầm
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Đang khởi động Ollama service..."
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
fi

echo "============================================================"
echo "BƯỚC 1: Kéo Qwen2.5-7B (~4.7GB) & Sinh generated_benchmark"
echo "        (Tái tạo ~550 ca khẩu ngữ bệnh nhân đa dạng)"
echo "============================================================"
ollama pull qwen2.5:7b-instruct
python scripts/gpu_generate_benchmark.py --model qwen2.5:7b-instruct --per-disease 20

echo ""
echo "============================================================"
echo "BƯỚC 2: Train BGE-M3 Task-only (~68s)"
echo "        (588 unidecoded + ~550 generated anchors = ~1,000 triplets)"
echo "============================================================"
python scripts/train_bge_m3.py --stages 2 --batch-size 4 --seq-len 256

echo ""
echo "============================================================"
echo "BƯỚC 3: Đo lường & Chẩn đoán trực tiếp trên GPU"
echo "============================================================"
python scripts/compare_embeddings.py --models bge-m3 models/bge-m3-medical
python scripts/diagnose_failure.py || true

echo ""
echo "============================================================"
echo "🛑 CHỐT AN TOÀN — HÃY KÉO MODEL VỀ LOCAL NGAY BÂY GIỜ!"
echo "============================================================"
echo "Mở Terminal trên máy Windows của bạn (thay <PORT> và <HOST>):"
echo ""
echo "  scp -P <PORT> -r root@<HOST>:/workspace/BotMedical/models D:/BotMedical/"
echo "  scp -P <PORT> root@<HOST>:/workspace/BotMedical/data/test_cases/generated_benchmark.json D:/BotMedical/data/test_cases/"
echo ""
echo "------------------------------------------------------------"
read -p ">> Bạn đã kéo model về máy an toàn chưa? (y/N để tiếp tục): " model_saved
if [[ ! "$model_saved" =~ ^[Yy]$ ]]; then
    echo "Dừng script để bạn kịp kéo dữ liệu. Sau khi kéo xong chạy tiếp Bước 4 & 5 thủ công."
    exit 0
fi

echo ""
echo "============================================================"
echo "BƯỚC 4: Kéo Qwen2.5:32b & Sát hạch Giám khảo (Calibrate)"
echo "============================================================"
ollama pull qwen2.5:32b
python scripts/calibrate_llm_judge.py

echo ""
echo "============================================================"
echo "BƯỚC 5: Gán nhãn Benchmark thực tế (Consensus 2 lượt)"
echo "============================================================"
read -p ">> Kết quả sát hạch đạt chuẩn (FPR <= 20%)? Cho phép gán nhãn? (y/N): " allow_label
if [[ "$allow_label" =~ ^[Yy]$ ]]; then
    python scripts/auto_label_ollama.py
    echo ""
    echo "============================================================"
    echo "HOÀN TẤT GÁN NHÃN. Kéo các file nhãn về local:"
    echo ""
    echo "  scp -P <PORT> root@<HOST>:/workspace/BotMedical/data/test_cases/llm_annotated_benchmark.json D:/BotMedical/data/test_cases/"
    echo "  scp -P <PORT> root@<HOST>:/workspace/BotMedical/data/test_cases/spot_check_sample.json D:/BotMedical/data/test_cases/"
    echo "============================================================"
else
    echo "⏭️  Bỏ qua gán nhãn tự động theo chỉ định."
fi
