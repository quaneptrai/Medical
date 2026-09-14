# Hướng dẫn cài đặt & chạy — Phòng khám Quang Thanh

Tài liệu này dành cho **người dùng mới** muốn chạy hệ thống trên máy của mình (Windows).
Chỉ cần 2 lệnh: `setup.ps1` để cài, `start-botmedical.ps1` để chạy.

---

## 1. Yêu cầu máy

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Windows | 10 / 11 | PowerShell có sẵn |
| **Python** | **3.10 hoặc 3.11** | Tải tại https://www.python.org/downloads/ — khi cài nhớ tick **"Add python.exe to PATH"** |
| **Node.js** | **22+ (đã kiểm tra với 24)** | Tải tại https://nodejs.org/ |
| RAM | 8 GB trở lên (16 GB tốt hơn) | |
| Ổ cứng trống | ~10 GB | thư viện Python ~2 GB + model 1.1 GB |
| GPU NVIDIA | *không bắt buộc* | không có GPU thì chạy CPU, chỉ chậm ở lần tìm kiếm đầu tiên |

> **Không cần Ollama, không cần API key** để chạy web. Xem [mục 6](#6-về-llm-ollama--gemini).

---

## 2. Lấy mã nguồn và model

Model **đã nằm sẵn trong Git**, không phải copy tay. Chỉ cần clone:

```powershell
git clone https://github.com/quaneptrai/Medical.git D:\BotMedical
cd D:\BotMedical
```

### Model embedding được đóng gói thế nào

GitHub chặn mọi file lớn hơn 100 MB, mà `model.safetensors` nặng **1.1 GB**. Vì vậy trọng số được commit dưới dạng **88 mảnh** (kích thước từng mảnh ghi trong manifest, tối đa 95 MiB; các phần bổ sung tối đa 4 MiB):

```
models\bge-m3-medical-v2-recovered-a050-fp16\
├── parts\
│   ├── model.safetensors.part.*   <-- 88 parts, sizes recorded in manifest, có trong Git
│   └── parts_manifest.json                   <-- số mảnh + SHA-256 từng mảnh
├── config.json, modules.json, tokenizer.json, …
├── 1_Pooling\, 2_Normalize\
└── model.safetensors        <-- setup.ps1 tự ghép ra, KHÔNG có trong Git
```

`setup.ps1` sẽ tự ghép 88 mảnh thành `model.safetensors` rồi đối chiếu SHA-256 với `models\registry.json`. Nếu sai một byte, file ghép bị xoá và script báo lỗi — không bao giờ chạy với model hỏng.

Muốn ghép thủ công hoặc kiểm tra lại:

```powershell
.\scripts\model-parts.ps1 -Mode join      # ghép lại (tự bỏ qua nếu đã đúng)
.\scripts\model-parts.ps1 -Mode verify    # chỉ kiểm tra SHA-256
```

> **Cho người bảo trì:** sau khi train lại hoặc thay model, chạy `.\scripts\model-parts.ps1 -Mode split -Force` rồi commit thư mục `parts\`.

---

## 3. Cài đặt — chạy 1 lệnh

```powershell
cd D:\BotMedical
.\setup.ps1
```

Script tự động cài phụ thuộc, khởi tạo danh mục/tài khoản quản trị cục bộ rồi chuẩn bị model và chỉ mục:

1. Tìm Python 3.10/3.11 và tạo môi trường ảo `venv\`
2. Cài toàn bộ thư viện Python từ `requirements.txt`
3. Kiểm tra Node.js
4. Chạy `npm ci --ignore-scripts` cho web (`frontend\clinic`)
5. Tạo file `.env` từ `.env.example`
6. Ghép model embedding từ 88 mảnh trong `parts\` và kiểm tra SHA-256
7. Dựng chỉ mục vector ChromaDB cho 652 bệnh

**Thời gian:** lần đầu 10–30 phút (chủ yếu tải thư viện). Chạy lại lần sau chỉ mất vài giây — script tự bỏ qua các bước đã xong.

### Tham số tùy chọn

```powershell
.\setup.ps1 -Device cuda -BatchSize 32   # máy có GPU NVIDIA + torch bản CUDA
.\setup.ps1 -ForceIndex                  # dựng lại chỉ mục từ đầu
.\setup.ps1 -SkipIndex                   # bỏ qua bước dựng chỉ mục
```

### Nếu PowerShell chặn không cho chạy script

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Trả lời `Y`, rồi chạy lại `.\setup.ps1`.

---

### Tài khoản quản trị và dữ liệu máy mới

`setup.ps1` gọi `npm run db:init` để tạo schema và nạp danh mục công khai (40 bác sĩ, chuyên khoa, dịch vụ, vai trò/quyền). Script không sao chép tài khoản/người bệnh từ máy phát triển. Tài khoản quản trị mới dùng mật khẩu ngẫu nhiên; xem `frontend/clinic/data/bootstrap-admin.json` trên máy của bạn. File này bị Git bỏ qua. Có thể đặt `BOTMED_ADMIN_EMAIL` và `BOTMED_ADMIN_PASSWORD` trước lần khởi tạo đầu tiên.

Chạy lại chỉ bổ sung dữ liệu seed chưa có, không đặt lại mật khẩu, phân quyền hoặc sửa danh mục đã chỉnh. Nếu DB đã có quản trị, dùng tài khoản hiện có; script không tạo thêm quản trị mặc định. Lịch hẹn, thanh toán và hội thoại ban đầu trống. Các script `seed-operations.cjs` / `seed-doctor-accounts.cjs` là công cụ demo tùy chọn, không chạy tự động.

Chạy riêng frontend: `cd frontend/clinic`, `npm ci --ignore-scripts`, `npm run dev`. Build production: `npm run build` rồi `npm start`; AI tìm triệu chứng cần backend và model đã cài qua setup.

## 4. Khởi chạy

```powershell
.\start-botmedical.ps1
```

Script sẽ:

- Kiểm tra trước (venv, node_modules, model, chỉ mục, cổng trống) — thiếu gì báo ngay thay vì chạy rồi lỗi
- Mở **2 cửa sổ**: `YG Backend (FastAPI :8000)` và `YG Web (Next.js :3000)`
- **Chờ tới khi backend thật sự sẵn sàng**, in ra số bệnh đã nạp
- Tự mở trình duyệt vào http://localhost:3000

| Địa chỉ | Nội dung |
|---|---|
| http://localhost:3000 | Trang chủ Phòng khám Quang Thanh |
| http://localhost:3000/tro-ly | Bàn tư vấn triệu chứng |
| http://localhost:3000/dat-lich | Đặt lịch khám |
| http://127.0.0.1:8000/api/docs | Swagger UI của backend |

> **Lưu ý:** lần tìm kiếm triệu chứng **đầu tiên mất ~40 giây** vì phải nạp model 1.1 GB vào RAM. Các lần sau trả kết quả dưới 1 giây.

### Tham số tùy chọn

```powershell
.\start-botmedical.ps1 -NoBrowser                          # không tự mở trình duyệt
.\start-botmedical.ps1 -BackendPort 8010 -FrontendPort 3010 # đổi cổng nếu bị trùng
.\start-botmedical.ps1 -NoReload                            # tắt auto-reload (nhẹ máy hơn)
.\start-botmedical.ps1 -SkipChecks                          # bỏ qua kiểm tra trước
```

---

## 5. Dừng hệ thống

```powershell
.\stop-botmedical.ps1
```

Đóng cả 2 cửa sổ dịch vụ và giải phóng cổng 8000 / 3000. Dùng lệnh này khi gặp lỗi "Port is already in use".

---

## 6. Về LLM (Ollama / Gemini)

**Web không gọi LLM.** Luồng xử lý của trang `/tro-ly` là:

```
Trình duyệt → Next.js /api/search → FastAPI :8000/api/search
            → Red-flag guardrail (regex) + Hybrid retrieval (ChromaDB + BM25)
```

Vì vậy **không cần cài Ollama, không cần GEMINI_API_KEY** để web chạy được.

LLM chỉ dùng cho các script dòng lệnh trong `scripts\` (`test_chat.py`, `run_golden_eval.py`, `run_eval.py`). Nếu muốn dùng chúng:

- **Ollama (chạy local):** cài Ollama, `ollama pull llama3.1:8b`, bật `ollama serve`
- **Gemini (qua API):** điền `GEMINI_API_KEY` vào `.env` và đặt `BOTMED_LLM_PROVIDER=gemini`

---

## 7. Xử lý sự cố

| Lỗi | Cách khắc phục |
|---|---|
| `cannot be loaded because running scripts is disabled` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `No suitable Python found` | Cài Python 3.11, nhớ tick "Add python.exe to PATH", mở lại PowerShell |
| `Node.js is not installed or not on PATH` | Cài Node.js 20 LTS rồi mở lại PowerShell |
| `The fine-tuned embedding model is missing` | Clone chưa đủ mảnh model. Chạy `git pull` rồi `.\setup.ps1` lại |
| `Could not reassemble the embedding model` | Mảnh bị hỏng hoặc thiếu. `git pull`, rồi `.\scripts\model-parts.ps1 -Mode join -Force` |
| `Port 8000 / 3000 is already in use` | `.\stop-botmedical.ps1` hoặc đổi cổng bằng `-BackendPort` / `-FrontendPort` |
| `The retrieval index has not been built` | `.\setup.ps1` (hoặc `.\setup.ps1 -ForceIndex`) |
| Web báo "Dịch vụ đang ngoại tuyến" | Backend chưa sẵn sàng — xem cửa sổ `YG Backend` để đọc lỗi |
| Tìm kiếm đầu tiên rất lâu | Bình thường, ~40s để nạp model trên CPU |
| `npm install` lỗi | Xóa `frontend\clinic\node_modules` rồi chạy lại `.\setup.ps1` |

---

## 8. Bảng lệnh nhanh

```powershell
.\setup.ps1                # cài đặt (chạy 1 lần, an toàn khi chạy lại)
.\start-botmedical.ps1     # chạy backend + web
.\stop-botmedical.ps1      # dừng tất cả

# Chạy test
.\venv\Scripts\python.exe -m pytest tests\ -q

# Dựng lại chỉ mục sau khi thêm bệnh mới vào data\diseases_expanded\
.\setup.ps1 -ForceIndex
```

## Ghi chú dependency trên Windows

Lockfile hiện dùng `better-sqlite3@13.0.3` với binary đi kèm. npm có thể tự gọi `node-gyp rebuild` dù package đặt `gypfile:false`; vì vậy quy trình dùng `npm ci --ignore-scripts`, rồi chạy rõ ràng `npm run db:init` / `npm run dev` / `npm run build`. Không đặt `ignore-scripts=true` toàn cục vì cần các bước predev/prebuild của dự án. Tham khảo [issue upstream](https://github.com/WiseLibs/better-sqlite3/issues/1516).

Bản Next.js khóa trong dự án hiện là 15.1.7. npm cảnh báo bản này có lỗ hổng đã công bố; quy trình này xác minh clone/cài/chạy cục bộ, chưa phải bản đã được nâng cấp và kiểm định để mở ra Internet. Xem [thông báo Next.js](https://nextjs.org/blog/CVE-2025-66478) trước triển khai công khai.
