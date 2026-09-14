# UI admin — kiểm tra ngày 14/09/2026

Đã build và chạy bản quản trị mới tại http://localhost:3000/quan-tri. Backend chạy cục bộ cổng 8000.

## Thay đổi sau bàn giao

- Tìm chức năng bằng tiếng Việt không dấu, thông báo khi không tìm thấy.
- Hộp lịch hẹn và hồ sơ tài khoản giữ focus, hỗ trợ Tab/Shift+Tab/Escape, trả focus về nút mở, khóa cuộn nền và vô hiệu hóa tương tác nền.
- Giữ bản nháp danh mục khi làm mới dữ liệu, kể cả khi tải ảnh bác sĩ hoặc ghi phiếu kho.
- Vai trò/tạm khóa tài khoản có trạng thái đang lưu và lỗi mạng; hồ sơ tải lại sau khi đổi vai trò; bộ lọc tài khoản co giãn trên mobile.
- Chuẩn hóa ngày Việt Nam thành YYYY-MM-DD; giới hạn trang lịch hẹn theo tổng số; dữ liệu JSON không hợp lệ trả 400; lý do hủy giới hạn 1.000 ký tự.
- Mô tả tính năng phản ánh đúng phạm vi: đánh giá quản lý hiển thị, tài khoản tối đa 200 bản ghi.

## Xác minh

- `npx tsc --noEmit --incremental false --pretty false`: qua.
- `npm run build`: qua, 35 trang được tạo.
- `node scripts/admin-routes.test.cjs`: 10/10 nhóm kiểm thử qua. Bộ kiểm thử nạp route TypeScript, chỉ giả lập session, dùng schema/RBAC/SQLite thật tại thư mục tạm; tự đóng/xóa dữ liệu tạm sau khi chạy.
- API: 401/403, JSON lỗi, tạo chuyên khoa và audit, nhập/xuất/kiểm kê bằng 0, chuyển trạng thái và xung đột expectedStatus, thời điểm tiếp nhận/hoàn tất, lý do hủy, phân trang/bộ lọc, tổng quan, chi tiết tài khoản, ghi chú cẩm nang, ngày Việt Nam.
- Chrome CDP với viewport thật 1440×1000 và 390×844: cả 18 mục có nội dung, không tràn ngang trang, không có thông báo lỗi tải hoặc JavaScript exception trong lượt kiểm tra.
- Kiểm tra tìm không dấu, giữ bản nháp khi làm mới, Tab/Shift+Tab/Escape và trả focus của hai dialog; drawer mobile không tràn ngang; ảnh giải phẫu tải thành công.
- Ảnh và kết quả máy đọc: `artifacts/admin-qa/`. Script tái kiểm tra: `frontend/clinic/scripts/admin-browser-qa.cjs`, cần Chrome CDP cổng 9222 và cấu hình đăng nhập QA đã có trong `capture-admin.cjs`.

Không tạo/sửa lịch hẹn, phiếu kho, quyền hoặc thanh toán trong DB đang chạy để kiểm thử. Kiểm tra trình duyệt đăng nhập tài khoản QA có sẵn và chỉ đọc nghiệp vụ; bản nháp thử không được lưu.

## Phạm vi còn giới hạn

- Một số danh sách vẫn giới hạn 30/50/100/200 bản ghi; CSV xuất dữ liệu đã tải/lọc. Lịch hẹn có phân trang phía server.
- Ghi chú cẩm nang là ghi chú nội bộ, không chỉnh nội dung bệnh công khai hoặc xác nhận thẩm định y khoa.
- Thanh toán vẫn là mô phỏng. Hội thoại hiện là danh sách/trạng thái; đánh giá chưa có chức năng gửi phản hồi.
- Kiểm tra browser là smoke test về hiển thị và bàn phím, không bao phủ mọi lỗi mạng hoặc thao tác ghi của toàn bộ editor. Các editor cũ vẫn có JSX nén và một số kiểu `any`.
- Dữ liệu tên của một lịch hẹn cũ đang chứa dấu `?`; QA không sửa bản ghi này.
- Không commit/reset, bảo toàn các thay đổi trước bàn giao.
