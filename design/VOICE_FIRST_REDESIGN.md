# Hướng thiết kế frontend — Quang Thanh “Ngày khỏe hơn”

## Kết luận

Giao diện hiện tại bị đánh giá “quá minimal” không phải do thiếu card, mà do phần đầu trang dành quá nhiều diện tích cho một quả cầu AI trang trí, trong khi thao tác chính (mô tả triệu chứng/giọng nói) nhỏ, tối và gần như không có trạng thái sử dụng. Hướng mới đặt trải nghiệm phòng khám và người bệnh lên trước: sáng, ấm, nhiều điểm neo thị giác, rõ bước tiếp theo và không phô diễn công nghệ. First fold được tổ chức như một bàn tiếp nhận tác vụ, không phải hero banner quảng cáo.

Bản mẫu tương tác nằm tại `design/voice-first-concept/index.html`. Nhấn nút micro để xem trạng thái Listening và Transcript ready; các chip gợi ý sẽ điền nội dung vào ô nhập.

## Tài liệu nguồn đã đối chiếu

- Báo cáo thực tập: `D:\Downloads\Baocao_ThucTap_(ban2) (1).docx`.
- Frontend hiện tại: Next.js 15 trong `frontend/clinic`.
- Ảnh hiện trạng: `artifacts/ui-enigma-home-1440.png`, `artifacts/ui-enigma-chat-1440.png`, `artifacts/ui-enigma-home-390.png`.
- Figma prompt bàn giao: `design/FIGMA_PROMPT_VOICE_FIRST.md`.

## URL tham khảo

Chỉ tham khảo cấu trúc và độ bao phủ chức năng; không sao chép visual:

1. Doctor Appointment App UI Kit — luồng đặt lịch/consultation: https://www.figma.com/community/file/1335968192483996008/doctor-appointment-app-ui-kit
2. Figma Dashboard Templates — tham khảo cấu trúc admin/reporting: https://www.figma.com/templates/dashboard-designs/
3. Eucalyptus digital clinics — tham khảo cách giữ tính đồng nhất nhưng vẫn có bản sắc phòng khám: https://www.figma.com/customers/figma-empowers-eucalyptus-digital-clinics/
4. Doctor Anywhere — tham khảo accessibility và hệ sinh thái patient/provider tại Đông Nam Á: https://www.figma.com/customers/doctor-anywhere-designing-healthcare-experiences-faster/

## Nguyên tắc thiết kế đã chốt

- Thương hiệu hiển thị: Phòng khám Đa khoa Quốc tế Quang Thanh; loại bỏ tên YG và An Lạc khỏi mockup mới.
- Tươi sáng nhưng không trẻ con: nền kem, xanh ngọc, xanh trời, mint, vàng cúc và coral.
- Voice-first thật sự: nút micro là primary action; nhập chữ là fallback rõ ràng.
- Mọi thông tin sức khỏe nhạy cảm chỉ được lưu khi người dùng đồng ý.
- Không đưa triệu chứng lên query string.
- Không hiển thị tên model, độ trễ, xác suất bệnh hay điểm kỹ thuật.
- Không dùng số liệu bác sĩ/lượt khám/giấy phép chưa được phòng khám xác nhận.
- Cấp cứu là ngoại lệ thị giác: đỏ đậm, không animation, nút gọi 115 nổi bật.
- Không hero sân khấu, không bento/card spam, không pill/badge spam, không floating card trang trí và không copywriting khoe AI.

## Minh họa gốc dùng trong prototype

Ảnh `design/voice-first-concept/assets/clinic-family-hero.png` được tạo bằng built-in image generation mode và không chứa chữ, logo hay watermark. Final prompt:

```text
Use case: illustration-story
Asset type: hero illustration for a Vietnamese outpatient clinic website
Primary request: Create a warm, optimistic editorial illustration of a Vietnamese female doctor in a white coat welcoming a small family at a bright modern community clinic; convey attentive listening, trust, and approachable care.
Scene/backdrop: clean reception-consultation corner with subtle leafy plant, rounded window, small medical cross motif, and soft daylight.
Style/medium: polished contemporary flat-to-soft-3D editorial illustration, tactile paper-cut shapes, natural human proportions, friendly but not childish.
Composition/framing: landscape 3:2, people grouped to the right and center; leave calm open space on the left for interface copy; layered depth and enough visual detail to avoid a sparse/minimal feeling.
Lighting/mood: sunny morning, cheerful, reassuring, humane.
Color palette: warm cream, fresh teal, sky blue, coral accents, marigold yellow, deep navy for contrast.
Constraints: no text, no logos, no watermark, no medical claims, no needles, no surgery, no dark cyberpunk, no purple neon, no glassmorphism, no floating AI orb.
```

## Ma trận chức năng cần thiết kế trước khi dev

| Khu vực | Đã có route/UI | Còn thiếu thiết kế chính | Ưu tiên |
|---|---|---|---|
| Trang chủ bệnh nhân | Có, nhưng dark AI và voice chỉ là icon | Voice states, clinic content, chuyên khoa, chuyển đổi sang đặt lịch | P0 |
| AI triage | Có UI, proxy API và ghi `ai_triage_sessions/logs` | Permission/offline/empty/emergency, câu hỏi làm rõ, attachment, consent lưu lịch sử, chuyển bác sĩ | P0 |
| Đặt lịch | Có form/API, cấp `queue_number`, tạo invoice demo | Online/trực tiếp, chọn dịch vụ/khung giờ, dời/hủy, check-in, phiếu xác nhận | P0 |
| Auth & tài khoản bệnh nhân | Có auth routes, session, 5 roles/14 permissions và trang tài khoản | Hồ sơ sức khỏe, lịch sử tư vấn, lịch hẹn, hóa đơn, bảo mật phiên, role landing | P0 |
| Thanh toán & hóa đơn | Có `invoices` API/schema và mock payment | Checkout, VietQR/MoMo/cash demo, pending/success/failed/refunded, biên nhận | P1 |
| Chat bác sĩ/tư vấn viên | Có channel/messages APIs, attachment URL và read state | Patient chat, staff inbox/queue, upload states, transfer/escalation | P1 |
| Workspace bác sĩ | Có role/permission và bảng dữ liệu, chưa có page nghiệp vụ | Lịch, hàng đợi, hồ sơ, kết quả khám, ghi chú, kế hoạch điều trị, đơn thuốc | P1 |
| Workspace staff/lễ tân | Có role/permission và API dữ liệu, chưa có page nghiệp vụ | Tiếp nhận, STT khám, trạng thái lịch, chat queue, thu ngân demo | P1 |
| Admin hệ thống | Có RBAC/audit/settings tables, chưa có page/API quản trị tương ứng | User/RBAC, khóa tài khoản, tenant, cấu hình, audit log | P1 |
| Quản lý danh mục | Có `specialties/doctors/services` đã seed, trang công khai còn dùng dữ liệu tĩnh | CRUD bệnh nhân, bác sĩ, chuyên khoa, dịch vụ, gói khám, khuyến mãi, bảng giá | P1 |
| Báo cáo thống kê | Chưa có page | Doanh thu, lịch hẹn/dịch vụ, hiệu suất bác sĩ, hài lòng khách hàng | P2 |
| Tin tức y tế/đánh giá | Chưa có page | CMS tin tức, feedback/rating sau khám | P2 |

Kiểm tra read-only trên `frontend/clinic/data/auth.db` ngày 12/09/2026 cho thấy 22 bảng ứng dụng không tính bảng hệ thống SQLite. Ngoài các bảng nghiệp vụ được tài liệu kiến trúc gọi là “16 bảng lõi”, database vật lý còn gồm các bảng hỗ trợ auth/session/token. Dữ liệu seed hiện có: 1 tenant, 5 roles, 14 permissions, 34 role-permission mappings, 10 specialties, 10 doctors và 4 services.

## Frame Figma cần duyệt trước khi code production

1. Homepage Voice Intake — Desktop 1440 / Tablet 768 / Mobile 390.
2. VoiceInput component set — Idle / Listening / Ready / Processing / Permission denied / Offline / Emergency.
3. AI Triage — New session / Clarifying / Results / Empty / Error / Emergency.
4. Booking & Payment — happy path và các trạng thái lỗi.
5. Patient account.
6. Doctor workspace.
7. Staff / tư vấn viên / lễ tân workspace.
8. Admin catalog/RBAC.
9. Reports overview.

## Trạng thái Figma

Phiên làm việc hiện tại không có Figma MCP/server được kết nối và repository cũng không chứa URL/file key Figma thật. Vì vậy chưa thể tạo hoặc sửa file Figma và chưa thể cung cấp URL file do chính phiên này tạo. Không nên coi `design/FIGMA_MAPPING.md` cũ là bằng chứng đã fetch Figma vì chính tài liệu đó ghi chưa có URL đầu vào.

Khi Figma được kết nối, dùng prompt trong `design/FIGMA_PROMPT_VOICE_FIRST.md`, tạo file mới hoặc cung cấp URL file hiện có, rồi thay mục này bằng file URL, page IDs và node IDs thực tế trước khi bắt đầu production frontend.
