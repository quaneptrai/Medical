# Current UI Audit & Reconstruction Plan (Agent Brief 09)

> **Mục đích:** Đánh giá toàn diện hiện trạng giao diện website phòng khám theo yêu cầu của [Agent Brief 09 (`docs/agent_briefs/09_rebuild_clinic_ui_auth_figma.md`)](file:///D:/BotMedical/docs/agent_briefs/09_rebuild_clinic_ui_auth_figma.md). Xác định 10 khiếm khuyết cốt lõi và lập danh mục loại bỏ triệt để các khuôn mẫu giao diện AI/SaaS đại trà để tái thiết kế theo phong cách xuất bản y khoa chuẩn mực (**The Care Journal**).

---

## 1. Bảng đánh giá 10 khiếm khuyết cốt lõi (Defect Audit Matrix)

| STT | Vấn đề phát hiện | Thành phần ảnh hưởng | Mức độ | Quyết định xử lý trong Brief 09 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Độ tương phản Dark Mode kém:** Một số tiêu đề và nhãn bị chìm vào nền tối. | `HeroSection`, `Header`, `SpecialtyNavigator` | **Nghiêm trọng (High)** | Tái lập bảng token ngữ nghĩa đo lường WCAG AA (>4.5:1) và AAA (>7:1) cho cấp cứu. |
| **2** | **Tràn viền trên Mobile 390px (Horizontal Overflow):** Thẻ chip, thanh điều hướng và khung input bị cắt lề phải trên màn hình nhỏ. | `HeroSection`, `Header`, `TriageDesk` | **Nghiêm trọng (High)** | Viết lại toàn bộ responsive shell: `min-width: 0`, loại bỏ hoàn toàn các width cố định vượt quá 390px. |
| **3** | **Khung nhìn đầu trang (First Fold) bị quá tải:** Status pill, tiêu đề lớn, console tra cứu, 4 thẻ triệu chứng nhanh, thẻ kiến trúc AI, 3 thẻ tiến trình cùng xuất hiện một lúc. | `HeroSection` | **Cao (High)** | Tái cấu trúc theo bố cục trang báo y khoa (Editorial Spread): 1 thông điệp chính, 1 ảnh thực tế/minh họa tinh giản, 1 ô tiếp nhận triệu chứng gọn gàng. |
| **4** | **Lạm dụng khuôn mẫu AI đại trà (AI-template Clichés):** Chữ gradient xanh, đốm sáng radial mờ ảo, chấm xanh nhấp nháy, thẻ AI Engine màu chàm tối, icon trong vòng tròn, mini dashboard. | `HeroSection`, `Header` | **Rất cao (Critical)** | **LOẠI BỎ 100%**: Thay bằng nền giấy ấm (`--paper: #F5F1E8`), mực xanh đen (`--ink: #17211F`), đường nét hairline thanh mảnh và typography xuất bản chuẩn. |
| **5** | **Bố cục "nồi lẩu section" (Section Soup):** Trang chủ là chuỗi các khối hộp lặp lại đơn điệu (trust strip $\rightarrow$ specialty grid $\rightarrow$ process $\rightarrow$ doctor cards $\rightarrow$ FAQ $\rightarrow$ full-width CTA). | `app/page.tsx` | **Cao (High)** | Thiết kế trang chủ như một **Nhật ký chăm sóc sức khỏe liên tục (Care Journal)** với lề ghi chú (annotated margin) kết nối tự nhiên. |
| **6** | **Lộ thuật ngữ kỹ thuật AI cho người bệnh:** BGE-M3, Dense Vector, BM25, Hybrid, độ trễ milliseconds, mã bệnh học lộ liễu. | `HeroSection`, `TriageDesk`, `DiseaseCandidate` | **Cao (High)** | Ẩn 100% thuật ngữ kỹ thuật khỏi giao diện bệnh nhân; chỉ hiển thị bằng ngôn ngữ y khoa thường thức ("Gợi ý chuyên khoa liên quan", "Mức độ cần đi khám"). |
| **7** | **Dữ liệu giả lập chưa kiểm chứng:** Các con số bịa như "18+ năm", "120.000+ lượt khám", "45+ bác sĩ", GPKD 0892/SYT-GPHĐ, tên bệnh viện liên kết. | `clinic-data.ts` | **Nghiêm trọng (High)** | **LOẠI BỎ TOÀN BỘ SỐ LIỆU BỊA**: Sử dụng nhãn trung thực hoặc thông tin định tính xác thực từ phòng khám. |
| **8** | **Thiếu hệ thống Xác thực người dùng (Auth System):** Chưa có luồng Đăng ký, Đăng nhập, Quên mật khẩu, Xác minh email, Quản lý tài khoản bảo mật. | `app/` | **Chặn luồng (Blocker)** | Xây dựng trọn bộ hệ thống Auth chuẩn bảo mật (Argon2id / HttpOnly Cookie sessions / CSRF / Rate limiting) cho bệnh nhân. |
| **9** | **Fallback trạng thái API chưa chặt chẽ:** Nếu backend offline, client không được hiển thị trạng thái "sẵn sàng" giả tạo. | `botmedical-api.ts`, `app/api/` | **Trung bình (Medium)** | Xử lý ma trận trạng thái API chuẩn: Loading, Offline, Index Building, Success, Empty, Emergency. |
| **10** | **Truyền triệu chứng qua URL query string (`?q=`):** Tiềm ẩn rủi ro lộ dữ liệu sức khỏe trong lịch sử duyệt web hoặc log máy chủ. | `HeroSection`, `app/tro-ly/page.tsx` | **Bảo mật (Security)** | Chuyển sang cơ chế truyền phiên ngắn hạn trong bộ nhớ (In-memory / Session state), không đính kèm triệu chứng vào URL công khai. |

---

## 2. Danh mục các thành phần Giữ lại vs. Thay thế triệt để

###  GIỮ LẠI (Preserve):
1. **Core Retrieval Backend:** Proxy cùng nguồn `GET /api/status` và `POST /api/search` kết nối với model BGE-M3 V2 production.
2. **Deterministic Emergency Hard Override:** Chốt an toàn cấp cứu khóa cứng + Nút gọi 115 một chạm đạt chuẩn WCAG AAA.
3. **Medical Disclaimer & Non-diagnostic Phrasing:** Tuyệt đối không dùng từ "chẩn đoán", "kết luận", "bạn bị", "xác suất %".

### ❌ THAY THẾ HOÀN TOÀN (Replace):
1. **Hero cũ:** Xóa bỏ toàn bộ thẻ AI Engine chàm tối, chữ gradient, đốm sáng mờ ảo, chấm xanh nhấp nháy.
2. **Dữ liệu giả lập:** Xóa bỏ toàn bộ thống kê "18+", "120.000+", "45+", giấy phép bịa.
3. **Layout bong bóng chat ChatGPT:** Thay bằng giao diện **Hồ sơ tham vấn y khoa (Consultation Record)** dạng bản thảo xuất bản thanh lịch.
4. **Hệ thống Design Tokens:** Chuyển sang bảng màu **The Care Journal** (Giấy ấm `#F5F1E8`, Mực `#17211F`, Xanh khoáng `#285E55`, Đất nung `#B96F54`, Đỏ cấp cứu `#971E26`).
5. **Thêm mới toàn bộ luồng Auth:** Đăng ký, Đăng nhập, Xác minh email, Đặt lại mật khẩu, Hồ sơ bảo mật tài khoản.
