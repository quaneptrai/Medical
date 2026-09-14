export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Quản trị hệ thống', clinic_admin: 'Quản lý phòng khám',
  doctor: 'Bác sĩ', receptionist: 'Lễ tân', patient: 'Người bệnh',
};
export const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động', suspended: 'Tạm khóa', pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận', checked_in: 'Đang chờ khám', completed: 'Hoàn thành', cancelled: 'Đã hủy',
  paid_demo: 'Đã thanh toán thử nghiệm', refunded_demo: 'Đã hoàn tiền thử nghiệm', failed: 'Thất bại',
  published: 'Công khai', reviewed: 'Đã xem xét', hidden: 'Đã ẩn',
  scheduled: 'Đã lên lịch', due_soon: 'Sắp đến hạn', overdue: 'Quá hạn', in_progress: 'Đang thực hiện',
  closed: 'Đã đóng', in: 'Nhập kho', out: 'Xuất kho', adjust: 'Điều chỉnh tồn',
  clinical: 'Khám lâm sàng', laboratory: 'Xét nghiệm', imaging: 'Chẩn đoán hình ảnh',
  vietqr_demo: 'Chuyển khoản thử nghiệm', cash_demo: 'Tiền mặt thử nghiệm',
};
export const APPOINTMENT_NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'], confirmed: ['checked_in', 'cancelled'],
  checked_in: ['completed', 'cancelled'], completed: [], cancelled: [],
};
export function vietnamDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function displayDate(date: string) { return date ? date.split('-').reverse().join('/') : '—'; }
export function normalizeSearch(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase(); }
export const AUDIT_LABELS: Record<string, string> = {
  'admin.user_roles_update': 'Thay đổi vai trò', 'admin.user_status_update': 'Đổi trạng thái tài khoản',
  'admin.appointment_status_update': 'Cập nhật lịch hẹn', 'admin.doctor_profile_update': 'Sửa hồ sơ bác sĩ',
  'admin.specialty_update': 'Sửa chuyên khoa', 'admin.service_update': 'Sửa dịch vụ',
  'admin.tenant_profile_update': 'Sửa thông tin cơ sở', 'admin.inventory_update': 'Sửa mặt hàng',
  'admin.maintenance_update': 'Cập nhật bảo trì', 'admin.feedback_status_update': 'Xử lý đánh giá',
  'admin.invoice_status_update': 'Cập nhật thanh toán thử nghiệm', 'admin.content_review': 'Ghi chú rà soát cẩm nang',
  'admin.doctor_create': 'Thêm bác sĩ', 'admin.specialty_create': 'Thêm chuyên khoa',
  'admin.service_create': 'Thêm dịch vụ', 'admin.inventory_create': 'Thêm mặt hàng',
  'admin.maintenance_create': 'Thêm thiết bị', 'admin.stock_movement_create': 'Ghi phiếu kho',
};
