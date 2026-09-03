# Figma Audit & Token System Mapping (Agent Brief 09)

> **Quy chế áp dụng:** Hệ thống thiết kế chuẩn xuất bản y khoa **"The Care Journal"** (Approved Gap Design Architecture) theo đặc tả của [Agent Brief 09](file:///D:/BotMedical/docs/agent_briefs/09_rebuild_clinic_ui_auth_figma.md).

---

## 1. Bảng trích xuất Design Tokens (The Care Journal Token System)

| Token Name | Light Mode (HEX) | Dark Mode (HEX) | Vai trò & Mục đích sử dụng | Tiêu chuẩn WCAG |
| :--- | :--- | :--- | :--- | :--- |
| `--paper` | `#F5F1E8` | `#121A18` | Nền canvas chính (giấy ấm / nền trầm dịu mắt) | Nền trung tính |
| `--paper-raised` | `#FBF9F4` | `#1A2422` | Bề mặt nổi (thẻ bài viết, panel tham vấn, form) | Nền nổi nhẹ |
| `--ink` | `#17211F` | `#EAE6DF` | Mực chữ chính (tiêu đề, nội dung người bệnh đọc) | **WCAG AA (>12:1)** |
| `--ink-muted` | `#59625E` | `#9BA5A1` | Chữ phụ, lề folio, chú thích bản quyền | **WCAG AA (>4.5:1)** |
| `--line` | `#D7D2C7` | `#2D3A37` | Đường kẻ hairline chia phân đoạn folio | Phân tách tinh tế |
| `--mineral` | `#285E55` | `#4A8A7F` | Màu hành động chính (nút bấm, active tab) | **WCAG AA (4.8:1)** |
| `--mineral-hover` | `#1F4A43` | `#5DA599` | Trạng thái hover nút bấm chính | Tăng tương phản |
| `--sage` | `#DDE6DF` | `#233330` | Nền phụ, thẻ chuyên khoa active, badge | Dịu mắt |
| `--clay` | `#B96F54` | `#D48E75` | Điểm nhấn ấm áp (folio accent, ghi chú) | Phụ trợ |
| `--emergency` | `#971E26` | `#C93B44` | **BẢO LƯU CẤP CỨU**: Dải cảnh báo 115, lỗi nghiêm trọng | **WCAG AAA (>7:1)** |
| `--emergency-soft`| `#F8E7E8` | `#301618` | Nền thông báo cấp cứu & nút gọi khẩn | An toàn trực quan |

---

## 2. Bản đồ Thành phần giao diện (Component Inventory & Node Mapping)

| Component Name | File Path | Vai trò thiết kế | Trạng thái & Quyết định |
| :--- | :--- | :--- | :--- |
| `Header` | `components/clinic/Header.tsx` | Thanh đầu trang mờ nhẹ, điều hướng, nút 115 một chạm, nút Sổ người bệnh | `NEW — Approved Gap Design` |
| `Footer` | `components/clinic/Footer.tsx` | Chân trang thông tin cơ sở, giờ mở cửa, disclaimer y tế toàn site | `NEW — Approved Gap Design` |
| `HeroSection` | `components/clinic/HeroSection.tsx` | Bố cục Folio 01, tiếp nhận triệu chứng kín đáo lưu session, ảnh tư liệu | `NEW — Approved Gap Design` |
| `SpecialtyNavigator` | `components/clinic/SpecialtyNavigator.tsx` | Danh mục 6 chuyên khoa đánh số thứ tự liền mạch | `NEW — Approved Gap Design` |
| `CarePathway` | `components/clinic/CarePathway.tsx` | Quy trình 4 bước tiếp đón và điều trị | `NEW — Approved Gap Design` |
| `FAQAccordion` | `components/clinic/FAQAccordion.tsx` | Giải đáp thắc mắc người bệnh bằng danh mục disclosure | `NEW — Approved Gap Design` |
| `EmergencyBanner` | `components/triage/EmergencyBanner.tsx` | Dải cảnh báo đỏ `#971E26`, nút gọi 115 cao 56px, `aria-live="assertive"` | `NEW — Approved Gap Design` |
| `TriageDesk` | `components/triage/TriageDesk.tsx` | Bản ghi tham vấn triệu chứng (Consultation Record) 65/35 | `NEW — Approved Gap Design` |
| `ClinicalMap` | `components/triage/ClinicalMap.tsx` | Bảng lề ghi nhận triệu chứng và tối đa 3 bệnh cảnh gợi ý | `NEW — Approved Gap Design` |
| `DiseaseCandidate` | `components/triage/DiseaseCandidate.tsx` | Thẻ nhóm bệnh cảnh có biểu hiện tương đồng (nhãn: Rất phù hợp / Phù hợp) | `NEW — Approved Gap Design` |
| `Auth Pages` | `app/(auth)/*` | Trọn bộ Đăng ký, Đăng nhập, Mã xác minh, Quên mật khẩu, Sổ người bệnh | `NEW — Approved Gap Design` |
