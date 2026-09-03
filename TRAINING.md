# Huấn luyện BGE-M3 trên GPU thuê ngoài

## Cấu hình khuyến nghị

- Lựa chọn đã kiểm tra cho run kế tiếp: 1 x NVIDIA A100 PCIe 40 GB, ổ đĩa
  persistent tối thiểu 100 GB, profile `cloud-a100`.
- A100 80 GB dùng profile `cloud-a100-80` nếu muốn tăng cache mini-batch từ 8 lên 16.
- Tiết kiệm hơn: L40S/A6000/A40 48 GB với profile `cloud-48gb`.
- H100 80 GB chỉ đáng thuê khi ưu tiên giảm thời gian chờ hơn chi phí.
- Không dùng RTX 2050 để tạo model phát hành; profile `local-debug` chỉ kiểm tra pipeline.

Pipeline dùng `CachedMultipleNegativesRankingLoss`: contrastive batch 128 được chia
thành cache mini-batch 8 (A100 40 GB/GPU 48 GB) hoặc 16 (A100 80 GB). Sampler bắt buộc mỗi batch
chỉ chứa một anchor cho mỗi bệnh để tránh false in-batch negatives.

## Cổng bắt buộc trên máy local trước khi thuê GPU

Không thuê GPU khi bất kỳ lệnh nào dưới đây chưa thành công:

```powershell
cd D:\BotMedical
venv\Scripts\python.exe scripts\build_600_diseases_kb.py
venv\Scripts\python.exe scripts\validate_common_49_readiness.py --require-clinical-review
venv\Scripts\python.exe scripts\audit_clinical_review_progress.py --require-ready
venv\Scripts\python.exe scripts\build_clinical_holdout.py --dataset-id clinical-final-v1
venv\Scripts\python.exe scripts\validate_clinical_holdout.py data/test_cases/clinical_holdout.json
venv\Scripts\python.exe scripts\preflight_gpu_training.py --base-revision 5617a9f61b028005a4858fdac845db406aefb181
venv\Scripts\python.exe -m pytest tests -q
git status --short
```

`git status --short` phải không in gì. Bảng
`data/clinical_review/common_49_review.csv` cần reviewer lâm sàng duyệt đủ 49 dòng.
`data/clinical_review/clinical_adjudication.csv` cần hai reviewer độc lập và một
adjudicator; không tự điền reviewer hay nhãn bằng LLM. Với 441 ca nguồn hiện có,
tối đa chỉ được loại 41 ca nếu muốn còn đủ 400 ca gồm ít nhất 200 cấp cứu và 200 ca thường.

Validation `common_49_validation.json` có 245 ca (5 ca cho mỗi bệnh) là tập
model-selection tổng hợp, không phải bằng chứng lâm sàng. Candidate phải đạt đồng thời:

- dense Recall@1 >= 80%, Recall@5 >= 95%;
- hybrid Recall@1 >= 90%, Recall@5 >= 98%;
- Recall@5 của từng bệnh >= 80%;
- dense Recall@1 tăng ít nhất 2 điểm phần trăm so với incumbent, trừ khi đã đạt >=90%.

Triplet mới lấy hard negative từ cả BM25 và các tài liệu mà model production hiện tại
xếp gần/sai cho từng anchor. Mọi anchor trùng validation, golden hoặc frozen clinical
holdout bị loại trước khi dense mining; manifest ghi rõ mining model và nguồn negative.

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

Model binary nằm ngoài Git. Phải tải thêm incumbent
`models/bge-m3-medical-v2-recovered-a050-fp16/` lên cùng cây thư mục để quality gate
so candidate với production. Sau khi holdout hoàn tất, bảo đảm file holdout và manifest
đã nằm trong source bundle. Có thể chạy `scripts/preflight_gpu_training.py` trên CPU
trước khi bật/rent GPU; lệnh này không cần CUDA.

Chọn image PyTorch có CUDA tương thích driver của nhà cung cấp, sau đó cài môi trường:

```bash
python -m venv --system-site-packages .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-train.txt
```

Xác minh trước khi thuê GPU chạy lâu:

```bash
python -c "import torch; p=torch.cuda.get_device_properties(0); print(torch.__version__, torch.version.cuda); print(torch.cuda.is_available(), torch.cuda.get_device_name(0), round(p.total_memory/1024**3,1), torch.cuda.is_bf16_supported()); assert torch.cuda.is_available() and p.total_memory/1024**3 >= 39 and torch.cuda.is_bf16_supported()"
python scripts/check_gpu_environment.py --profile cloud-a100
```

## Chạy production pipeline

Pipeline sẽ dừng trước khi dùng GPU nếu final holdout chưa được con người adjudicate,
chưa đủ 200/200 hoặc SHA-256 không khớp manifest. Hoàn tất ba lệnh trong
`CLINICAL_VALIDATION.md` trước. Holdout được đóng băng trước train nhưng không được dùng
để chọn model hay hyperparameter.

Trên A100 PCIe 40 GB:

```bash
TRAIN_PROFILE=cloud-a100 bash scripts/run_all.sh 2>&1 | tee training.log
```

Trên A100/H100 80 GB:

```bash
TRAIN_PROFILE=cloud-a100-80 bash scripts/run_all.sh 2>&1 | tee training.log
```

Trên GPU 48 GB:

```bash
TRAIN_PROFILE=cloud-48gb EVAL_BATCH_SIZE=16 bash scripts/run_all.sh 2>&1 | tee training.log
```

Nếu phiên SSH bị ngắt, chạy lại đúng lệnh. Trainer tự tìm checkpoint mới nhất
trong `models/bge-m3-medical-v2/_checkpoints` và resume. Nên chạy trong `tmux`
và đặt model/checkpoint trên volume persistent.

Base model được khóa ở commit Hugging Face
`5617a9f61b028005a4858fdac845db406aefb181`; chỉ đổi `BASE_MODEL_REVISION` sau khi đã
review và ghi nhận rõ migration.

## Hai bản weight-delta tách biệt

Pipeline production giữ riêng hai thư mục model:

- `models/bge-m3-medical-v3-raw`: checkpoint fine-tune đầy đủ để resume và tái tạo.
- `models/bge-m3-medical-v3-retrieval-a050-fp16`: candidate retrieval alpha 0,50.
- `models/bge-m3-medical-v3-guardrail-a007-fp16`: candidate semantic guardrail alpha 0,07.

Hai artifact được blend trực tiếp từ checkpoint raw rồi xuất FP16; không còn suy ngược
alpha 0,50 từ một bản FP16 alpha 0,07. Retrieval candidate phải không thua cả
`BAAI/bge-m3` lẫn incumbent `bge-m3-medical-v2-recovered-a050-fp16`. Gate cho phép tối
đa 0,5 điểm phần trăm suy giảm Recall@1/Recall@5 và không cho phép suy giảm
`emergency_recall@5`.

Alpha 0,07 đã được chọn trên validation 34/432, nên candidate guardrail vẫn phải ở
`advisory` trừ khi một đánh giá final độc lập đạt ít nhất 200/200, không quan sát false
negative và specificity tối thiểu 90%. Rule deterministic/regex vẫn sở hữu auto-escalate.

Bản FP16 chỉ được deploy sau khi tự nó qua quality gate và calibration. Luôn lưu kèm
`precision_manifest.json`, báo cáo comparison và báo cáo guardrail calibration của đúng
precision đang chạy trong production.

## Artifact bắt buộc trước khi phát hành

- Raw checkpoint và cả hai candidate FP16 nêu trên.
- `training_manifest.json`: tham số, GPU, phiên bản torch, SHA-256 dữ liệu và metric train.
- `artifacts/evaluation/bge_m3_comparison.json`: toàn bộ 476 ca khẩu ngữ và 3.015 ca 603 bệnh.
- `artifacts/evaluation/guardrail_calibration.json`: báo cáo calibration; semantic chỉ chạy
  ở chế độ advisory trừ khi artifact vượt đồng thời recall/specificity gate và được đánh
  dấu `deployment_approved=true`.
- `training.log`: log trọn pipeline.
- `artifacts/training/environment_freeze.txt`: package versions của đúng máy train.
- `artifacts/training/backup_manifest.json`: danh sách file, kích thước và SHA-256 để
  xác minh bản copy ngoài máy GPU.

Quality gate production dùng chế độ `strict-medical-dominance`: candidate phải cao hơn
BGE-M3 gốc ở tất cả metric y khoa chưa chạm trần (Recall@1/3/5 và MRR, cả
dense/hybrid), giữ nguyên metric an toàn đã chạm 100%, tăng ít nhất 2 điểm phần trăm
dense Recall@1 trên mỗi benchmark, và không được kém model production hiện tại. Không
thay model production chỉ dựa vào training loss.

Calibration dùng benchmark có nhãn cấp cứu, loại câu trùng, ghi confusion matrix và
Wilson 95% CI. “0 false negatives” trong report chỉ có nghĩa là không quan sát thấy ca
bỏ sót trên tập hữu hạn này, không phải bảo đảm tuyệt đối. Mặc định script yêu cầu ít
nhất 200 ca cấp cứu, 200 ca thường và specificity >= 90%; tập 34/432 hiện tại không đủ
để bật semantic auto. Lỗi nạp hoặc suy luận semantic không được âm thầm bỏ qua.

Sau khi pipeline kết thúc, giữ máy trên volume persistent, tải ngay raw checkpoint, hai
candidate, reports, `training.log` và `backup_manifest.json` xuống nơi lưu trữ khác; xác
minh từng SHA-256 rồi mới hủy GPU. Final holdout chỉ được chạy một lần sau khi candidate,
threshold và mọi cấu hình đã khóa; không dùng nó để chọn alpha, threshold, BM25 weight.

Chỉ sau khi pipeline validation đã hoàn tất và mọi artifact đã khóa, chạy final holdout
đúng một lần:

```bash
python scripts/evaluate_final_clinical_holdout.py \
  --device cuda \
  --acknowledge-final-evaluation \
  --report artifacts/evaluation/final_clinical_holdout_v3.json
python scripts/create_training_backup_manifest.py \
  models/bge-m3-medical-v3-raw \
  models/bge-m3-medical-v3-retrieval-a050-fp16 \
  models/bge-m3-medical-v3-guardrail-a007-fp16 \
  artifacts/evaluation/bge_m3_v3_candidate_comparison.json \
  artifacts/evaluation/guardrail_v3_candidate_calibration.json \
  artifacts/evaluation/final_clinical_holdout_v3.json \
  data/finetune/task_triplets_633.manifest.json \
  --output artifacts/training/backup_manifest.json
```

Nếu final holdout thất bại, không chỉnh model rồi đo lại trên cùng holdout. Tạo một
holdout phiên bản mới trước lần đánh giá của candidate đã thay đổi.

## LoRA LLM không thuộc pipeline này

`train_medical_lora.py` là thử nghiệm riêng và mặc định từ chối prose-only SFT vì dữ liệu
hiện không dạy schema `new_symptoms/new_red_flags/stage`. Không cài Unsloth/TRL hoặc thuê
GPU LoRA trong đợt BGE này.
