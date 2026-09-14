-- ============================================================================
-- BotMedical SaaS Database-First DDL Schema (SQLite & RDBMS Ready)
-- ============================================================================

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