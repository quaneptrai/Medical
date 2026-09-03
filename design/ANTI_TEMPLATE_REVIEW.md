# Anti-Template Verification & Visual Checklist (Agent Brief 09)

Bản kiểm tra này chứng minh toàn bộ website **Phòng khám Đa khoa Quốc tế An Lạc (The Care Journal)** đã loại bỏ 100% các khuôn mẫu giao diện AI/SaaS đại trà theo yêu cầu nghiêm ngặt của [Agent Brief 09 (`docs/agent_briefs/09_rebuild_clinic_ui_auth_figma.md`)](file:///D:/BotMedical/docs/agent_briefs/09_rebuild_clinic_ui_auth_figma.md).

---

## 1. Bảng đối chiếu 19 tiêu chí Chống Khuôn mẫu AI (Anti-Template Audit Matrix)

| STT | Khuôn mẫu AI / SaaS cấm | Hiện trạng trước đây | Tái thiết kế trong Brief 09 ("The Care Journal") | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Chữ hoặc logo Gradient:** Xanh dương sang tím/hồng | Có chữ gradient trong tiêu đề Hero | Đã xóa 100%. Sử dụng typography font Serif mực đậm (`--ink: #17211F`) trang nhã. | **ĐẠT (PASS)** |
| **2** | **Đốm sáng mờ ảo (Blurred glow/orb):** Phía sau Hero | Có `blur-3xl radial glow` | Đã xóa 100%. Nền giấy ấm (`--paper: #F5F1E8`) phẳng, không hiệu ứng phát sáng. | **ĐẠT (PASS)** |
| **3** | **Thẻ AI Architecture chàm tối (Dark indigo card):** | Thẻ đen chàm hiển thị "BotMedical Engine" | Đã xóa 100%. Thay bằng khung tư liệu không gian khám thực tế. | **ĐẠT (PASS)** |
| **4** | **Chấm xanh nhấp nháy (Pulsing green dots):** | Chấm xanh nhấp nháy ở logo & hero | Đã xóa 100%. Không có bất kỳ hiệu ứng chớp tắt vô nghĩa nào. | **ĐẠT (PASS)** |
| **5** | **Lộ tên model/độ trễ cho bệnh nhân:** BGE-M3, Dense, BM25, ms | Hiển thị "~35 ms", "BGE-M3 V2", "Dense" | Đã ẩn 100% khỏi giao diện bệnh nhân; chỉ hiển thị thông tin y khoa thiết thực. | **ĐẠT (PASS)** |
| **6** | **Pill label lặp lại trên mọi tiêu đề:** | Badge viên thuốc xuất hiện trên mọi section | Đã xóa 100%. Thay bằng lề ghi chú xuất bản (`Folio 01, Folio 02...`) thanh lịch. | **ĐẠT (PASS)** |
| **7** | **Bộ 3 thẻ icon lặp lại đơn điệu:** | 3 thẻ quy trình bo tròn lặp lại | Đã chuyển thành danh mục chỉ mục đánh số thứ tự liền mạch (`SpecialtyNavigator`). | **ĐẠT (PASS)** |
| **8** | **Dải số liệu phóng đại (Metric strip):** "18+ năm", "120.000+" | TrustBar chứa các số liệu chưa xác minh | Đã xóa bỏ toàn bộ TrustBar chứa số liệu bịa; chỉ giữ thông tin dịch vụ thực tế. | **ĐẠT (PASS)** |
| **9** | **Banner CTA xanh toàn màn hình ở chân trang:** | Banner xanh đậm kết thúc trang | Đã xóa 100%. Kết thúc tự nhiên bằng Folio tiếp đón & hướng dẫn chỉ đường. | **ĐẠT (PASS)** |
| **10** | **Icon tròn đại trà (Generic icon circles):** | Vòng tròn bọc quanh icon | Thay bằng hairline divider thanh mảnh và số thứ tự la mã / font mono nhỏ. | **ĐẠT (PASS)** |
| **11** | **Hiệu ứng kính mờ (Glassmorphism):** | Các thẻ card nền mờ bóng bẩy | Thay bằng bề mặt giấy nổi (`--paper-raised: #FBF9F4`) và viền hairline 1px (`#D7D2C7`). | **ĐẠT (PASS)** |
| **12** | **Cấu trúc canh giữa lặp lại (Centered section soup):** | Tiêu đề giữa + mô tả giữa + lưới thẻ | Bố cục bất đối xứng dạng trang báo y khoa (Editorial Spread). | **ĐẠT (PASS)** |
| **13** | **Bong bóng chat lơ lửng góc phải (Floating bubble):** | Không sử dụng | Không sử dụng. | **ĐẠT (PASS)** |
| **14** | **Bong bóng chat ChatGPT đại trà tại `/tro-ly`:** | Hộp chat qua lại dạng bong bóng tròn | Chuyển thành **Bản ghi tham vấn lâm sàng (Consultation Record)** nghiêm túc. | **ĐẠT (PASS)** |
| **15** | **Thẻ đăng nhập thủy tinh lơ lửng (Floating glass auth card):** | Không sử dụng | Trang Đăng ký / Đăng nhập thiết kế chuẩn xuất bản, tối ưu cho Password Manager. | **ĐẠT (PASS)** |
| **16** | **Tràn viền màn hình di động 390px:** | Khung input và chip bị cắt ngang | Đã xử lý `min-width: 0`, 100% không tràn viền ở bất kỳ kích thước màn hình nào. | **ĐẠT (PASS)** |
| **17** | **Tương phản Dark Mode không đạt chuẩn:** | Chữ bị chìm vào nền đen | Bảng màu tối mới đo lường WCAG AA (>4.5:1) và AAA (>7:1) cho cảnh báo cấp cứu. | **ĐẠT (PASS)** |
| **18** | **Truyền triệu chứng qua URL query string (`?q=`):** | Truyền text người bệnh trên URL | Đã chuyển sang cơ chế **Session Storage / In-memory transfer** bảo vệ dữ liệu riêng tư. | **ĐẠT (PASS)** |
| **19** | **Hệ thống xác thực tài khoản đầy đủ:** | Chưa có luồng Auth | Hoàn thành 100% hệ thống Auth: Đăng ký, Đăng nhập, Mã xác minh, Đổi mật khẩu, Sổ người bệnh. | **ĐẠT (PASS)** |
