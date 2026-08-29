# Huấn luyện BGE-M3 trên GPU thuê ngoài

## Cấu hình khuyến nghị

- Lựa chọn mặc định: 1 x NVIDIA A100 80 GB, ổ đĩa persistent tối thiểu 100 GB.
- Tiết kiệm hơn: L40S/A6000/A40 48 GB với profile `cloud-48gb`.
- H100 80 GB chỉ đáng thuê khi ưu tiên giảm thời gian chờ hơn chi phí.
- Không dùng RTX 2050 để tạo model phát hành; profile `local-debug` chỉ kiểm tra pipeline.

Pipeline dùng `CachedMultipleNegativesRankingLoss`: contrastive batch 128 được chia
thành cache mini-batch 16 (A100) hoặc 8 (GPU 48 GB). Sampler bắt buộc mỗi batch
chỉ chứa một anchor cho mỗi bệnh để tránh false in-batch negatives.

Sequence length mặc định là 768. Audit tokenizer cho thấy anchor p99 khoảng 50
token, còn tài liệu bệnh p95 khoảng 748 token; cấu hình cũ 384 cắt gần như toàn
bộ tài liệu.

## Đưa source lên máy cloud

Repo hiện không giả định đã có Git remote. Chọn một trong hai cách:

1. Sau khi cấu hình remote, clone commit đã kiểm thử như bình thường.
2. Không cần remote: từ máy local tạo bundle của commit hiện tại rồi tải lên cloud:

```powershell
git -C D:\BotMedical archive --format=tar.gz -o D:\BotMedical-training.tar.gz HEAD
scp D:\BotMedical-training.tar.gz <user>@<gpu-host>:~/
```

Trên máy cloud:

```bash
mkdir -p ~/BotMedical
tar -xzf ~/BotMedical-training.tar.gz -C ~/BotMedical
cd ~/BotMedical
```

Chọn image PyTorch có CUDA tương thích driver của nhà cung cấp, sau đó cài môi trường:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-train.txt
```

Xác minh trước khi thuê GPU chạy lâu:

```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## Chạy production pipeline

Trên A100/H100 80 GB:

```bash
TRAIN_PROFILE=cloud-a100 bash scripts/run_all.sh 2>&1 | tee training.log
```

Trên GPU 48 GB:

```bash
TRAIN_PROFILE=cloud-48gb EVAL_BATCH_SIZE=16 bash scripts/run_all.sh 2>&1 | tee training.log
```

Nếu phiên SSH bị ngắt, chạy lại đúng lệnh. Trainer tự tìm checkpoint mới nhất
trong `models/bge-m3-medical-v2/_checkpoints` và resume. Nên chạy trong `tmux`
và đặt model/checkpoint trên volume persistent.

## Bản phát hành weight-delta an toàn

Pipeline production giữ riêng hai thư mục model:

- `models/bge-m3-medical-v2-raw`: model fine-tune đầy đủ và checkpoint để resume.
- `models/bge-m3-medical-v2`: model deploy được tạo bằng cách scale weight delta đã học.

`BLEND_ALPHA=0.07` là giá trị mặc định đã được chọn trên benchmark độc lập. Không tăng
giá trị này nếu chưa chạy lại toàn bộ quality gate. Gate cho phép tối đa 0,5 điểm phần
trăm suy giảm ở Recall@1/Recall@5 thông thường và không cho phép bất kỳ suy giảm nào ở
`emergency_recall@5`.

Bản FP16 chỉ được deploy sau khi tự nó qua quality gate và calibration. Luôn lưu kèm
`precision_manifest.json`, báo cáo comparison và báo cáo guardrail calibration của đúng
precision đang chạy trong production.

## Artifact bắt buộc trước khi phát hành

- `models/bge-m3-medical-v2/`: model cuối.
- `training_manifest.json`: tham số, GPU, phiên bản torch, SHA-256 dữ liệu và metric train.
- `artifacts/evaluation/bge_m3_comparison.json`: toàn bộ 476 ca khẩu ngữ và 3.015 ca 603 bệnh.
- `artifacts/evaluation/guardrail_calibration.json`: model + ngưỡng semantic mà runtime production tự nạp.
- `training.log`: log trọn pipeline.

Quality gate sẽ dừng pipeline nếu candidate giảm quá 0,5 điểm phần trăm ở
Recall@1 hoặc Recall@5 so với BAAI/bge-m3 trên dense/hybrid retrieval. Không
thay model production chỉ dựa vào training loss.

Calibration dùng toàn bộ benchmark có nhãn cấp cứu, loại câu trùng, ghi confusion
matrix và Wilson 95% CI. “0 false negatives” trong report chỉ có nghĩa là không
quan sát thấy ca bỏ sót trên tập hữu hạn này, không phải bảo đảm tuyệt đối. Script
sẽ fail nếu semantic model không nạp được, và sau khi ghi config sẽ khởi tạo lại
`ClinicalGuardrailEngine()` theo đúng đường production để xác minh model/ngưỡng.
