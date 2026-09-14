# Hướng dẫn sử dụng BotMedical

## 1. Bắt đầu

Clone, chạy `setup.ps1` rồi `start-botmedical.ps1` theo [SETUP](../SETUP.md). Vào `http://localhost:3000`. Trang `/quan-tri` cần tài khoản có vai trò `super_admin`; thông tin quản trị của máy mới nằm tại `frontend/clinic/data/bootstrap-admin.json`. Không gửi file này cho người clone khác: mỗi máy tự sinh tài khoản riêng.

Danh mục khởi tạo gồm 10 chuyên khoa, 40 bác sĩ demo và 4 dịch vụ. Dữ liệu vận hành bắt đầu trống. Backend AI cần model/chỉ mục đã chuẩn bị; các trang quản trị cơ bản làm việc qua API Next.js và SQLite.

## 2. Chức năng dành cho người dùng

| Trang | Cách dùng |
|---|---|
| `/dang-ky`, `/dang-nhap` | Tạo tài khoản hoặc đăng nhập; làm theo hướng dẫn xác minh hiện trên giao diện. Không giả định email thực đã được gửi nếu chưa cấu hình dịch vụ gửi thư. |
| `/bac-si`, `/bac-si/[id]` | Xem/tìm bác sĩ, mở hồ sơ và chuyển sang đặt lịch. Hồ sơ seed chỉ phục vụ demo. |
| `/chuyen-khoa`, `/dich-vu` | Tra thông tin và chọn hướng khám; giá/chức năng thanh toán có thể còn ở chế độ demo. |
| `/dat-lich` | Đăng nhập, chọn chuyên khoa/bác sĩ, ngày giờ và thông tin liên hệ; gửi một lần và đọc kết quả xác nhận. |
| `/tai-khoan` | Xem/cập nhật hồ sơ và thông tin tài khoản theo các trường giao diện cung cấp. |
| `/tro-ly` | Nhập triệu chứng, theo dõi câu hỏi/định hướng; backend chưa sẵn sàng thì kiểm tra cổng 8000 và chỉ mục. Kết quả không phải chẩn đoán xác định. |
| `/co-the-nguoi` | Chọn vùng đầu/ngực/bụng hoặc hệ cơ quan; ảnh mô hình giải phẫu là minh họa AI. |
| `/benh`, `/benh/[slug]` | Tìm trong 669 mục thư viện giao diện, đọc nội dung và dấu hiệu cảnh báo. |
| `/danh-gia` | Gửi đánh giá theo trường và điều kiện tài khoản trên trang. |
| Bong bóng chat | Mở hội thoại khi đã đăng nhập; tính năng phản hồi phụ thuộc người phụ trách/kênh hiện có. |

## 3. Các mục quản trị

Mở `/quan-tri`. Dùng ô **Tìm chức năng** với hoặc không có dấu, ví dụ `lich hen`, `kho`, `tai khoan`. Nút **Làm mới dữ liệu** tải lại dữ liệu tổng của trang; bản nháp danh mục đang mở được giữ lại. Đổi sang module/hồ sơ khác có thể bỏ bản nháp chưa lưu.

| Mục | Thao tác và giới hạn hiện tại |
|---|---|
| Tổng quan | Xem lịch hôm nay, lịch 7 ngày, cảnh báo kho/hạn dùng và bảo trì. Biểu đồ tính theo ngày khám, bao gồm lịch đã hủy. |
| Lịch hẹn & tiếp nhận | Tìm tên/SĐT/mã, lọc ngày/trạng thái/chuyên khoa, chuyển trang 20 lịch. Mở **Chi tiết**, chọn bước tiếp theo và **Lưu thay đổi**. |
| Danh sách người bệnh | Xem nhóm tài khoản có vai trò Người bệnh trong tối đa 200 tài khoản đã tải. Người đặt lịch không có tài khoản xem ở mục lịch hẹn. |
| Theo dõi hội thoại | Xem tối đa 100 kênh gần nhất và đổi active/closed. Không phải màn hình đọc toàn bộ tin nhắn hoặc tự động phân công bác sĩ. |
| Bác sĩ | Thêm hồ sơ, sửa chuyên khoa, đào tạo, mô tả, ngày làm việc, ảnh và hiển thị. Lưu xong kiểm tra trang bác sĩ công khai. |
| Chuyên khoa | Thêm/sửa tên, mã phân loại, mô tả, triệu chứng, thông tin phụ trách và hiển thị. |
| Dịch vụ khám | Thêm/sửa mã, tên, loại, chuyên khoa, mô tả và hiển thị. Không coi giá demo là bảng giá thu tiền thật. |
| Phiên trợ lý sức khỏe | Xem tối đa 30 phiên được lưu gần nhất, giai đoạn và cờ khẩn cấp. |
| Đánh giá người bệnh | Xem tối đa 50 đánh giá; chọn công khai/đã xem xét/ẩn. Chưa có trình soạn gửi trả lời người bệnh. |
| Rà soát cẩm nang | Lọc bài thiếu nội dung hoặc trạng thái biên tập; mở ghi chú, nhập tối đa 2.000 ký tự rồi lưu. Ghi chú nội bộ không thay nội dung công khai; “Đã xử lý” không phải chứng nhận thẩm định y khoa. |
| Kho thuốc & vật tư | Thêm/sửa mặt hàng, SKU, đơn vị, tồn tối thiểu, hạn dùng; ghi nhập/xuất/điều chỉnh tồn. Xem 50 phiếu gần nhất. |
| Thiết bị & bảo trì | Thêm thiết bị, mã tài sản, ngày bảo trì, hạn kế tiếp, trạng thái và ghi chú. |
| Hóa đơn & thanh toán | Xem tối đa 30 hóa đơn và đổi trạng thái mô phỏng. Không thu/hoàn tiền thật. |
| Báo cáo vận hành | Xem lịch toàn kỳ, xu hướng, thống kê chuyên khoa và đánh giá công khai. Không phải báo cáo doanh thu kế toán. |
| Tài khoản | Tìm/lọc tối đa 200 tài khoản, mở hồ sơ, đổi vai trò hoặc chặn/bỏ chặn. Tài khoản quyền cao nhất được bảo vệ khỏi thao tác chặn. |
| Vai trò & quyền truy cập | Xem vai trò và quyền đã cấu hình. Gán vai trò tại mục Tài khoản; chưa có trình sửa ma trận quyền trực tiếp. |
| Thông tin cơ sở | Sửa thương hiệu, liên hệ, địa chỉ, thông tin giấy phép và hoạt động. Có nhiều tenant trong schema không đồng nghĩa đã cách ly nhiều cơ sở. |
| Nhật ký hoạt động | Xem tối đa 30 thao tác quản trị gần nhất, người thực hiện và thời gian. |

## 4. Quy trình lịch hẹn

Chuỗi đang hỗ trợ: **Chờ xác nhận → Đã xác nhận → Đang chờ khám → Hoàn thành**. Có thể hủy ở ba trạng thái chưa kết thúc, phải nhập lý do tối đa 1.000 ký tự. Lịch hoàn thành/đã hủy không mở lại bằng màn hình này.

Tiếp nhận và hoàn thành ghi thời điểm tương ứng. Khi người khác vừa cập nhật, API từ chối thao tác dựa trên trạng thái cũ; đóng chi tiết, tải lại danh sách rồi mở bản mới. Không nhấn lặp nút Lưu để cố bỏ qua thông báo xung đột.

## 5. Nhập, xuất và kiểm kê kho

- **Nhập kho:** số lượng cộng thêm, lớn hơn 0.
- **Xuất kho:** số lượng trừ đi, lớn hơn 0 và không vượt tồn.
- **Điều chỉnh tồn:** số lượng tồn thực tế sau kiểm kê; có thể bằng 0. Nhập `5` nghĩa là tồn cuối bằng 5, không phải cộng thêm 5.

Kiểm tra SKU/đơn vị và ghi lý do trước khi lưu. Thay đổi danh mục mặt hàng và ghi phiếu kho là hai thao tác riêng.

## 6. Tìm kiếm, CSV và lỗi

CSV trong bảng chung xuất **những dòng đã tải phù hợp bộ lọc**, không phải toàn bộ database. Không dùng CSV đó làm backup. Đọc giới hạn 30/50/100/200 bản ghi của từng module; không thấy bản ghi chưa chắc bản ghi đã bị xóa.

401: đăng nhập lại. 403: tài khoản thiếu `super_admin`. Lỗi mạng: kiểm tra frontend/backend phù hợp, giữ bản nháp và thử lại sau. Hộp lịch hẹn và tài khoản hỗ trợ Tab/Shift+Tab, Esc để đóng và trả focus về nút mở. Để backup hoặc mở rộng dữ liệu, xem [DATABASE_SCALING](DATABASE_SCALING.md).
