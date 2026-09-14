# Prompt dựng Figma — Quang Thanh “Ngày khỏe hơn”

## Prompt chính

```text
Thiết kế một hệ sinh thái web responsive cho Phòng khám Đa khoa Quốc tế Quang Thanh tại Hải Phòng, ưu tiên bệnh nhân Việt Nam và luồng tiếp nhận triệu chứng bằng giọng nói. Tạo file Figma Design mới tên “Quang Thanh Clinic — Voice First v1”. Thiết kế phải độc lập, tươi sáng, vui vẻ, gần gũi như một buổi sáng tại phòng khám; vẫn nghiêm túc, dễ đọc, tin cậy và không trẻ con.

Không sao chép UI kit. Có thể tham khảo nhịp bố cục và độ bao phủ chức năng từ các URL trong tài liệu bàn giao, nhưng tạo visual language riêng. Loại bỏ hoàn toàn dark mode mặc định, nền đen, tím neon, quả cầu AI, glow, glassmorphism, chữ gradient, card dashboard công nghệ và các con số thống kê chưa được kiểm chứng.

Anti-cliché gate bắt buộc:
- Không làm hero banner sân khấu với headline khổng lồ, ảnh full-bleed và khoảng trống vô dụng.
- Không dùng bento-grid/card spam để giả tạo độ phức tạp; chỉ dùng container khi thực sự nhóm một tác vụ hoặc dữ liệu.
- Không lặp badge/pill ở mọi tiêu đề, không dùng icon trong vòng tròn chỉ để trang trí, không floating card vô nghĩa.
- Không copywriting kiểu “AI thế hệ mới”, “revolutionary”, “health OS”, “all-in-one” hoặc khoe công nghệ.
- Không tạo trang quá minimal chỉ gồm headline + một input. First fold phải giúp người bệnh hiểu mình đang ở đâu, có thể làm gì, phòng khám tiếp nhận thế nào và xử lý khẩn cấp ra sao.

Concept: “Ngày khỏe hơn”.
- Canvas: warm cream #FFF9F1; surface #FFFFFF; ink #18312D.
- Primary: fresh teal #087F73; hover #075F59.
- Accents: sky #DFF3FF, mint #DFF5E9, marigold #FFDD79, coral #FF8168/#FFE2DA.
- Emergency only: deep red #A4262C with white text; luôn có nút gọi 115 rõ ràng.
- Typography: Be Vietnam Pro cho UI/body; Lora hoặc Fraunces cho display headline, kiểm tra đầy đủ dấu tiếng Việt.
- Radius 12/16/24; shadow xanh xám rất nhẹ; icon nét đơn giản; minh họa người Việt trong môi trường phòng khám sáng, không dùng stock giả có watermark.
- Grid desktop 1440: max content 1240, 12 columns, gutter 24. Tablet 768. Mobile 390.
- Touch target tối thiểu 44px; focus ring rõ; WCAG AA; hỗ trợ reduced motion.

Tạo các pages trong Figma:
00 Cover & Decisions
01 Foundations (colors, type, spacing, grid, elevation, icon rules)
02 Components (header, buttons, input, voice control, status tag, symptom chip, specialty card, doctor card, calendar slot, invoice status, table, chart, empty/error/offline/emergency states)
03 Patient Web
04 AI Triage
05 Booking & Payment
06 Doctor Workspace
07 Staff Workspace (Tư vấn viên / Lễ tân)
08 Admin Workspace
09 Responsive & Prototype

Ưu tiên frame đầu tiên: Homepage / Voice intake — Desktop 1440 và Mobile 390.

Homepage desktop gồm:
1. Utility strip xanh đậm: trạng thái tiếp nhận, cấp cứu 115, địa chỉ phòng khám.
2. Header sáng: logo placeholder trung tính, Trang chủ, Chuyên khoa, Bác sĩ, Trợ lý sức khỏe, Bảng giá, Đăng nhập, CTA Đặt lịch.
3. First fold dạng “bàn tiếp nhận chăm sóc”, không gọi là hero banner. Cột trái: eyebrow “Chăm sóc bắt đầu từ lắng nghe”, headline serif vừa phải “Kể điều bạn đang thấy không ổn.”, mô tả không dùng từ chẩn đoán. Phải có một chi tiết underline marigold vui vẻ. Phải dùng tên Phòng khám Quang Thanh, không dùng YG/An Lạc.
4. Voice intake card là hành động chính: nhãn Bước 1, câu hỏi “Hôm nay bạn cảm thấy thế nào?”, nút micro lớn, waveform, chỉ dẫn ví dụ, transcript xác nhận, fallback nhập bàn phím, symptom quick chips, privacy note, medical disclaimer.
5. Phải thiết kế đầy đủ variants của VoiceInput: Idle, Listening, Transcript ready, Processing, Permission denied, Offline, Emergency detected. Khi Emergency detected: dừng luồng AI, hiển thị cảnh báo đỏ không animation và nút Gọi 115 tối thiểu 56px.
6. Cột phải là khối thông tin tiếp nhận có ích: minh họa gia đình Việt Nam trò chuyện với bác sĩ ở kích thước vừa, giờ khám, địa chỉ, liên kết đặt lịch/bảng giá và cảnh báo 115. Không dùng floating card trang trí hoặc số liệu giả.
7. Ngay dưới fold: 4 thẻ chuyên khoa khác màu nhẹ (Nội tổng quát, Sản–Phụ khoa, Răng Hàm Mặt, Chẩn đoán hình ảnh), tiếp theo là hành trình 3 bước Mô tả → Hướng dẫn ban đầu → Chọn bác sĩ & khung giờ.

Sau homepage, dựng màn hình theo thứ tự ưu tiên:
- AI triage consultation: câu hỏi làm rõ, danh sách triệu chứng đã ghi nhận, mức độ cần khám, chuyên khoa gợi ý, ảnh/tệp đính kèm, chuyển sang chat bác sĩ, lưu lịch sử khi người dùng đồng ý.
- Booking: khám trực tiếp/online, chuyên khoa, bác sĩ, ngày giờ, thông tin bệnh nhân, xác nhận, dời/hủy, phiếu hẹn.
- Payment: hóa đơn, VietQR demo/thẻ/chuyển khoản, trạng thái pending/paid/failed/refunded, biên nhận.
- Patient account: hồ sơ, lịch hẹn, lịch sử tư vấn, hóa đơn, bảo mật tài khoản.
- Doctor workspace: lịch hôm nay, hàng đợi ca khám, hồ sơ bệnh nhân, kết quả khám, ghi chú lâm sàng, kế hoạch điều trị, đơn thuốc tóm tắt.
- Staff workspace (Tư vấn viên / Lễ tân): inbox chat, hàng đợi chưa phân công, chuyển bác sĩ/chuyên khoa, ghi chú nội bộ, tiếp nhận và điều phối số thứ tự khám.
- Admin workspace: tài khoản và RBAC, bệnh nhân, bác sĩ, chuyên khoa, dịch vụ/gói khám, khuyến mãi, bảng giá, lịch làm việc, cấu hình thanh toán, chatbot scripts, audit log.
- Reports: doanh thu, lịch hẹn/dịch vụ, hiệu suất bác sĩ, mức độ hài lòng; có bộ lọc thời gian, export state và empty/loading/error state.

Prototype links bắt buộc:
Homepage Voice Idle → Listening → Transcript ready → Triage → Booking → Payment success.
Emergency keyword → Emergency state → tel:115.
Login → role-based home cho Patient / Doctor / Staff / Clinic Admin / Super Admin.

Không hiển thị xác suất bệnh, điểm retrieval, latency, tên model, BM25/BGE-M3 hoặc tuyên bố “chẩn đoán”. Dùng “hỗ trợ định hướng ban đầu”, “biểu hiện có thể liên quan”, “mức độ cần đi khám”.

Cuối cùng, tạo section “Dev handoff” ghi rõ tokens, component properties, interaction states, responsive rules, content rules và node inventory. Dùng Auto Layout, variables và component variants; đặt tên layer theo semantic role.
```

## Prompt chỉnh sửa ngắn cho frame hiện có

```text
Redesign frame hiện tại theo concept “Ngày khỏe hơn”: chuyển từ dark AI/SaaS sang clinic daylight; warm cream + teal + sky + mint + marigold + coral; thay AI orb bằng minh họa bác sĩ–gia đình kích thước vừa và bảng thông tin tiếp nhận; biến microphone thành primary action có waveform và transcript confirmation; tăng mật độ hữu ích bằng specialty navigation, care journey, clinic hours và booking CTA. Không hero banner sân khấu, không bento/card spam, không quá minimal, không số liệu giả, glow, glassmorphism, purple neon, chữ gradient hoặc copy khoe AI. Giữ luồng an toàn 115, disclaimer, session privacy và responsive 1440/768/390. Tạo variants Idle/Listening/Ready/Processing/Permission denied/Offline/Emergency cho VoiceInput.
```
