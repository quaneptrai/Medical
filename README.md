# Phòng khám YG — Trợ lý Y tế & Hệ thống Định hướng Triệu chứng AI (AI Health OS)

Hệ thống trợ lý y tế thông minh hỗ trợ người bệnh mô tả triệu chứng bằng ngôn ngữ tự nhiên, tự động sàng lọc dấu hiệu cấp cứu nguy hiểm (Red Flags), tra cứu định hướng bệnh học dựa trên cơ sở tri thức 652 bệnh, chỉ dẫn đúng chuyên khoa và kết nối lịch khám bác sĩ tại **Phòng khám Đa khoa Quốc tế YG**.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc hệ thống (System Architecture)](#2-kiến-trúc-hệ-thống-system-architecture)
3. [Cấu trúc thư mục & Giải thích chi tiết từng file](#3-cấu-trúc-thư-mục--giải-thích-chi-tiết-từng-file)
   - [3.1 Thư mục gốc (Root Files)](#31-thư-mục-gốc-root-files)
   - [3.2 Module lõi Python: `src/`](#32-module-lõi-python-src)
   - [3.3 Giao diện người dùng: `frontend/clinic/`](#33-giao-diện-người-dùng-frontendclinic)
   - [3.4 Cơ sở tri thức & Dữ liệu: `data/`](#34-cơ-sở-tri-thức--dữ-liệu-data)
   - [3.5 Mô hình & Trọng số: `models/`](#35-mô-hình--trọng-số-models)
   - [3.6 Kịch bản tự động hóa: `scripts/`](#36-kịch-bản-tự-động-hóa-scripts)
   - [3.7 Đánh giá & Báo cáo: `artifacts/`](#37-đánh-giá--báo-cáo-artifacts)
   - [3.8 Kiểm thử tự động: `tests/`](#38-kiểm-thử-tự-động-tests)
4. [So sánh toàn diện: Model BGE-M3 (BGM-3) gốc vs Model Medical V2](#4-so-sánh-toàn-diện-model-bge-m3-bgm-3-gốc-vs-model-medical-v2)
   - [4.1 Bối cảnh & Lý do cần Fine-tune](#41-bối-cảnh--lý-do-cần-fine-tune)
   - [4.2 So sánh kiến trúc & Phương pháp huấn luyện](#42-so-sánh-kiến-trúc--phương-pháp-huấn-luyện)
   - [4.3 Bảng đối chiếu số liệu Benchmark thực nghiệm](#43-bảng-đối-chiếu-số-liệu-benchmark-thực-nghiệm)
   - [4.4 Model V2 đã làm được gì? (Thành tựu & Đột phá)](#44-model-v2-đã-làm-được-gì-thành-tựu--đột-phá)
   - [4.5 Cơ chế phục hồi trọng số (Weight Recovery) & Trạng thái V3](#45-cơ-chế-phục-hồi-trọng-số-weight-recovery--trạng-thái-v3)
5. [Hướng dẫn cài đặt & Khởi chạy (Quick Start)](#5-hướng-dẫn-cài-đặt--khởi-chạy-quick-start)
6. [Hướng dẫn phát triển tiếp (Developer Guide)](#6-hướng-dẫn-phát-triển-tiếp-developer-guide)
   - [6.1 Thêm bệnh mới vào Knowledge Base](#61-thêm-bệnh-mới-vào-knowledge-base)
   - [6.2 Tái lập chỉ mục Vector ChromaDB](#62-tái-lập-chỉ-mục-vector-chromadb)
   - [6.3 Chạy bộ kiểm thử (Unit & Integration Tests)](#63-chạy-bộ-kiểm-thử-unit--integration-tests)
   - [6.4 Quy trình chuẩn bị huấn luyện mô hình V3](#64-quy-trình-chuẩn-bị-huấn-luyện-mô-hình-v3)

---

## 1. Tổng quan hệ thống

Hệ thống **Phòng khám YG** được xây dựng với mục tiêu giải quyết bài toán cốt lõi trong y tế ban đầu: **Người bệnh thường mô tả triệu chứng bằng ngôn ngữ dân gian, thiếu chuẩn xác về mặt thuật ngữ y khoa, dẫn đến việc tự chẩn đoán sai lầm hoặc chậm trễ tiếp cận chăm sóc cấp cứu.**

Hệ thống giải quyết bài toán này thông qua:
1. **Clinical Triage Assistant (Trợ lý phân loại lâm sàng):** Hỏi bệnh theo ngữ cảnh nhiều lượt (Multi-turn Follow-up), sàng lọc triệu chứng và định hướng bệnh lý nghi ngờ (Differential Diagnosis) mà không tự ý kết luận hoặc kê đơn.
2. **Deterministic Emergency Guardrails (Hàng rào an toàn cấp cứu khóa cứng):** Kiểm tra ngay lập tức các dấu hiệu đe dọa tính mạng (đau ngực kiểu vành lan tay trái, đột quỵ, đau bụng hố chậu phải nghi ruột thừa, sốc phản vệ, khó thở cấp...) thông qua 44+ regex y khoa. Khi phát hiện cấp cứu, hệ thống **lập tức ngắt luồng chat, cấm hỏi thêm câu hỏi thăm dò**, và hiển thị cảnh báo gọi 115 khẩn cấp.
3. **Hybrid Medical Search Engine (Bộ tìm kiếm y học lai):** Kết hợp Dense Embedding chuyên sâu (mô hình fine-tune `bge-m3-medical-v2-recovered-a050-fp16`) và Sparse Lexical Search (BM25Okapi tiếng Việt song ngữ có dấu/không dấu) trên kho dữ liệu 652 mặt bệnh.
4. **Full-stack Web Platform:**
   - **Frontend:** Next.js 14 App Router hiện đại, giao diện Dark Mode cao cấp lấy cảm hứng từ y tế công nghệ cao, hỗ trợ đặt lịch khám trực tuyến, quản lý tài khoản và lịch sử tư vấn riêng tư.
   - **Backend Serving:** FastAPI asynchronous API, hỗ trợ lazy-loading model, caching index và serving phục vụ phân loại tốc độ cao dưới 50ms.

---

## 2. Kiến trúc hệ thống (System Architecture)

```
                       ┌──────────────────────────────────────────────┐
                       │     Người bệnh nhập triệu chứng tự nhiên     │
                       │    (Ví dụ: "sốt cao rét run, đau tức ngực")   │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
               ┌──────────────────────────────────────────────────────────────┐
               │         Tầng 1: Deterministic Red-Flag Guardrails            │
               │        (Regex y khoa kiểm tra dấu hiệu sinh tử khẩn)          │
               └──────────────┬───────────────────────────────┬───────────────┘
                              │                               │
                      [CÓ CẤP CỨU]                    [KHÔNG CẤP CỨU]
                              │                               │
                              ▼                               ▼
       ┌──────────────────────────────┐     ┌───────────────────────────────────┐
       │   KÍCH HOẠT CẤP CỨU 115     │     │ Tầng 2: Semantic Guardrail        │
       │ - Ngắt toàn bộ thăm dò        │     │ (Advisory Model Alpha=0.07)       │
       │ - Hướng dẫn sơ cứu an toàn   │     └─────────────────┬─────────────────┘
       │ - Nút gọi khẩn cấp 115        │                       │
       └──────────────────────────────┘                       ▼
                                            ┌───────────────────────────────────┐
                                            │ Tầng 3: Hybrid Retrieval Engine   │
                                            │  - ChromaDB (Dense Embedding V2)  │
                                            │  - BM25Okapi (Sparse Lexical)     │
                                            │  - Weight Fusion: BM25 = 0.10     │
                                            └─────────────────┬─────────────────┘
                                                              │
                                                              ▼
                                            ┌───────────────────────────────────┐
                                            │ Kho tri thức 652 bệnh học         │
                                            │ (data/diseases_expanded/*.json)   │
                                            └─────────────────┬─────────────────┘
                                                              │
                                                              ▼
                                            ┌───────────────────────────────────┐
                                            │ Tầng 4: LLM Triage Orchestrator   │
                                            │ (Llama-3.1-8B via Ollama/Gemini)  │
                                            │  - Phân tích triệu chứng          │
                                            │  - Đặt câu hỏi làm rõ (1-2 câu)   │
                                            │  - Định hướng chuyên khoa & khám  │
                                            └─────────────────┬─────────────────┘
                                                              │
                                                              ▼
                                            ┌───────────────────────────────────┐
                                            │ Giao diện Web Phòng khám YG       │
                                            │ (Next.js 14 App Router + SQLite)  │
                                            │  - Đặt lịch khám chuyên khoa      │
                                            │  - Kết nối hồ sơ bệnh nhân        │
                                            └───────────────────────────────────┘
```

---

## 3. Cấu trúc thư mục & Giải thích chi tiết từng file

Toàn bộ dự án được tổ chức theo kiến trúc module hóa chặt chẽ, tách bạch giữa tầng dữ liệu, mô hình, logic nghiệp vụ lâm sàng và tầng giao diện hiển thị:

```
D:\BotMedical\
├── .env                              # Biến môi trường local (API keys, ports)
├── .env.example                       # Mẫu biến môi trường để người dùng mới copy thành .env
├── .gitignore                         # Danh sách file loại trừ khỏi Git
├── requirements.txt                   # Thư viện phục vụ chạy ứng dụng (FastAPI, ChromaDB...)
├── requirements-train.txt             # Thư viện huấn luyện GPU (GradCache, SentenceTransformers...)
├── SETUP.md                           # Hướng dẫn cài đặt & xử lý sự cố cho người dùng mới
├── setup.ps1                          # Cài đặt tự động 1 lệnh (venv, pip, npm, .env, index)
├── start-botmedical.ps1               # Script chạy song song Backend + Frontend 1-click
├── stop-botmedical.ps1                # Dừng cả hai dịch vụ, giải phóng cổng 8000/3000
├── CLINICAL_VALIDATION.md             # Tiêu chuẩn phê duyệt lâm sàng & cổng kiểm định
├── TRAINING.md                        # Sổ tay hướng dẫn huấn luyện GPU trên Cloud
├── evaluation_report_current.md       # Báo cáo kỹ thuật model V2 phục hồi hiện hành
├── evaluation_report_v0.md            # Báo cáo lịch sử phiên bản RAG v0 cũ
├── golden_evaluation_report.md        # Báo cáo đánh giá 10 ca lâm sàng đối chiếu
├── fp16_calibration.log               # Nhật ký cân chỉnh mô hình FP16
├── training.log                       # Nhật ký quá trình huấn luyện
├── config/                            # Cấu hình tập trung toàn hệ thống
├── src/                               # Toàn bộ mã nguồn Python nghiệp vụ
├── frontend/clinic/                   # Ứng dụng web Next.js của Phòng khám YG
├── data/                              # Tri thức bệnh lý, tập kiểm thử, review lâm sàng
├── models/                            # Checkpoint mô hình embedding & sổ đăng ký
├── scripts/                           # Kịch bản tiền xử lý, huấn luyện, đánh giá
├── artifacts/                         # Kết quả benchmark, ma trận cân chỉnh trọng số
└── tests/                             # Bộ kiểm thử tự động pytest
```

---

### 3.1 Thư mục gốc (Root Files)

- [`SETUP.md`](file:///D:/BotMedical/SETUP.md): Hướng dẫn cài đặt từng bước cho người dùng mới, kèm bảng xử lý sự cố thường gặp.
- [`setup.ps1`](file:///D:/BotMedical/setup.ps1): Cài đặt tự động một lệnh — dò Python 3.10/3.11, tạo `venv/`, cài `requirements.txt`, kiểm tra Node.js, chạy `npm install`, tạo `.env`, xác minh model embedding và dựng chỉ mục ChromaDB. Chạy lại nhiều lần đều an toàn (bỏ qua bước đã xong).
- [`start-botmedical.ps1`](file:///D:/BotMedical/start-botmedical.ps1): Script PowerShell một chạm: kiểm tra tiền điều kiện (venv, `node_modules`, model, chỉ mục, cổng trống), mở 2 cửa sổ terminal riêng biệt — một chạy FastAPI Backend (`uvicorn src.web.app:app --port 8000`), một chạy Next.js Frontend (`npm run dev` trên port 3000) — rồi chờ backend báo `ready` trước khi mở trình duyệt. Hỗ trợ `-NoBrowser`, `-NoReload`, `-BackendPort`, `-FrontendPort`, `-SkipChecks`.
- [`stop-botmedical.ps1`](file:///D:/BotMedical/stop-botmedical.ps1): Dừng cả hai dịch vụ theo PID đã ghi trong `.botmedical-run.json`, đồng thời quét giải phóng cổng 8000/3000.
- [`.env.example`](file:///D:/BotMedical/.env.example): Mẫu biến môi trường (`BOTMED_DEVICE`, `BOTMED_LLM_PROVIDER`, `GEMINI_API_KEY`, `BOTMED_BACKEND_URL`) để người dùng mới copy thành `.env`.
- [`requirements.txt`](file:///D:/BotMedical/requirements.txt): Định nghĩa các thư viện phục vụ runtime: `fastapi`, `uvicorn`, `chromadb`, `rank-bm25`, `pydantic`, `unidecode`, `torch`, `transformers`, `sentence-transformers`, `pyyaml`.
- [`requirements-train.txt`](file:///D:/BotMedical/requirements-train.txt): Thư viện phục vụ huấn luyện mô hình embedding chuyên sâu trên máy chủ GPU: bổ sung `GradCache`, `bitsandbytes`, `scikit-learn`, `scipy`.
- [`CLINICAL_VALIDATION.md`](file:///D:/BotMedical/CLINICAL_VALIDATION.md): Văn kiện pháp lý và tiêu chuẩn kỹ thuật quy định các bước thẩm định y khoa bắt buộc trước khi triển khai thực tế. Yêu cầu tối thiểu 400 ca test độc lập (200 cấp cứu, 200 thường) được 2 bác sĩ review độc lập và 1 bác sĩ phân xử (adjudicator).
- [`TRAINING.md`](file:///D:/BotMedical/TRAINING.md): Cẩm nang thiết lập môi trường và cấu hình các profile huấn luyện GPU (A100 40GB, A100 80GB, L40S/A6000 48GB), kỹ thuật mini-batch caching và sequence length 768 tokens.
- [`evaluation_report_current.md`](file:///D:/BotMedical/evaluation_report_current.md): Báo cáo kỹ thuật ghi nhận chỉ số thực nghiệm của mô hình phục hồi `bge-m3-medical-v2-recovered-a050-fp16` trên 2 tập dữ liệu 476 ca dân gian và 3.015 ca 603 bệnh lý.
- [`golden_evaluation_report.md`](file:///D:/BotMedical/golden_evaluation_report.md): Báo cáo chi tiết 10 ca kiểm thử lâm sàng mẫu (Nhồi máu cơ tim, Viêm ruột thừa, GERD, Sốt xuất huyết, Mề đay, Viêm phổi...) với LLM Llama-3.1-8B.
- [`.env`](file:///D:/BotMedical/.env): Lưu cấu hình môi trường cục bộ như `BOTMED_DEVICE=cuda`, `OLLAMA_BASE_URL`, `GEMINI_API_KEY`.

---

### 3.2 Module lõi Python: `src/`

Nằm tại [`src/`](file:///D:/BotMedical/src), chứa toàn bộ kiến trúc xử lý nghiệp vụ y tế:

#### `src/runtime_config.py`
- File nạp và giải quyết cấu hình trung tâm từ file [`config/settings.yaml`](file:///D:/BotMedical/config/settings.yaml).
- Hàm `get_setting(key_path)` hỗ trợ truy vấn cấu hình dạng chuỗi lồng nhau (vd: `retrieval.embedding_model`).
- Hàm `resolve_project_path(rel_path)` biến đổi các đường dẫn tương đối thành đường dẫn tuyệt đối chuẩn xác theo thư mục gốc của dự án, chống lỗi đường dẫn khi chạy từ các thư mục làm việc khác nhau.

#### `src/conversation/`
- [`state.py`](file:///D:/BotMedical/src/conversation/state.py): Định nghĩa máy trạng thái hội thoại y tế đa lượt (`ConversationState`). Quản lý danh sách triệu chứng đã bóc tách (`SymptomExtracted` gồm tên, thời gian, mức độ), danh sách cờ đỏ nguy hiểm (`red_flags`), tiến trình câu hỏi (`turn_count` / `max_turns`), và trạng thái phân loại (`stage`: `emergency`, `follow_up`, `concluded`).

#### `src/knowledge/`
- [`schema.py`](file:///D:/BotMedical/src/knowledge/schema.py): Sử dụng Pydantic v2 xây dựng mô hình dữ liệu bệnh học chuẩn hóa:
  - `DiseaseSchema`: Khóa bệnh (`disease_id` dạng `RESP_001`), tên tiếng Việt, tên tiếng Anh, chuyên khoa (`category`), danh sách tên gọi khác (`aliases`), cấp độ dữ liệu (`tier`: 1 core duyệt tay, 2 scaled thực nghiệm), triệu chứng theo tần suất (`very_common`, `common`, `occasional`, `rare`), mức độ khẩn cấp (`urgency`), các dấu hiệu cảnh báo (`red_flags`), và nguồn tài liệu tham chiếu (`provenance`).
  - Hàm `load_all_diseases()` nạp và validate toàn bộ các file JSON bệnh học trong thư mục dữ liệu.

#### `src/safety/`
- [`guardrails.py`](file:///D:/BotMedical/src/safety/guardrails.py): Động cơ kiểm soát an toàn kép:
  1. **Deterministic Guardrail (Bắt buộc & Khóa cứng):** Sử dụng hệ thống biểu thức chính quy (Regex) sâu trên tiếng Việt (có dấu và chuẩn hóa không dấu) để bắt trọn các triệu chứng đe dọa sinh mạng: Nhồi máu cơ tim (đau ngực lan vai/tay trái, vã mồ hôi lạnh), Đột quỵ não (yếu liệt nửa người, méo miệng, nói ngọng), Viêm ruột thừa cấp (đau nhói bụng dưới bên phải / hố chậu phải kèm sốt), Khó thở thanh quản / hen suyễn ác tính, Sốc phản vệ sau ăn hải sản/dùng thuốc, Xuất huyết tiêu hóa (nôn ra máu, đi ngoài phân đen).
  2. **Semantic Guardrail (Cố vấn / Advisory):** Sử dụng embedding cosine similarity so với tập vector ca mẫu cấp cứu đã được cân chỉnh. Hiện tại ở chế độ `advisory` (chỉ khuyến nghị, không kích hoạt tự động ở UI) nhằm tránh hiện tượng báo động giả (False Positive) khi chưa có 400 ca clinical holdout phê duyệt.

#### `src/retrieval/`
- [`search_engine.py`](file:///D:/BotMedical/src/retrieval/search_engine.py): Động cơ tìm kiếm lai kết hợp:
  - **Dense Retrieval:** Vector database ChromaDB kết hợp mô hình `BGE-M3 Direct Embedding` tùy chỉnh trên PyTorch với float16 và CUDA. Mã hóa đoạn mô tả bệnh thành vector không gian 1024 chiều.
  - **Sparse Lexical Search:** Thuật toán BM25Okapi với hàm tách từ `tokenize_vietnamese(text)` phát sinh đồng thời cả token nguyên bản có dấu và token chuẩn hóa không dấu (Unidecode), giải quyết triệt để lỗi gõ tiếng Việt của người bệnh.
  - **Cân bằng trọng số:** Hợp nhất điểm số qua công thức: `Score = (1 - w) * DenseScore + w * BM25NormalizedScore`. Trọng số tối ưu `w = 0.10` được chọn thông qua quét thực nghiệm sweep trên 3.015 ca benchmark.
  - **Định tuyến cấp cứu:** Nếu câu hỏi chứa dấu hiệu cấp cứu, hệ thống tự động ngắt BM25 và dùng Dense-only để tránh bị nhiễu bởi các từ ngữ thông thường.

#### `src/llm/`
- [`triage_bot.py`](file:///D:/BotMedical/src/llm/triage_bot.py): Lớp điều phối LLM thông minh:
  - Tiếp nhận thông tin từ Guardrails và Top-5 bệnh do Retrieval Engine truy xuất.
  - Xây dựng prompt lâm sàng nghiêm ngặt: Ép buộc LLM trả về format JSON thuần túy (gồm `new_symptoms`, `new_red_flags`, `stage`, `bot_reply`, `reasoning`).
  - Hỗ trợ kết nối cả mô hình local mã nguồn mở qua Ollama (`llama3.1:8b`) lẫn API cloud (`gemini-3.6-flash`).

#### `src/evaluation/`
- [`golden_evaluator.py`](file:///D:/BotMedical/src/evaluation/golden_evaluator.py): Bộ thẩm định tự động end-to-end các cuộc hội thoại lâm sàng, kiểm tra xem LLM có phát hiện đúng cấp cứu, đúng chuyên khoa, và không vi phạm điều răn an toàn hay không.
- [`golden_schema.py`](file:///D:/BotMedical/src/evaluation/golden_schema.py): Định nghĩa cấu trúc các ca kiểm thử Golden Test Case (GTC) chuẩn.
- [`holdout_schema.py`](file:///D:/BotMedical/src/evaluation/holdout_schema.py): Định nghĩa schema nghiêm ngặt cho tập Clinical Holdout (yêu cầu 2 reviewer độc lập, 1 adjudicator, hash toàn vẹn).

#### `src/web/`
- [`app.py`](file:///D:/BotMedical/src/web/app.py): Ứng dụng FastAPI bất đồng bộ cung cấp RESTful API:
  - `POST /search`: Nhận query triệu chứng, trả về Top-K bệnh tương ứng, điểm tin cậy, thông tin chuyên khoa và cảnh báo cấp cứu.
  - `GET /status`: Trả về trạng thái hoạt động của mô hình đang nạp, số lượng bệnh trong kho tri thức, trạng thái index vector.
- [`static/`](file:///D:/BotMedical/src/web/static): Giao diện kiểm thử nội bộ siêu nhẹ viết bằng HTML5/CSS3/Vanilla JS (`index.html`, `styles.css`, `app.js`) dành cho lập trình viên và bác sĩ kiểm tra chất lượng truy xuất cục bộ mà không cần bật Next.js.

---

### 3.3 Giao diện người dùng: `frontend/clinic/`

Được phát triển bằng **Next.js 14 App Router** kết hợp phong cách thiết kế Dark Glassmorphism tinh tế mang thương hiệu **Phòng khám YG**:

```
frontend/clinic/
├── app/
│   ├── layout.tsx                    # Root Layout, Metadata tiêu đề 'Phòng khám YG'
│   ├── page.tsx                      # Trang chủ (render AiDashboardHome)
│   ├── tro-ly/page.tsx               # Bàn tư vấn phân loại triệu chứng AI (Triage Desk)
│   ├── chuyen-khoa/page.tsx          # Danh mục chuyên khoa sâu (Hô hấp, Tiêu hóa...)
│   ├── bac-si/page.tsx               # Danh sách đội ngũ bác sĩ chuyên khoa
│   ├── dat-lich/page.tsx             # Đặt lịch hẹn khám bệnh trực tuyến
│   ├── lien-he/page.tsx              # Bản đồ, hotline 1900 6868, cơ sở Hà Nội & TP.HCM
│   ├── dang-nhap/page.tsx            # Đăng nhập tài khoản Phòng khám YG
│   ├── dang-ky/page.tsx              # Đăng ký tài khoản người bệnh
│   ├── tai-khoan/page.tsx            # Hồ sơ cá nhân & quản lý lịch hẹn
│   └── api/                          # Next.js Serverless API routes
│       ├── search/route.ts           # Proxy chuyển tiếp tìm kiếm sang FastAPI backend
│       ├── status/route.ts           # Proxy kiểm tra trạng thái AI backend
│       ├── auth/                     # Xác thực JWT, cookie phiên làm việc
│       └── appointments/             # Lưu và truy vấn lịch khám
├── components/
│   ├── clinic/                       # Các khối hiển thị trang phòng khám
│   │   ├── Header.tsx                # Thanh điều hướng trên cùng, logo 'Phòng khám YG'
│   │   ├── Footer.tsx                # Chân trang, bản quyền 'Phòng khám YG 2026'
│   │   ├── AiDashboardHome.tsx       # Bảng điều khiển trung tâm sức khỏe (Hero + Orb + Bento)
│   │   ├── HeroSection.tsx           # Khối giới thiệu sứ mệnh Phòng khám YG
│   │   ├── AppointmentForm.tsx       # Form đặt lịch hẹn đa bước (Step-by-step)
│   │   ├── DoctorCard.tsx            # Thẻ thông tin bác sĩ, học vị, kinh nghiệm
│   │   ├── SpecialtyNavigator.tsx    # Điều hướng nhanh các khoa phòng
│   │   └── FAQAccordion.tsx          # Câu hỏi thường gặp về quy trình khám & AI
│   ├── triage/                       # Bộ công cụ phân loại triệu chứng lâm sàng
│   │   ├── TriageDesk.tsx            # Bàn làm việc chat phân loại tương tác cao
│   │   ├── ClinicalMap.tsx           # Sơ đồ biểu diễn trực quan các hướng bệnh lý
│   │   ├── DiseaseCandidate.tsx      # Thẻ hiển thị bệnh lý nghi ngờ, tỷ lệ match
│   │   └── EmergencyBanner.tsx       # Banner báo động cấp cứu đỏ rực rỡ kèm nút gọi 115
│   └── auth/
│       └── AuthShell.tsx             # Khung bảo vệ đăng nhập / đăng ký bảo mật cao
└── lib/
    ├── clinic-data.ts                # Dữ liệu tĩnh: bác sĩ, chuyên khoa, thông tin phòng khám
    ├── botmedical-api.ts             # Thư viện fetch gọi API sang FastAPI server
    ├── auth.ts                       # Xử lý hash mật khẩu Argon2 & token
    └── db.ts                         # Kết nối SQLite cục bộ lưu lịch hẹn người bệnh
```

---

### 3.4 Cơ sở tri thức & Dữ liệu: `data/`

- [`data/diseases_expanded/`](file:///D:/BotMedical/data/diseases_expanded): Chứa **652 file JSON** đại diện cho 652 mặt bệnh học lâm sàng được biên soạn theo cấu trúc `DiseaseSchema`. Mỗi file mô tả chi tiết:
  - Tên tiếng Việt, tiếng Anh, chuyên khoa.
  - Các triệu chứng điển hình (Common Symptoms), triệu chứng ít gặp (Occasional), triệu chứng hiếm (Rare).
  - Cờ đỏ báo động khẩn cấp (Red Flags).
  - Khuyến nghị sơ cứu và hướng xử trí y tế.
  - Nguồn trích dẫn: Phác đồ chẩn đoán và điều trị của Bộ Y Tế Việt Nam, WHO, CDC.
- [`data/clinical_review/`](file:///D:/BotMedical/data/clinical_review): Nơi lưu trữ tiến trình thẩm định của các chuyên gia y tế:
  - `common_49_review.csv`: Bảng thẩm định 49 bệnh lý thường gặp nhất trong chăm sóc ban đầu.
  - `clinical_adjudication.csv`: Bảng phân xử lâm sàng độc lập giữa các bác sĩ.
- [`data/finetune/`](file:///D:/BotMedical/data/finetune): Chứa các bộ dữ liệu huấn luyện dạng triplets `(anchor, positive, negative)` phục vụ bài toán contrastive learning.
- [`data/test_cases/`](file:///D:/BotMedical/data/test_cases): Chứa các tập benchmark đánh giá độ chính xác truy xuất:
  - `colloquial_symptoms_test.json`: 476 câu hỏi triệu chứng viết bằng ngôn ngữ đời thường tự nhiên của người bệnh.
  - `diseases_603_test.json`: 3.015 câu hỏi phủ rộng trên 603 mặt bệnh.
  - `clinical_holdout.json`: File mẫu bị khóa dành riêng cho tập đánh giá lâm sàng độc lập cuối cùng.
- [`data/embeddings/`](file:///D:/BotMedical/data/embeddings): Thư mục lưu trữ database vector ChromaDB đã được vector hóa từ toàn bộ 652 file bệnh học.

---

### 3.5 Mô hình & Trọng số: `models/`

Quản lý các checkpoint và nguồn gốc (provenance) của mô hình embedding:

- [`models/registry.json`](file:///D:/BotMedical/models/registry.json): Sổ đăng ký kiểm kê trạng thái, đường dẫn artifact, định dạng số học (float16/float32), giá trị alpha blend, và mã băm **SHA-256** của từng model:
  1. `bge-m3-medical-v2-recovered-a050-fp16`: Model production phục vụ tìm kiếm hiện tại (alpha = 0.50, SHA-256: `4e4a45962d7a1063366968463314bbe4d45d9373202199c882a62b84dc6b6446`).
  2. `bge-m3-medical-v2-safe-fp16`: Model chuyên biệt cho Semantic Guardrail (alpha = 0.07, SHA-256: `e72ee7ad51b883cd31057c5c642b8530ad485e0335e8f125af8276433da83fbb`).
  3. `bge-m3-medical-v2`: Checkpoint nguyên bản FP32 (được ghi nhận trạng thái đã thất lạc trong registry để phục vụ audit).

---

### 3.6 Kịch bản tự động hóa: `scripts/`

Thư mục chứa 40+ scripts thực hiện toàn bộ vòng đời phát triển từ dữ liệu, training, benchmark đến deployment:

#### Nhóm chuẩn bị dữ liệu & Cơ sở tri thức:
- `build_600_diseases_kb.py`: Tự động biên dịch và chuẩn hóa 652 hồ sơ bệnh lý vào `data/diseases_expanded`.
- `prepare_training_data.py` & `prepare_finetune_data.py`: Khai phá và tạo các cặp Triplets (Anchor, Positive, Negative) từ kho bệnh học.
- `build_task_triplets_633.py`: Khai phá hard negatives phục vụ huấn luyện tương phản nâng cao.
- `prepare_common_49_review.py`: Khởi tạo bảng mẫu thẩm định 49 bệnh lý cơ bản cho bác sĩ.

#### Nhóm Huấn luyện & Hòa trộn trọng số (Training & Blending):
- `train_bge_m3.py`: Script huấn luyện BGE-M3 sử dụng `CachedMultipleNegativesRankingLoss` (GradCache) và `disease-aware sampler`.
- `blend_embedding_models.py`: Thực hiện nội suy/ngoại suy tuyến tính trọng số $W_{blend} = W_{base} + \alpha (W_{tuned} - W_{base})$ để tạo mô hình cân bằng.
- `train_medical_lora.py`: Thử nghiệm huấn luyện tham số hiệu quả qua LoRA adapter.

#### Nhóm Thẩm định lâm sàng & Đảm bảo an toàn:
- `validate_clinical_holdout.py`: Kiểm tra tính toàn vẹn, số lượng tối thiểu 200/200 ca và chữ ký bác sĩ của file holdout.
- `audit_clinical_review_progress.py`: Kiểm toán tiến độ review lâm sàng độc lập.
- `preflight_gpu_training.py`: Cổng kiểm tra bắt buộc (Preflight Gate) ngăn chặn việc thuê GPU tốn kém nếu dữ liệu chưa sẵn sàng.
- `calibrate_guardrail_threshold.py`: Cân chỉnh ngưỡng cosine similarity cho Semantic Guardrail.

#### Nhóm Đánh giá & Benchmark (Evaluation):
- `compare_embeddings.py`: Đo đạc đối đầu trực tiếp giữa mô hình BGE-M3 gốc và các phiên bản Medical V2 trên các tập test.
- `sweep_bm25_weight.py`: Quét tự động trọng số BM25 từ 0.0 đến 1.0 để tìm điểm tối ưu hài hòa giữa dense và sparse.
- `run_golden_eval.py`: Chạy bài kiểm thử 10 ca lâm sàng với LLM judge.
- `benchmark_603_retrieval.py`: Benchmark năng lực truy xuất trên toàn bộ 603 mặt bệnh.

#### Nhóm Vận hành (Serving & Run):
- `build_retrieval_index.py`: Đọc 652 file bệnh học, tính vector embedding và lưu vào ChromaDB (hỗ trợ cả CPU và CUDA batch).
- `run_ui.py`: Khởi chạy nhanh máy chủ FastAPI Backend serving giao diện Retrieval Lab.

---

### 3.7 Đánh giá & Báo cáo: `artifacts/`

Nơi lưu trữ các kết quả đo đạc khoa học bất biến nhằm phục vụ kiểm định:
- `artifacts/evaluation/recovered_alpha050_comparison.json`: Kết quả chi tiết từng ca thử nghiệm so sánh BGE-M3 gốc với candidate alpha=0.50.
- `artifacts/evaluation/weight_blends.json`: Báo cáo kết quả quét alpha blend từ 0.025 đến 0.50.
- `artifacts/evaluation/bm25_weight_sweep.json`: Dữ liệu quét tìm trọng số BM25 tối ưu (chọn được giá trị 0.10).
- `artifacts/evaluation/guardrail_calibration.json`: Ma trận cân chỉnh độ nhạy/độ đặc hiệu của Semantic Guardrail.

---

### 3.8 Kiểm thử tự động: `tests/`

Bộ 56+ bài unit test và integration test sử dụng `pytest` nhằm bảo vệ các bất biến phần mềm (Software Invariants):
- Kiểm tra tính hợp lệ của schema dữ liệu bệnh học.
- Kiểm tra tokenization tiếng Việt có dấu và không dấu.
- Kiểm tra cơ chế kích hoạt cấp cứu của Regex Red-flag Guardrails (bắt buộc nhồi máu cơ tim, viêm ruột thừa phải nhảy cấp cứu 100%).
- Kiểm tra khả năng fallback an toàn của Search Engine khi thiếu GPU hoặc thiếu index.

---

## 4. So sánh toàn diện: Model BGE-M3 (BGM-3) gốc vs Model Medical V2

Một trong những đóng góp công nghệ quan trọng nhất của dự án là việc tinh chỉnh và tối ưu hóa mô hình nền tảng **BAAI/BGE-M3** thành mô hình chuyên biệt hóa y tế **BGE-M3 Medical V2**.

### 4.1 Bối cảnh & Lý do cần Fine-tune

Mô hình nền tảng **BGE-M3** (BAAI General Embedding M3) do Viện Trí tuệ Nhân tạo Bắc Kinh phát hành là một trong những mô hình embedding đa ngôn ngữ mạnh mẽ nhất hiện nay. Tuy nhiên, khi áp dụng trực tiếp vào bài toán y tế tại Việt Nam, mô hình gốc bộc lộ **3 hạn chế nghiêm trọng**:

1. **Khoảng cách ngôn ngữ đời thường (The Colloquial Gap):**
   - Người bệnh không tìm kiếm bằng thuật ngữ y khoa chuẩn (như *"hội chứng vành cấp"*, *"viêm da tiếp xúc"*, *"trào ngược thực quản"*).
   - Họ diễn đạt bằng cảm giác chủ quan và phương ngữ: *"sốt đùng đùng", "đau nhói bụng dưới bên phải", "nổi mề đay ngứa phát điên", "hụt hơi vã mồ hôi lạnh"*. BGE-M3 gốc bị phân tán ngữ nghĩa và không ánh xạ chính xác các câu này về mặt bệnh học tương ứng.
2. **Nguy cơ bỏ sót ca cấp cứu (Emergency Under-triage):**
   - Trong mô hình gốc, khoảng cách vector giữa triệu chứng thông thường (như tức ngực do trào ngược) và triệu chứng cấp cứu tử vong (nhồi máu cơ tim cấp) quá gần nhau, khiến hệ thống có thể xếp bệnh nguy hiểm xuống thứ hạng thấp.
3. **Cắt cụt ngữ cảnh bệnh học (Sequence Length Truncation):**
   - Các cấu hình thử nghiệm trước đây thường đặt độ dài văn bản là 384 tokens. Tuy nhiên, phân tích tokenizer thực tế cho thấy: trong khi câu hỏi triệu chứng (anchor) có độ dài p99 chỉ khoảng 50 tokens, thì tài liệu mô tả đầy đủ một bệnh (gồm cơ chế, triệu chứng chính/phụ, cờ đỏ, hướng dẫn) ở phân vị p95 lên tới **748 tokens**. Cấu hình cũ 384 tokens đã vô tình cắt cụt gần 50% thông tin bệnh lý quan trọng.

---

### 4.2 So sánh kiến trúc & Phương pháp huấn luyện

| Tiêu chí | BAAI/BGE-M3 Gốc (BGM-3) | BGE-M3 Medical V2 (Recovered Alpha 0.50) | BGE-M3 Medical V2 Safe (Alpha 0.07) |
| :--- | :--- | :--- | :--- |
| **Nhà phát triển / Nguồn gốc** | BAAI (Bắc Kinh, Trung Quốc) | Fine-tuned & Blended bởi Phòng khám YG | Fine-tuned & Blended bởi Phòng khám YG |
| **Kích thước vector (Dimension)** | 1024 chiều | 1024 chiều | 1024 chiều |
| **Độ dài ngữ cảnh (Seq Length)** | Tối đa 8192 (thường cấu hình 384/512) | **768 tokens** (tối ưu toàn diện cho 652 bệnh) | **768 tokens** |
| **Định dạng số học (Dtype)** | Float32 / FP16 | **Float16** (tối ưu hóa bộ nhớ GPU/RAM) | **Float16** |
| **Hàm mất mát (Loss Function)** | Pre-training contrastive đa ngôn ngữ | **CachedMultipleNegativesRankingLoss** (GradCache) | Kế thừa từ V2 fine-tuned |
| **Chiến lược lấy mẫu (Sampling)** | Lấy mẫu ngẫu nhiên thông thường | **Disease-Aware Sampler** (ngăn chặn false in-batch negatives) | Kế thừa từ V2 fine-tuned |
| **Khai phá mẫu khó (Negative Mining)** | Ngẫu nhiên trong batch | **Hard Negatives** từ BM25 + lỗi sai của incumbent | Kế thừa từ V2 fine-tuned |
| **Kỹ thuật hòa trộn (Weight Blending)** | Không có ($\alpha = 0.0$) | **$\alpha = 0.50$** (Cân bằng tối ưu retrieval) | **$\alpha = 0.07$** (Khóa an toàn khẩn cấp) |
| **Vai trò trong hệ thống** | Baseline đối chiếu | **Mô hình truy xuất bệnh học chính (Production)** | **Mô hình cố vấn an toàn (Semantic Guardrail)** |

---

### 4.3 Bảng đối chiếu số liệu Benchmark thực nghiệm

Dữ liệu được trích xuất trực tiếp từ các báo cáo đánh giá thực nghiệm độc lập tại [`artifacts/evaluation/recovered_alpha050_comparison.json`](file:///D:/BotMedical/artifacts/evaluation/recovered_alpha050_comparison.json) và [`evaluation_report_current.md`](file:///D:/BotMedical/evaluation_report_current.md):

#### 1. Trên tập triệu chứng đời thường (Generated Colloquial Benchmark - N = 476 ca)

Tập dữ liệu mô phỏng chính xác cách bệnh nhân Việt Nam mô tả triệu chứng hàng ngày:

| Chỉ số đánh giá | BGE-M3 Gốc (Base) | Model V2 (Candidate $\alpha=0.50$) | Mức độ cải thiện (Absolute Gain) |
| :--- | :---: | :---: | :---: |
| **Dense Recall@1** *(Bệnh đúng ở vị trí số 1)* | 47.90% | **52.73%** (peak 53.57%) | 🟢 **+4.83%** (tăng mạnh) |
| **Dense Recall@3** *(Bệnh đúng nằm trong Top 3)* | 79.41% | **83.40%** | 🟢 **+3.99%** |
| **Dense Recall@5** *(Bệnh đúng nằm trong Top 5)* | 86.97% | **90.97%** (peak 91.18%) | 🟢 **+4.00%** (vượt ngưỡng 90%) |
| **Dense MRR** *(Mean Reciprocal Rank)* | 0.6405 | **0.6889** | 🟢 **+0.0484** |
| **Hybrid Recall@1** *(Kết hợp BM25)* | 43.70% | **44.54%** | 🟢 **+0.84%** |
| **Hybrid Recall@5** *(Kết hợp BM25)* | 83.61% | **84.03%** | 🟢 **+0.42%** |

#### 2. Trên tập dữ liệu toàn diện 603 bệnh lý (Diseases 603 Benchmark - N = 3.015 ca)

Tập dữ liệu kiểm tra năng lực bao phủ trên toàn bộ danh mục bệnh học lâm sàng:

| Chỉ số đánh giá | BGE-M3 Gốc (Base) | Model V2 (Candidate $\alpha=0.50$) | Mức độ cải thiện (Absolute Gain) |
| :--- | :---: | :---: | :---: |
| **Dense Recall@1** | 34.13% | **41.13%** (peak 41.26%) | 🟢 **+7.00%** (bứt phá vượt bậc) |
| **Dense Recall@3** | 49.82% | **58.74%** | 🟢 **+8.92%** |
| **Dense Recall@5** | 56.75% | **65.57%** (peak 65.87%) | 🟢 **+8.82%** (tăng gần 9 điểm %) |
| **Dense MRR** | 0.4261 | **0.5067** | 🟢 **+0.0806** |
| **Hybrid Recall@1** | 39.14% | **39.97%** (peak 40.03%) | 🟢 **+0.83%** |
| **Hybrid Recall@5** | 60.76% | **62.09%** (peak 62.22%) | 🟢 **+1.33%** |

---

### 4.4 Model V2 đã làm được gì? (Thành tựu & Đột phá)

1. **Đột phá vượt bậc về khả năng tìm đúng bệnh ngay ở vị trí đầu tiên (Recall@1):**
   - Trên tập 603 bệnh, Dense Recall@1 tăng từ **34.13% lên 41.13%** (tăng ròng 7.0 điểm phần trăm). Điều này đồng nghĩa với việc cứ thêm 100 người bệnh tìm kiếm thì có thêm ít nhất 7 người được hệ thống nhận diện chính xác ngay lập tức ở gợi ý đầu tiên.
   - Dense Recall@5 vượt mốc **90.97%** trên tập ngôn ngữ đời thường, đảm bảo bệnh lý thực sự hầu như luôn xuất hiện trong Top 5 ứng viên được đưa vào ngữ cảnh cho LLM.
2. **Khắc phục hoàn hảo hiện tượng Quên lãng Thảm khốc (Catastrophic Forgetting):**
   - Việc fine-tune một mô hình lớn trên tập dữ liệu chuyên ngành hẹp thường làm hỏng không gian ngữ nghĩa tổng quát.
   - Nhờ áp dụng kỹ thuật **Weight Blending (Model Interpolation)** với hệ số $\alpha = 0.50$, mô hình giữ lại được các đặc tính ngữ nghĩa đa ngôn ngữ xuất sắc của BAAI/BGE-M3, đồng thời tích hợp trọn vẹn tri thức bệnh lý tiếng Việt từ tập huấn luyện.
3. **Phân tách ranh giới an toàn cấp cứu:**
   - Phiên bản chuyên biệt $\alpha = 0.07$ (`bge-m3-medical-v2-safe-fp16`) duy trì **100% Emergency Recall@5** trên tập kiểm thử an toàn, hoạt động như một tầng phòng thủ cố vấn hỗ trợ đắc lực cho các luật Regex cứng.
4. **Tối ưu hóa tài nguyên phần cứng (FP16 Efficiency):**
   - Mô hình V2 được nạp ở định dạng nửa độ chính xác (`float16`), cắt giảm dung lượng VRAM GPU từ ~4.6GB xuống còn **~2.3GB**, cho phép chạy mượt mà ngay trên các máy tính trạm cục bộ hoặc GPU phổ thông (RTX 3060, RTX 4060, T4) với độ trễ mỗi lượt search chỉ từ **15ms - 35ms**.

---

### 4.5 Cơ chế phục hồi trọng số (Weight Recovery) & Trạng thái V3

#### Câu chuyện phục hồi trọng số V2 (Weight Provenance)
Trong quá trình phát triển dự án, một sự cố hạ tầng đã diễn ra: file checkpoint nguyên bản chưa nén FP32 của mô hình V2 (`models/bge-m3-medical-v2`) bị thất lạc khỏi máy chủ lưu trữ. Tại thời điểm đó, nhóm phát triển chỉ còn lưu giữ:
- Mô hình nền tảng: $W_{base}$ (`BAAI/bge-m3`).
- Mô hình blend an toàn đã lượng tử hóa FP16: $W_{blend\_0.07}$ với $\alpha_1 = 0.07$.

Để khôi phục mô hình có hiệu năng cao nhất ($\alpha_2 = 0.50$), nhóm kỹ sư đã ứng dụng nguyên lý toán học ngoại suy từ phép biến đổi tuyến tính:
$$W_{blend\_0.07} = W_{base} + \alpha_1 \cdot (W_{tuned} - W_{base})$$
Suy ra:
$$\Delta W = W_{tuned} - W_{base} = \frac{W_{blend\_0.07} - W_{base}}{\alpha_1}$$
Từ đó, trọng số mô hình candidate $\alpha_2 = 0.50$ được tái thiết lập theo công thức:
$$W_{recovered} = W_{base} + \frac{\alpha_2}{\alpha_1} \cdot (W_{blend\_0.07} - W_{base})$$

Quá trình này được thực hiện tự động thông qua hàm `reconstruct_target_tensor` trong [`scripts/blend_embedding_models.py`](file:///D:/BotMedical/scripts/blend_embedding_models.py). Mô hình sau khi tái thiết lập đã được kiểm chứng toàn diện qua benchmark, đạt hiệu năng truy xuất tương đương checkpoint gốc và được đóng gói thành artifact chính thức `bge-m3-medical-v2-recovered-a050-fp16` với mã băm SHA-256 được lưu vết minh bạch tại [`models/registry.json`](file:///D:/BotMedical/models/registry.json).

#### Trạng thái đóng băng V3 (V3 Freeze Status)
Theo chỉ thị y khoa tại [`docs/V3_FREEZE_STATUS.md`](file:///D:/BotMedical/docs/V3_FREEZE_STATUS.md):
- **Ứng viên thế hệ tiếp theo (Model V3) hiện đang được ĐÓNG BĂNG TẠM THỜI (PAUSED).**
- Hệ thống runtime tuyệt đối **không được gán nhãn V3 đã phát hành** cho tới khi hoàn tất tập dữ liệu độc lập `clinical_holdout.json` đủ tối thiểu 400 ca (200 cấp cứu / 200 thường) được các bác sĩ lâm sàng độc lập thẩm định bằng tay.
- Mọi hoạt động phát triển hiện tại đều sử dụng runtime chuẩn mực và an toàn tuyệt đối của **Model V2 Recovered**.

---

## 5. Hướng dẫn cài đặt & Khởi chạy (Quick Start)

> Hướng dẫn đầy đủ cho người dùng mới (kèm bảng xử lý sự cố): **[SETUP.md](file:///D:/BotMedical/SETUP.md)**

### Yêu cầu hệ thống
- **Hệ điều hành:** Windows 10/11 (bộ script `.ps1` chạy trên PowerShell).
- **Python:** Phiên bản `3.10` hoặc `3.11`.
- **Node.js:** Phiên bản `18.x` hoặc `20.x LTS`.
- **Phần cứng khuyến nghị:** 16GB RAM, ổ cứng SSD trống tối thiểu 10GB. Có GPU NVIDIA (từ 6GB VRAM) để đạt tốc độ xử lý nhanh nhất (hệ thống tự động fallback về CPU nếu không có CUDA).

### Bước 0: Model embedding (bắt buộc, KHÔNG có trong Git)

Trọng số `models/bge-m3-medical-v2-recovered-a050-fp16/model.safetensors` nặng 1.1 GB nên bị loại khỏi Git (xem `.gitignore`). Sau khi `git clone`, phải **copy thủ công** cả thư mục `models/bge-m3-medical-v2-recovered-a050-fp16/` từ máy đã có sẵn vào đúng vị trí, trước khi chạy `setup.ps1`.

### Bước 1: Cài đặt tự động (một lệnh duy nhất)

```powershell
cd D:\BotMedical
.\setup.ps1
```

[`setup.ps1`](file:///D:/BotMedical/setup.ps1) tự động: tìm Python 3.10/3.11 → tạo `venv/` → cài `requirements.txt` → kiểm tra Node.js → `npm install` cho `frontend/clinic` → tạo `.env` từ `.env.example` → kiểm tra model → dựng chỉ mục ChromaDB 652 bệnh. Script an toàn khi chạy lại: bước nào đã xong sẽ được bỏ qua.

Tham số tùy chọn:

```powershell
.\setup.ps1 -Device cuda -BatchSize 32   # máy có GPU NVIDIA + torch bản CUDA
.\setup.ps1 -ForceIndex                  # dựng lại chỉ mục từ đầu
```

Nếu PowerShell chặn script: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Bước 2: Khởi chạy

```powershell
.\start-botmedical.ps1
```

[`start-botmedical.ps1`](file:///D:/BotMedical/start-botmedical.ps1) kiểm tra tiền điều kiện (venv, node_modules, model, chỉ mục, cổng trống), mở 2 cửa sổ dịch vụ, chờ backend báo `ready` rồi mở trình duyệt:

- **FastAPI Backend (Phân loại & Tìm kiếm):** `http://127.0.0.1:8000`
  - Swagger UI kiểm thử API: `http://127.0.0.1:8000/api/docs`
  - Giao diện Retrieval Lab nội bộ: `http://127.0.0.1:8000`
- **Next.js Web Portal (Phòng khám YG):** `http://localhost:3000`
  - Bàn tư vấn triệu chứng AI: `http://localhost:3000/tro-ly`
  - Danh mục chuyên khoa: `http://localhost:3000/chuyen-khoa`
  - Đặt lịch khám: `http://localhost:3000/dat-lich`

Tham số tùy chọn: `-NoBrowser`, `-NoReload`, `-BackendPort 8010 -FrontendPort 3010`, `-SkipChecks`.

> Lần tìm kiếm triệu chứng **đầu tiên mất ~40 giây** do nạp model 1.1 GB vào RAM (trên CPU); các lần sau trả kết quả dưới 1 giây.

### Bước 3: Dừng hệ thống

```powershell
.\stop-botmedical.ps1
```

Đóng cả hai cửa sổ dịch vụ và giải phóng cổng 8000/3000 — dùng khi gặp lỗi `Port is already in use`.

### Lưu ý về LLM

Ứng dụng web **không gọi LLM**: luồng `/tro-ly` chỉ đi qua guardrail regex + hybrid retrieval (ChromaDB + BM25). Vì vậy **không cần Ollama và không cần `GEMINI_API_KEY`** để chạy web. LLM chỉ phục vụ các script dòng lệnh trong `scripts/` (`test_chat.py`, `run_golden_eval.py`, `run_eval.py`).

---

## 6. Hướng dẫn phát triển tiếp (Developer Guide)

### 6.1 Thêm bệnh mới vào Knowledge Base

1. Tạo một file JSON mới trong thư mục tương ứng theo chuyên khoa tại `data/diseases_expanded/<chuyen_khoa>/<MA_BENH>.json` (Ví dụ: `RESP_050.json`).
2. Định dạng file tuân thủ theo `DiseaseSchema` trong [`src/knowledge/schema.py`](file:///D:/BotMedical/src/knowledge/schema.py):
```json
{
  "disease_id": "RESP_050",
  "name_vi": "Viêm thanh khí phế quản cấp",
  "name_en": "Croup (Laryngotracheobronchitis)",
  "category": "respiratory",
  "aliases": ["Bệnh Croup", "Viêm thanh quản co thắt"],
  "tier": 1,
  "urgency": "high",
  "description": "Nhiễm trùng đường hô hấp trên thường gặp ở trẻ nhỏ gây phù nề thanh quản...",
  "symptoms": {
    "common": [
      {"name_vi": "Ho ông ổng như tiếng chó sủa", "name_en": "Barking cough", "frequency": "very_common"},
      {"name_vi": "Thở rít thì hít vào (stridor)", "name_en": "Inspiratory stridor", "frequency": "common"},
      {"name_vi": "Khàn tiếng", "name_en": "Hoarseness", "frequency": "common"}
    ],
    "occasional": [
      {"name_vi": "Sốt nhẹ", "name_en": "Low-grade fever", "frequency": "occasional"}
    ]
  },
  "red_flags": [
    "Thở rít ngay cả khi nằm yên nghỉ ngơi",
    "Co kéo cơ hô hấp phụ, rút lõm hõm ức",
    "Tím tái quanh môi hoặc móng tay"
  ],
  "provenance": {
    "source_document": "Hướng dẫn chẩn đoán và điều trị một số bệnh thường gặp ở trẻ em",
    "issuing_body": "Bộ Y Tế",
    "year": 2023
  }
}
```
3. Chạy script xác thực schema:
```powershell
.\venv\Scripts\python.exe -c "from src.knowledge.schema import load_all_diseases; diseases = load_all_diseases(); print(f'Validated {len(diseases)} diseases successfully!')"
```

### 6.2 Tái lập chỉ mục Vector ChromaDB

Mỗi khi chỉnh sửa hoặc thêm mới file JSON bệnh học, bạn cần cập nhật lại cơ sở dữ liệu vector:
```powershell
.\venv\Scripts\python.exe scripts\build_retrieval_index.py --device cuda --batch-size 32
```
*Lưu ý: Script có cơ chế resume thông minh; các bản ghi đã xử lý sẽ không bị tính toán lại nếu không thay đổi nội dung.*

### 6.3 Chạy bộ kiểm thử (Unit & Integration Tests)

Trước khi commit bất kỳ thay đổi nào lên mã nguồn, bắt buộc chạy bộ kiểm thử để đảm bảo tính an toàn:
```powershell
.\venv\Scripts\python.exe -m pytest tests -q
```
Tất cả các bài test (kiểm tra Regex cấp cứu, kiểm tra tách từ tiếng Việt, kiểm tra cấu hình runtime) phải hiển thị kết quả **PASS**.

### 6.4 Quy trình chuẩn bị huấn luyện mô hình V3

Khi muốn tiếp tục huấn luyện vòng mới (V3 candidate) trên hệ thống GPU Cloud (NVIDIA A100 / L40S):

1. **Chuẩn bị dữ liệu Holdout & Review lâm sàng:**
   ```powershell
   # Tạo form phân xử lâm sàng
   .\venv\Scripts\python.exe scripts\prepare_clinical_adjudication.py
   
   # Kiểm tra tiến độ review của các bác sĩ
   .\venv\Scripts\python.exe scripts\audit_clinical_review_progress.py --require-ready
   
   # Đóng gói tập clinical holdout sau khi đã đủ 400 ca duyệt tay
   .\venv\Scripts\python.exe scripts\build_clinical_holdout.py --dataset-id clinical-final-v1
   
   # Xác thực tính toàn vẹn của holdout
   .\venv\Scripts\python.exe scripts\validate_clinical_holdout.py data/test_cases/clinical_holdout.json
   ```

2. **Chạy kiểm tra tiền bay (Preflight Check):**
   ```powershell
   .\venv\Scripts\python.exe scripts\preflight_gpu_training.py
   ```
   Lệnh này bảo đảm dữ liệu không bị trùng lặp giữa tập train và tập test, model incumbent đã được tải đủ và các file manifest khớp SHA-256.

3. **Huấn luyện trên GPU Cloud (ví dụ A100 40GB):**
   ```bash
   python scripts/train_bge_m3.py \
       --profile cloud-a100 \
       --base-model BAAI/bge-m3 \
       --epochs 3 \
       --lr 2e-5 \
       --output-dir models/bge-m3-medical-v3-candidate
   ```

4. **Đánh giá và Hòa trộn (Weight Blending):**
   Sau khi train xong checkpoint V3 raw, chạy script quét alpha blend và benchmark đối đầu với `bge-m3-medical-v2-recovered-a050-fp16` trước khi xin phê duyệt phát hành.

---

## Bản quyền & Miễn trừ trách nhiệm y khoa

- **Thương hiệu:** © 2026 **Phòng khám Đa khoa Quốc tế YG**. Bảo lưu mọi quyền.
- **Tuyên bố y khoa (Medical Disclaimer):** Hệ thống AI của Phòng khám YG được thiết kế như một công cụ hỗ trợ thông tin và định hướng ban đầu cho người bệnh. Kết quả của hệ thống **tuyệt đối không cấu thành chẩn đoán y khoa, phác đồ điều trị hay đơn thuốc**. Trong mọi trường hợp xuất hiện dấu hiệu bất thường về sức khỏe hoặc tình huống khẩn cấp, người bệnh cần gọi ngay **Cấp cứu 115** hoặc đến cơ sở y tế gần nhất để được bác sĩ thăm khám trực tiếp.
