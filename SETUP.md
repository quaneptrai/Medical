# Hướng dẫn cài đặt & chạy — Phòng khám YG

Tài liệu này dành cho **người dùng mới** muốn chạy hệ thống trên máy của mình (Windows).
Chỉ cần 2 lệnh: `setup.ps1` để cài, `start-botmedical.ps1` để chạy.

---

## 1. Yêu cầu máy

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Windows | 10 / 11 | PowerShell có sẵn |
| **Python** | **3.10 hoặc 3.11** | Tải tại https://www.python.org/downloads/ — khi cài nhớ tick **"Add python.exe to PATH"** |
| **Node.js** | **18+ (khuyến nghị 20 LTS)** | Tải tại https://nodejs.org/ |
| RAM | 8 GB trở lên (16 GB tốt hơn) | |
| Ổ cứng trống | ~10 GB | thư viện Python ~2 GB + model 1.1 GB |
| GPU NVIDIA | *không bắt buộc* | không có GPU thì chạy CPU, chỉ chậm ở lần tìm kiếm đầu tiên |

> **Không cần Ollama, không cần API key** để chạy web. Xem [mục 6](#6-về-llm-ollama--gemini).

---

## 2. Lấy mã nguồn và model

### 2.1 Mã nguồn

```powershell
git clone https://github.com/quaneptrai/Medical.git D:\BotMedical
cd D:\BotMedical
```

### 2.2 Model embedding (BẮT BUỘC — không có trong Git)

File trọng số nặng **1.1 GB** nên không được đẩy lên Git. Bạn phải **copy thủ công** thư mục sau từ máy đã có sẵn (USB, ổ mạng, Google Drive…):

```
models\bge-m3-medical-v2-recovered-a050-fp16\
├── model.safetensors        <-- 1.1 GB, quan trọng nhất
├── config.json
├── config_sentence_transformers.json
├── modules.json
├── sentence_bert_config.json
├── special_tokens_map.json
├── tokenizer.json
├── tokenizer_config.json
├── 1_Pooling\
└── 2_Normalize\
```

Đặt đúng đường dẫn `D:\BotMedical\models\bge-m3-medical-v2-recovered-a050-fp16\`.
Thiếu bước này, `setup.ps1` sẽ dừng và báo lỗi rõ ràng.

---

## 3. Cài đặt — chạy 1 lệnh

```powershell
cd D:\BotMedical
.\setup.ps1
```

Script sẽ tự động làm 7 bước:

1. Tìm Python 3.10/3.11 và tạo môi trường ảo `venv\`
2. Cài toàn bộ thư viện Python từ `requirements.txt`
3. Kiểm tra Node.js
4. Chạy `npm install` cho web (`frontend\clinic`)
5. Tạo file `.env` từ `.env.example`
6. Kiểm tra model embedding đã có chưa
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
| http://localhost:3000 | Trang chủ Phòng khám YG |
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
| `The fine-tuned embedding model is missing` | Copy thư mục model theo [mục 2.2](#22-model-embedding-bắt-buộc--không-có-trong-git) |
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
