# Hướng dẫn mở rộng database BotMedical

Tài liệu này là lộ trình triển khai, không có nghĩa bản hiện tại đã hỗ trợ PostgreSQL hoặc nhiều máy chủ. Không chỉ đổi một biến môi trường là chuyển được database.

## 1. Dữ liệu hiện nằm ở đâu?

| Dữ liệu | Nơi lưu | Vai trò |
|---|---|---|
| Người dùng, session, quyền, lịch khám, danh mục, kho, hóa đơn, audit | `frontend/clinic/data/auth.db` | SQLite nghiệp vụ qua `better-sqlite3` |
| Schema đang được ứng dụng thực thi | `frontend/clinic/lib/auth/db.ts` | Tạo bảng và bổ sung cột khi mở DB |
| Danh mục cho máy clone mới | `frontend/clinic/data/bootstrap-catalog.json` | Chuyên khoa, 40 bác sĩ demo, dịch vụ, vai trò/quyền; không chứa tài khoản/người bệnh |
| Tài khoản quản trị sinh lần đầu | `frontend/clinic/data/bootstrap-admin.json` | Chỉ lưu cục bộ, không commit |
| Thư viện bệnh giao diện | `frontend/clinic/data/disease-library.json` | JSON được tạo từ kho tri thức, không phải bảng SQLite |
| Tri thức retrieval | `data/diseases/`, `data/diseases_expanded/` | Nguồn để dựng thư viện/chỉ mục |
| Vector tìm kiếm | `data/embeddings/` | Chỉ mục có thể dựng lại bằng model đúng phiên bản |
| Ảnh tải lên | `frontend/clinic/public/` | File trên máy chạy frontend |

Các file `data/saas_schema.sql` và `frontend/clinic/data/schema.sql` là tài liệu schema; cần đối chiếu `lib/auth/db.ts` trước khi viết migration. Session hiện nằm trong SQLite; không có Redis hay ORM PostgreSQL sẵn.

## 2. Giai đoạn một máy chủ

Giữ frontend, file SQLite và ảnh tải lên trên ổ đĩa bền vững của một máy. `getDb()` đã bật WAL và foreign keys. Không đưa `auth.db` lên Git, không để vào thư mục đồng bộ cloud và không đặt trên ổ mạng cho nhiều máy cùng mở. SQLite WAL yêu cầu các tiến trình truy cập cùng máy; nhiều reader có thể chạy cùng writer nhưng vẫn chỉ một writer tại một thời điểm. Nguồn: [SQLite WAL](https://www.sqlite.org/wal.html).

Việc cần làm trước khi tăng tải:

1. Đo p50/p95 thời gian API, lỗi `SQLITE_BUSY`, thời gian giao dịch ghi, dung lượng DB/WAL và thời gian sao lưu. Dùng dữ liệu tổng hợp, không log nội dung triệu chứng hoặc mật khẩu.
2. Dùng `EXPLAIN QUERY PLAN` trên truy vấn lịch hẹn, tài khoản, audit, hội thoại. Chỉ thêm index khi có truy vấn thực tế cần nó.
3. Chuyển các danh sách còn tải 30/50/100/200 dòng sang phân trang phía server. Lịch hẹn đã dùng 20 dòng/trang; xuất CSV hiện chỉ xuất tập đã tải/lọc. Với lịch sử lớn, cân nhắc cursor theo `(created_at,id)` thay cho OFFSET lớn.
4. Giữ giao dịch ngắn. Việc tải ảnh, gửi thông báo hoặc gọi AI cần thực hiện ngoài giao dịch ghi database.
5. Lập lịch dọn session/token hết hạn theo chính sách lưu trữ; audit và dữ liệu bệnh nhân cần chính sách riêng. Không tự động xóa dữ liệu nghiệp vụ chỉ để giảm dung lượng.

Ví dụ index để đánh giá trên DB thử nghiệm, **chưa được tự động áp dụng**:

```sql
CREATE INDEX idx_appointments_date_status
ON appointments(appointment_date, status, appointment_time, id);
CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at);
CREATE INDEX idx_chat_channel_time ON chat_messages(channel_id, created_at);
```

Kiểm tra index đã tồn tại bằng `PRAGMA index_list(...)`; thử lại kế hoạch truy vấn và chi phí ghi sau khi thêm. Truy vấn `LIKE '%...%'` không được giải quyết chỉ bằng index B-tree thông thường.

## 3. Sao lưu và khôi phục

Sao lưu trước mỗi migration. Với DB đang hoạt động, dùng API backup để tạo bản sao nhất quán; không chỉ copy riêng `auth.db` trong lúc WAL còn thay đổi. Nguồn: [SQLite Online Backup API](https://www.sqlite.org/backup.html).

Ví dụ chạy trong `frontend/clinic` (thư mục `backups` phải được tạo trước và đặt ngoài Git):

```javascript
const Database = require('better-sqlite3');
async function backup() {
  const db = new Database('data/auth.db');
  try { await db.backup('backups/auth-backup.db'); }
  finally { db.close(); }
}
backup().catch(error => { console.error(error.message); process.exitCode = 1; });
```

Chép bản sao sang nơi lưu độc lập có kiểm soát truy cập; mã hóa và giới hạn người được đọc. Sao lưu riêng ảnh tải lên và cấu hình cần thiết. Chỉ mục vector có thể dựng lại nếu giữ nguyên tri thức, config và SHA-256 model.

Thử khôi phục trên thư mục khác: kiểm tra `PRAGMA integrity_check`, `PRAGMA foreign_key_check`, số lượng bảng/bản ghi, đăng nhập, một chu trình lịch hẹn và kiểm kê trên dữ liệu thử. Xác định RPO/RTO với người vận hành; chỉ coi sao lưu đạt yêu cầu sau khi đã phục hồi thử. Không trỏ môi trường thử vào DB thật.

## 4. Khi nào chuyển sang PostgreSQL?

Chuyển khi cần nhiều máy frontend/API cùng ghi nghiệp vụ, khi chờ ghi/khóa là nút thắt đã đo được, hoặc khi cần HA và vận hành database độc lập. Không có một ngưỡng số người dùng cố định áp dụng cho mọi phòng khám. SQLite cũng khuyến nghị database client/server cho website ghi nhiều hoặc cần nhiều máy chủ. Nguồn: [Appropriate Uses for SQLite](https://www.sqlite.org/whentouse.html).

Lộ trình đề xuất cho codebase này:

1. Tách SQL ra lớp repository theo nghiệp vụ: tài khoản/session, danh mục, lịch hẹn, kho, hội thoại, báo cáo. Hiện các route gọi `getDb().prepare()` trực tiếp và đồng bộ; PostgreSQL cần driver cùng luồng `async` phù hợp.
2. Tạo migration có phiên bản. Chuyển `?` sang tham số driver mới, `INSERT OR IGNORE` sang xử lý conflict tương ứng, `GROUP_CONCAT` sang phép tổng hợp tương đương, rà soát boolean, epoch giây, khóa ngoại và kiểu tiền/số lượng.
3. Đặt unique constraints cho mã dịch vụ, SKU, mã thiết bị và các quy tắc chống trùng lịch đã thống nhất. Không suy đoán quy tắc đặt lịch từ giao diện.
4. Đảm bảo concurrency: cập nhật trạng thái lịch hẹn phải kiểm tra trạng thái cũ; nhập/xuất kho phải khóa/cập nhật có điều kiện và ghi phiếu trong cùng giao dịch. Tạo kiểm thử hai giao dịch cạnh tranh bằng hai connection thật; `Promise.all` trên SQLite đồng bộ không thay thế kiểm thử này.
5. Di chuyển dữ liệu bằng công cụ riêng trong môi trường thử: tenant → roles/permissions → users → user_roles → danh mục → lịch hẹn/hội thoại/kho → audit. Giữ nguyên ID và hash mật khẩu; không xuất mật khẩu, session hay dữ liệu bệnh nhân vào repository.
6. Đối chiếu số dòng, tổng hợp tồn kho, trạng thái lịch hẹn, các FK mồ côi và kết quả báo cáo giữa hai DB.
7. Chốt cửa sổ bảo trì: dừng ghi, backup cuối, nhập phần dữ liệu cuối, đổi cấu hình kết nối, kiểm tra trước khi mở ghi. Nếu cần rollback sau khi đã ghi vào PostgreSQL, phải xử lý phần dữ liệu mới; trỏ ngược SQLite cũ sẽ mất các cập nhật đó.

## 5. Nhiều cơ sở và nhiều máy chủ

`tenant_id` xuất hiện trong schema nhưng nhiều route hiện dùng tenant mặc định `yg-clinic-hn`, quản trị hệ thống có truy vấn toàn cục. Đây **chưa phải cách ly tenant hoàn chỉnh**.

Trước khi cung cấp cho nhiều cơ sở độc lập: xác định tenant từ session/ủy quyền phía server, thêm điều kiện tenant vào mọi read/write, unique/index theo tenant ở nơi phù hợp, và kiểm thử truy cập chéo tenant bằng ID đoán được. PostgreSQL RLS có thể bổ sung lớp bảo vệ: khi bật mà chưa có policy, mặc định chặn; tài khoản owner/superuser có ngoại lệ nên cần role ứng dụng được thiết kế đúng. Nguồn: [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Khi tăng số instance: đưa ảnh sang object storage dùng chung; bảo đảm session dùng database chung; xác định cache invalidation và giới hạn kết nối mỗi instance. Tách tiến trình AI khỏi Next.js để điều chỉnh tài nguyên CPU/GPU độc lập. Không nhân bản chỉ mục/DB rồi giả định các bản sẽ tự đồng bộ.

## 6. Điều kiện nghiệm thu

- Khởi tạo mới và nâng cấp DB cũ đều chạy được; không reset tài khoản/quyền/danh mục khi bootstrap lại.
- Kiểm thử phân quyền, race lịch hẹn, kiểm kê, foreign keys, audit và tenant isolation qua.
- Backup/restore được diễn tập; có kế hoạch rollback dữ liệu, không chỉ rollback code.
- Đo p95, lỗi khóa và thời gian phục hồi với tải đại diện. Ghi lại giới hạn đã đo thay vì công bố khả năng chịu tải chưa kiểm chứng.
