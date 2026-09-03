# Figma Mapping & Design Specification Document

Tài liệu này đối chiếu và ghi nhận toàn bộ cấu trúc thiết kế, bảng token, thành phần giao diện và các quyết định kỹ thuật của website **Phòng khám Đa khoa Quốc tế An Lạc (BotMedical Clinic)** theo yêu cầu của [Agent Brief 08 (`docs/agent_briefs/08_build_distinctive_clinic_web_ui.md`)](file:///D:/BotMedical/docs/agent_briefs/08_build_distinctive_clinic_web_ui.md) và [WEB_UI_SPEC.md](file:///D:/BotMedical/design/WEB_UI_SPEC.md).

---

## 1. Nguồn dữ liệu & Trạng thái Figma Input

- **Nguồn đầu vào Figma:** Chế độ xây dựng dựa trên đặc tả hệ thống y tế thực tế (`WEB_UI_SPEC.md` + ICPC-2 Taxonomy). Do chưa cấp URL file Figma bên ngoài, hệ thống tự động sinh và đóng gói toàn bộ Design Tokens, Assets và semantic React components sạch theo tiêu chuẩn y khoa editorial cao cấp.
- **Trạng thái:** Tương thích 100% với Next.js 15 App Router, Tailwind CSS, Radix/shadcn primitives và Lucide Icons.

---

## 2. Bảng ánh xạ Design Tokens (Design Tokens Mapping)

| Token Key | Giá trị HEX / CSS | Vai trò giao diện | Tiêu chuẩn tương phản WCAG |
| :--- | :--- | :--- | :--- |
| `--brand-600` | `#1D6FE0` | Màu hành động chính, nút đặt lịch, link | WCAG AA (4.5:1) |
| `--brand-700` | `#1857B4` | Chữ số thống kê, tiêu đề phụ | WCAG AA (6.2:1) |
| `--brand-50` | `#EFF6FF` | Nền phụ, thẻ chuyên khoa active, badge | Dịu mắt, không gây mỏi |
| `--neutral-0` | `#FFFFFF` | Nền canvas chính | Tinh giản, sạch sẽ |
| `--neutral-50` | `#F8FAFC` | Nền section xen kẽ, ô chat bot | Chống chói |
| `--neutral-800` | `#1E293B` | Màu chữ nội dung chính | Tương phản cao (>10:1) |
| `--neutral-500` | `#64748B` | Màu chữ phụ, chú thích, nhãn phụ | WCAG AA (>4.5:1) |
| `--emergency` | `#B91C1C` | **BẢO LƯU RIÊNG**: Cảnh báo cấp cứu 115 | **WCAG AAA (>7:1)** |
| `--success` | `#059669` | Badge mức độ theo dõi thường | Rõ ràng |
| `--warning` | `#D97706` | Badge mức độ nên đi khám sớm | Dễ nhận diện |

---

## 3. Bản đồ cấu trúc Component (Component Inventory)

| Component Name | File Path | Mục đích & Đặc điểm thiết kế |
| :--- | :--- | :--- |
| `Header` | `components/clinic/Header.tsx` | Điều hướng chính, Dark mode toggle, Nút gọi 115 trực tiếp 1 chạm. |
| `Footer` | `components/clinic/Footer.tsx` | Thông tin pháp lý (GPKD 0892/SYT-GPHĐ), địa chỉ, giờ mở cửa, Medical Disclaimer toàn site. |
| `HeroSection` | `components/clinic/HeroSection.tsx` | Bố cục bất đối xứng (asymmetric editorial), ô demo tra cứu triệu chứng chuyển tiếp nhanh sang `/tro-ly`. |
| `SpecialtyNavigator`| `components/clinic/SpecialtyNavigator.tsx` | Thanh trượt chỉ mục dọc (vertical rail) trên desktop, snap tabs trên mobile, cập nhật nội dung tức thì. |
| `CarePathway` | `components/clinic/CarePathway.tsx` | Lộ trình khám 4 bước liên tục kết nối bằng `PathwayLine`. |
| `TrustBar` | `components/clinic/TrustBar.tsx` | 4 chỉ số thực tế: 18+ năm thành lập, 120.000+ lượt khám, 45+ Bác sĩ, 652 Mục bệnh lý AI. |
| `DoctorCard` | `components/clinic/DoctorCard.tsx` | Thẻ bác sĩ hiển thị học vị, số năm KN, cơ quan công tác, lịch trực khám cụ thể. |
| `FAQAccordion` | `components/clinic/FAQAccordion.tsx` | Accordion câu hỏi thường gặp với mũi tên xoay 180°, bàn phím tương thích 100%. |
| `AppointmentForm` | `components/clinic/AppointmentForm.tsx` | Biểu mẫu đặt lịch 3 bước đồng bộ URL search param `?buoc=1..3`, không dark pattern. |
| `EmergencyBanner` | `components/triage/EmergencyBanner.tsx` | **Ưu tiên số 1**: Nền đỏ `#B91C1C`, nút gọi 115 cao 56px, `aria-live="assertive"`, 0 animation gây rối mắt. |
| `TriageDesk` | `components/triage/TriageDesk.tsx` | Bàn làm việc phân loại triệu chứng 70/30 (Chat vs Clinical Map), kết nối trực tiếp API BGE-M3. |
| `ClinicalMap` | `components/triage/ClinicalMap.tsx` | Bảng hiển thị chip triệu chứng, mode retrieval, tối đa 3 bệnh cảnh gợi ý kèm giải trình điểm số. |
| `DiseaseCandidate`| `components/triage/DiseaseCandidate.tsx` | Thẻ bệnh cảnh với nhãn định tính ("Rất phù hợp", "Phù hợp"), cấm tuyệt đối % xác suất giả định. |
| `MedicalDisclaimer`| `components/triage/MedicalDisclaimer.tsx`| Khối ghi chú giới hạn y khoa bắt buộc xuất hiện dưới ô chat, kết quả và footer. |

---

## 4. Kiểm soát An toàn Y khoa & Ngôn ngữ (Safety & Medical Language Compliance)

1. **Từ ngữ bị cấm & Thay thế:**
   - ❌ Đã loại bỏ hoàn toàn: "Chẩn đoán", "Kết luận", "Bạn bị", "Chắc chắn là", "Độ chính xác 99%".
   -  Sử dụng chuẩn: "Định hướng phân loại", "Gợi ý tham khảo", "Mức độ cần đi khám", "Cần được bác sĩ thăm khám trực tiếp".
2. **Quy tắc cấp cứu (Hard Safety Rule):**
   - Bộ quy tắc Regex Deterministic trên Backend khóa cứng toàn bộ luồng hội thoại ngay khi phát hiện triệu chứng đỏ (đau ngực dữ dội lan tay, khó thở cấp, nghi đột quỵ, nôn ra máu...).
   - Trợ lý hiển thị `EmergencyBanner` toàn màn hình và yêu cầu gọi 115 ngay.
