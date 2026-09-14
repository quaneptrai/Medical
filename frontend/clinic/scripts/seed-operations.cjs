const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'data', 'auth.db'));
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS patient_feedback (id TEXT PRIMARY KEY, tenant_id TEXT, user_id TEXT, appointment_id TEXT, doctor_id TEXT NOT NULL, specialty_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT, status TEXT DEFAULT 'published', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS inventory_items (id TEXT PRIMARY KEY, tenant_id TEXT, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, unit TEXT NOT NULL, current_quantity REAL DEFAULT 0, minimum_quantity REAL DEFAULT 0, expiry_date TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, movement_type TEXT NOT NULL, quantity REAL NOT NULL, note TEXT, created_by TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS maintenance_records (id TEXT PRIMARY KEY, tenant_id TEXT, asset_code TEXT UNIQUE NOT NULL, asset_name TEXT NOT NULL, category TEXT, last_maintenance_date TEXT, next_maintenance_date TEXT, status TEXT DEFAULT 'scheduled', note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
`);

const now = Math.floor(Date.now() / 1000);
const items = [
  ['inv-paracetamol','THUOC-001','Paracetamol 500mg','Thuốc','Hộp',120,30,'2028-12-31'],
  ['inv-oresol','THUOC-002','Oresol gói','Thuốc','Hộp',48,20,'2028-06-30'],
  ['inv-mask','VTYT-001','Khẩu trang y tế','Vật tư','Hộp',35,15,'2029-01-01'],
  ['inv-gloves','VTYT-002','Găng tay khám bệnh','Vật tư','Hộp',18,20,'2029-01-01'],
  ['inv-syringe','VTYT-003','Bơm kim tiêm 5ml','Vật tư','Hộp',42,15,'2029-01-01'],
  ['inv-test','XN-001','Bộ test nhanh','Xét nghiệm','Bộ',12,10,'2027-08-31'],
  ['inv-bandage','VTYT-004','Băng cuộn y tế','Vật tư','Cuộn',56,20,'2029-01-01'],
  ['inv-saline','THUOC-003','Nước muối sinh lý','Thuốc','Chai',24,12,'2028-04-30'],
];
const addItem = db.prepare(`INSERT OR IGNORE INTO inventory_items (id,tenant_id,sku,name,category,unit,current_quantity,minimum_quantity,expiry_date,is_active,created_at) VALUES (?,'yg-clinic-hn',?,?,?,?,?,?,?,1,?)`);
items.forEach((item) => addItem.run(...item, now));
const addMove = db.prepare(`INSERT OR IGNORE INTO stock_movements (id,item_id,movement_type,quantity,note,created_by,created_at) VALUES (?,?,?,?,?,NULL,?)`);
items.forEach((item, index) => addMove.run(`move-seed-${index}`, item[0], 'in', item[5], 'Số dư khởi tạo dữ liệu demo', now));

const assets = [
  ['maint-ecg','TB-TM-001','Máy điện tim 12 cần','Chẩn đoán','2026-06-15','2026-12-15','scheduled','Kiểm chuẩn định kỳ 6 tháng'],
  ['maint-ultrasound','TB-SA-001','Máy siêu âm màu','Chẩn đoán hình ảnh','2026-07-01','2026-10-01','due_soon','Bảo trì đầu dò và kiểm tra nguồn'],
  ['maint-endo','TB-NS-001','Hệ thống nội soi','Nội soi','2026-08-10','2026-11-10','scheduled','Kiểm tra quy trình khử khuẩn'],
  ['maint-oxygen','TB-HH-001','Máy tạo oxy','Hô hấp','2026-05-20','2026-09-20','overdue','Thay bộ lọc và kiểm tra lưu lượng'],
  ['maint-fridge','TB-KHO-001','Tủ lạnh bảo quản thuốc','Kho dược','2026-08-01','2026-11-01','scheduled','Hiệu chuẩn cảm biến nhiệt độ'],
];
const addAsset = db.prepare(`INSERT OR IGNORE INTO maintenance_records (id,tenant_id,asset_code,asset_name,category,last_maintenance_date,next_maintenance_date,status,note,created_at,updated_at) VALUES (?,'yg-clinic-hn',?,?,?,?,?,?,?,?,?)`);
assets.forEach((asset) => addAsset.run(...asset, now, now));

const feedbackCount = db.prepare('SELECT COUNT(*) AS total FROM patient_feedback').get().total;
if (!feedbackCount) {
  const doctors = db.prepare('SELECT id,specialty_id FROM doctors WHERE is_active=1 ORDER BY specialty_id,name').all();
  const comments = ['Bác sĩ giải thích rõ ràng và thân thiện.','Thời gian tiếp nhận nhanh, hướng dẫn dễ hiểu.','Không gian sạch sẽ, nhân viên hỗ trợ tốt.'];
  const addFeedback = db.prepare(`INSERT INTO patient_feedback (id,tenant_id,user_id,appointment_id,doctor_id,specialty_id,rating,comment,status,created_at) VALUES (?,'yg-clinic-hn',NULL,NULL,?,?,?,?, 'published',?)`);
  doctors.forEach((doctor, index) => addFeedback.run(`feedback-seed-${index}`, doctor.id, doctor.specialty_id, 4 + (index % 3 === 0 ? 1 : 0), comments[index % comments.length], now - index * 3600));
}
db.prepare("UPDATE stock_movements SET note = 'Kiểm kê tồn kho' WHERE movement_type = 'adjust' AND item_id = 'inv-saline'").run();
console.log({ feedback: db.prepare('SELECT COUNT(*) total FROM patient_feedback').get().total, inventory: db.prepare('SELECT COUNT(*) total FROM inventory_items').get().total, movements: db.prepare('SELECT COUNT(*) total FROM stock_movements').get().total, maintenance: db.prepare('SELECT COUNT(*) total FROM maintenance_records').get().total });
db.close();
