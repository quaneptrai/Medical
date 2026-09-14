import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'auth.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      is_verified INTEGER DEFAULT 0,
      tenant_id TEXT,
      phone TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      user_id TEXT,
      specialty_id TEXT NOT NULL,
      doctor_id TEXT,
      service_id TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      notes TEXT,
      queue_number INTEGER,
      status TEXT DEFAULT 'confirmed',
      checkin_at INTEGER,
      completed_at INTEGER,
      cancellation_reason TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- 1. Phân hệ Tổ chức & Chi nhánh (Multi-Tenant)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    brand_name TEXT,
    license_number TEXT,
    hotline TEXT,
    address TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. Phân hệ Vai trò & Quyền hạn (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    tenant_id TEXT,
    assigned_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 3. Phân hệ Danh mục Chuyên môn Động (Master Data)
CREATE TABLE IF NOT EXISTS specialties (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    short_desc TEXT,
    full_desc TEXT,
    common_symptoms TEXT,
    chief_doctor_name TEXT,
    icon_name TEXT,
    diseases_covered INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT UNIQUE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    specialty_id TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    education TEXT,
    hospital_affiliation TEXT,
    bio TEXT,
    available_days TEXT,
    consultation_fee REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    specialty_id TEXT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    service_type TEXT NOT NULL,
    price REAL NOT NULL,
    discount_price REAL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE SET NULL
);

-- 4. Phân hệ SaaS Live Chat (Bác sĩ - Bệnh nhân / Tư vấn)
CREATE TABLE IF NOT EXISTS chat_channels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    channel_type TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    doctor_id TEXT,
    appointment_id TEXT,
    status TEXT DEFAULT 'active',
    last_message_text TEXT,
    last_message_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Phân hệ AI Triage & Lưu vết Chẩn đoán Sàng lọc Y tế
CREATE TABLE IF NOT EXISTS ai_triage_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    session_token TEXT UNIQUE,
    stage TEXT NOT NULL,
    chief_complaint TEXT,
    is_emergency INTEGER DEFAULT 0,
    emergency_rule_id TEXT,
    recommended_specialty_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recommended_specialty_id) REFERENCES specialties(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_triage_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    turn_index INTEGER NOT NULL,
    user_message TEXT NOT NULL,
    bot_reply TEXT NOT NULL,
    stage TEXT NOT NULL,
    extracted_symptoms TEXT,
    top_candidates TEXT,
    latency_ms REAL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES ai_triage_sessions(id) ON DELETE CASCADE
);

-- 6. Phân hệ Hồ sơ Khám Bệnh & Kết quả Lâm sàng
CREATE TABLE IF NOT EXISTS consultation_records (
    id TEXT PRIMARY KEY,
    appointment_id TEXT UNIQUE NOT NULL,
    doctor_id TEXT NOT NULL,
    patient_id TEXT,
    clinical_notes TEXT,
    preliminary_diagnosis TEXT,
    treatment_plan TEXT,
    prescription_summary TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Phân hệ Hóa đơn & Thanh toán (Demo / Mock Mode)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    appointment_id TEXT UNIQUE NOT NULL,
    user_id TEXT,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'vietqr_demo',
    payment_status TEXT DEFAULT 'pending',
    transaction_code TEXT,
    demo_notes TEXT DEFAULT 'Giao dịch thử nghiệm (Demo Mode)',
    paid_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Phân hệ Cấu hình & Nhật ký Kiểm toán (Audit Logs)
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Phản hồi người bệnh & chỉ số chất lượng chuyên khoa
CREATE TABLE IF NOT EXISTS patient_feedback (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    appointment_id TEXT,
    doctor_id TEXT NOT NULL,
    specialty_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    status TEXT DEFAULT 'published',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT
);

-- 10. Kho thuốc/vật tư và phiếu nhập xuất
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    current_quantity REAL DEFAULT 0,
    minimum_quantity REAL DEFAULT 0,
    expiry_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    note TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Theo dõi tài sản và bảo trì thiết bị
CREATE TABLE IF NOT EXISTS maintenance_records (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    asset_code TEXT UNIQUE NOT NULL,
    asset_name TEXT NOT NULL,
    category TEXT,
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    status TEXT DEFAULT 'scheduled',
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
  `);

  // Hồ sơ người bệnh: bắt buộc khai đủ trước khi đặt lịch, nên nằm ngay trên bảng users.
  const userColumns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  const userHas = (name: string) => userColumns.some((column) => column.name === name);
  if (!userHas('username')) db.exec('ALTER TABLE users ADD COLUMN username TEXT');
  if (!userHas('full_name')) db.exec('ALTER TABLE users ADD COLUMN full_name TEXT');
  if (!userHas('date_of_birth')) db.exec('ALTER TABLE users ADD COLUMN date_of_birth TEXT');
  if (!userHas('gender')) db.exec('ALTER TABLE users ADD COLUMN gender TEXT');
  if (!userHas('address')) db.exec('ALTER TABLE users ADD COLUMN address TEXT');
  if (!userHas('profile_updated_at')) db.exec('ALTER TABLE users ADD COLUMN profile_updated_at INTEGER');
  // Tên đăng nhập là duy nhất nhưng được phép bỏ trống (tài khoản cũ chỉ có email).
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL');

  // Keep existing SQLite files forward-compatible with the editable doctor profile UI.
  const doctorColumns = db.prepare('PRAGMA table_info(doctors)').all() as Array<{ name: string }>;
  if (!doctorColumns.some((column) => column.name === 'image_url')) {
    db.exec('ALTER TABLE doctors ADD COLUMN image_url TEXT');
  }
  if (!doctorColumns.some((column) => column.name === 'qualifications')) {
    db.exec('ALTER TABLE doctors ADD COLUMN qualifications TEXT');
  }
  if (!doctorColumns.some((column) => column.name === 'achievements')) {
    db.exec('ALTER TABLE doctors ADD COLUMN achievements TEXT');
  }
}
