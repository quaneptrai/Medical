# Cơ sở dữ liệu — Phòng khám Đa khoa Quốc tế Quang Thanh

Tài liệu này mô tả toàn bộ dữ liệu mà cổng web đang dùng: nó nằm ở đâu, gồm những bảng gì,
và những cột nào mới được thêm cho tính năng hồ sơ người bệnh.

---

## 1. Dữ liệu nằm ở đâu

Hệ thống có **hai kho dữ liệu tách biệt**, không dùng chung công nghệ:

| Kho | Đường dẫn | Công nghệ | Ai đọc/ghi |
|---|---|---|---|
| **CSDL vận hành** | `frontend/clinic/data/auth.db` | SQLite (better-sqlite3, WAL) | Các route API của Next.js |
| **Kho tri thức bệnh** | `data/diseases/` + `data/diseases_expanded/` | Tệp JSON | Backend FastAPI (truy hồi) và script sinh thư viện |
| **Thư viện bệnh cho web** | `frontend/clinic/data/disease-library.json` | JSON sinh tự động | Trang `/benh` và `/co-the-nguoi` |
| **Chỉ mục vector** | `data/embeddings/chroma.sqlite3` | Chroma | Backend FastAPI |

Lược đồ SQLite được tạo và nâng cấp tự động khi tiến trình web khởi động, trong
`frontend/clinic/lib/auth/db.ts` (hàm `initSchema`). Không cần chạy migration thủ công:
các cột mới được thêm bằng `ALTER TABLE` có kiểm tra `PRAGMA table_info`, nên tệp `auth.db` cũ
vẫn dùng được.

Thư viện bệnh cho web **không** được viết tay — sinh lại bằng:

```bash
cd frontend/clinic
node scripts/build-disease-library.cjs      # đọc data/diseases* -> data/disease-library.json
```

---

## 2. Các bảng trong `auth.db`

Số dòng dưới đây là số liệu tại thời điểm viết tài liệu (dữ liệu demo).

### 2.1 Tài khoản và phân quyền

| Bảng | Dòng | Vai trò |
|---|---|---|
| `users` | 43 | Tài khoản đăng nhập **và** hồ sơ người bệnh |
| `sessions` | 28 | Phiên đăng nhập, cookie HttpOnly trỏ tới đây |
| `roles` | 5 | `super_admin`, `clinic_admin`, `doctor`, `staff`, `patient` |
| `permissions` | 14 | Quyền đơn lẻ, nhóm theo `category` |
| `role_permissions` | 34 | Vai trò ↔ quyền |
| `user_roles` | 42 | Người dùng ↔ vai trò (có `tenant_id`) |
| `verification_tokens` | 0 | Mã xác minh email 6 số, hạn 24 giờ |
| `password_reset_tokens` | 0 | Mã đặt lại mật khẩu |

**`users` — cột quan trọng**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT PK | UUID |
| `email` | TEXT NOT NULL | Duy nhất, dùng để đăng nhập |
| `username` | TEXT | **Mới** — tên đăng nhập, duy nhất, có thể null với tài khoản cũ |
| `password_hash` | TEXT NOT NULL | Argon2id |
| `display_name` | TEXT | Tên hiển thị khi đăng ký |
| `full_name` | TEXT | **Mới** — họ tên trên hồ sơ khám bệnh |
| `phone` | TEXT | Số điện thoại liên hệ |
| `date_of_birth` | TEXT | **Mới** — `YYYY-MM-DD` |
| `gender` | TEXT | **Mới** — `male` / `female` / `other` |
| `address` | TEXT | **Mới** — địa chỉ liên hệ |
| `profile_updated_at` | INTEGER | **Mới** — lần cuối người dùng lưu hồ sơ |
| `is_verified` | INTEGER | 1 khi đã xác minh email |
| `status` | TEXT | `active` hoặc `suspended` (bị chặn) |
| `created_at` / `updated_at` | INTEGER | Epoch giây |

Chỉ mục: `idx_users_username` — `UNIQUE ... WHERE username IS NOT NULL`,
cho phép nhiều tài khoản cũ cùng để trống tên đăng nhập.

**Quy tắc hồ sơ đầy đủ.** Năm cột `full_name`, `phone`, `date_of_birth`, `gender`, `address`
phải có giá trị thì người dùng mới đặt được lịch khám. Logic kiểm tra nằm ở
`frontend/clinic/lib/auth/profile.ts` và được áp dụng ở cả giao diện lẫn API.

**Vai trò và quyền hiện có**

| Vai trò | Mô tả |
|---|---|
| `super_admin` | Super Administrator — toàn quyền, không thể bị chặn hay gỡ quyền |
| `clinic_admin` | Clinic Administrator |
| `doctor` | Bác sĩ chuyên khoa |
| `staff` | Nhân viên lễ tân / tư vấn |
| `patient` | Người bệnh / khách hàng (mặc định khi đăng ký) |

| Nhóm | Quyền |
|---|---|
| APPOINTMENT | `appointments:read`, `appointments:write`, `appointments:status_update` |
| BILLING | `invoices:read`, `invoices:demo_pay` |
| CLINICAL_AI | `triage:use`, `triage:view_all` |
| MASTER_DATA | `catalog:manage` |
| REPORTING | `analytics:view` |
| SAAS_CHAT | `chat:patient_send`, `chat:doctor_reply` |
| SYSTEM | `settings:manage` |
| USER_MANAGEMENT | `users:manage`, `roles:assign` |

### 2.2 Tổ chức và danh mục y khoa

| Bảng | Dòng | Vai trò |
|---|---|---|
| `tenants` | 1 | Cơ sở/chi nhánh (`yg-clinic-hn`), thương hiệu, giấy phép, hotline |
| `specialties` | 10 | Chuyên khoa: mô tả, triệu chứng thường gặp, trưởng khoa, số bệnh lý bao phủ |
| `doctors` | 40 | Hồ sơ bác sĩ: học vị, kinh nghiệm, nơi công tác, lịch nhận bệnh, `image_url`, `qualifications`, `achievements` |
| `services` | 4 | Dịch vụ và gói khám, có `price` / `discount_price` |

Các cột dạng danh sách (`available_days`, `qualifications`, `achievements`, `common_symptoms`)
lưu chuỗi JSON; đọc bằng `parseStringList` trong `lib/doctor-catalog.ts`.

Ảnh chân dung bác sĩ là SVG minh họa sinh tại chỗ, đặt ở `public/images/doctors/`,
tạo lại bằng `node scripts/generate-doctor-portraits.cjs`.

### 2.3 Khám chữa bệnh

| Bảng | Dòng | Vai trò |
|---|---|---|
| `appointments` | 1 | Lịch khám: ngày giờ, khoa, bác sĩ, `queue_number`, trạng thái, `checkin_at`, `completed_at` |
| `consultation_records` | 0 | Bệnh án sau khám: chẩn đoán sơ bộ, hướng điều trị |
| `invoices` | 1 | Hóa đơn demo gắn với lịch khám (`payment_method = vietqr_demo`) |
| `patient_feedback` | 40 | Đánh giá của người bệnh theo bác sĩ và khoa |

`appointments.patient_name` và `patient_phone` **không** nhận từ biểu mẫu nữa — API
`POST /api/appointments` lấy thẳng từ hồ sơ của tài khoản đang đăng nhập.

### 2.4 Trợ lý sức khỏe

| Bảng | Dòng | Vai trò |
|---|---|---|
| `ai_triage_sessions` | 2 | Phiên hỏi đáp: lý do khám chính, cờ cấp cứu, khoa được gợi ý |
| `ai_triage_logs` | 2 | Từng lượt hỏi đáp, triệu chứng trích xuất, top ứng viên, độ trễ |
| `chat_channels` | 1 | Kênh tư vấn giữa người bệnh và bác sĩ |
| `chat_messages` | 5 | Tin nhắn trong kênh |

### 2.5 Vận hành

| Bảng | Dòng | Vai trò |
|---|---|---|
| `inventory_items` | 9 | Thuốc và vật tư: tồn hiện tại, tồn tối thiểu, hạn dùng |
| `stock_movements` | 9 | Phiếu nhập/xuất, tự cập nhật tồn |
| `maintenance_records` | 5 | Tài sản, lịch bảo trì, trạng thái cảnh báo |
| `system_settings` | 0 | Cấu hình theo `tenant` dạng khóa–giá trị |
| `audit_logs` | 15 | Nhật ký thao tác: `action`, `resource_type`, `resource_id`, IP, user agent |

`audit_logs` là nguồn của mục **Lịch sử thao tác** trong bảng chi tiết người dùng ở trang điều hành.

---

## 3. Thư viện bệnh (`disease-library.json`)

Sinh từ 652 tệp JSON trong kho tri thức, sau khi khử trùng lặp còn **669 mục bệnh**.

Mỗi mục gồm: `slug`, `name`, `aliases`, `category`, `system`, `tier`, `urgency`, `summary`,
`symptoms` (common / occasional / rare), `riskFactors`, `redFlags`, `emergencySigns`,
`questions`, `differentials`, `phrasings`, `source`.

Phân bố theo hệ cơ quan:

| Hệ cơ quan | Số mục | | Hệ cơ quan | Số mục |
|---|---|---|---|---|
| Nội tiết & Toàn thân | 155 | | Da – Tóc – Móng | 42 |
| Tiêu hóa – Gan mật | 86 | | Cơ – Xương – Khớp | 32 |
| Ung bướu & Khối u | 79 | | Não bộ & Hệ thần kinh | 31 |
| Phổi & Đường hô hấp | 67 | | Sản – Phụ khoa | 31 |
| Tim & Mạch máu | 50 | | Bệnh truyền nhiễm | 15 |
| Thận & Tiết niệu | 46 | | Mắt & Thị giác | 14 |
| | | | Tai – Mũi – Họng | 13 |
| | | | Nam khoa | 8 |

**Về chất lượng dữ liệu.** 49 mục tier-1 được biên tập tay; 603 mục tier-2 sinh từ bộ dữ liệu
tự gán nhãn nên script build phải lọc: bỏ câu hỏi của người dùng lẫn trong danh sách triệu chứng,
bỏ "tên tiếng Anh" vốn chỉ là bản không dấu của tên tiếng Việt, bỏ tên thuốc/tác nhân đứng lẻ,
chuẩn hóa viết hoa và viết lại phần mô tả rỗng. Vẫn còn một số mảnh vụn trong dữ liệu gốc —
muốn sạch hẳn thì phải biên tập lại `data/diseases_expanded/`, không xử lý được bằng code.

---

## 4. Sao lưu và khởi tạo lại

`auth.db` chạy ở chế độ WAL nên thư mục `data/` có kèm `auth.db-wal` và `auth.db-shm`.
Khi sao lưu phải chép cả ba tệp, hoặc dừng dịch vụ trước khi chép.

Các script khởi tạo dữ liệu mẫu, chạy trong `frontend/clinic`:

```bash
node scripts/seed-super-admin.cjs        # tài khoản quản trị cao nhất
node scripts/seed-doctor-catalog.cjs     # 40 bác sĩ theo 10 chuyên khoa
node scripts/seed-doctor-accounts.cjs    # tài khoản đăng nhập cho bác sĩ
node scripts/seed-operations.cjs         # kho, bảo trì, phản hồi
node scripts/generate-doctor-portraits.cjs   # ảnh chân dung minh họa
node scripts/build-disease-library.cjs       # thư viện bệnh cho web
```

Xóa `auth.db` rồi khởi động lại tiến trình web sẽ tạo lại lược đồ trống — nhưng **mất toàn bộ
tài khoản và lịch hẹn**, nên chỉ làm khi thực sự muốn dựng lại từ đầu.
