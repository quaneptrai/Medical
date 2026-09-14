import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles, logAudit } from '@/lib/auth/rbac';
import { APPOINTMENT_NEXT } from '@/lib/admin-labels';

const TABLES = [
  'tenants', 'users', 'sessions', 'roles', 'permissions', 'role_permissions', 'user_roles',
  'specialties', 'doctors', 'services', 'appointments', 'chat_channels', 'chat_messages',
  'ai_triage_sessions', 'ai_triage_logs', 'consultation_records', 'invoices', 'system_settings',
  'audit_logs', 'verification_tokens', 'password_reset_tokens', 'patient_feedback', 'inventory_items',
  'stock_movements', 'maintenance_records',
] as const;

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ detail: 'Chưa đăng nhập.' }, { status: 401 }) };
  if (!getUserRoles(user.id).includes('super_admin')) {
    return { error: NextResponse.json({ detail: 'Bạn cần vai trò Quản trị hệ thống để truy cập.' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  const db = getDb();
  const counts = Object.fromEntries(TABLES.map((table) => [table, (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count]));

  const permissions = db.prepare('SELECT id, code, name, category FROM permissions ORDER BY category, code').all();
  const roles = db.prepare(`
    SELECT r.id, r.code, r.name, COUNT(DISTINCT ur.user_id) AS user_count, COUNT(DISTINCT rp.permission_id) AS permission_count
    FROM roles r
    LEFT JOIN user_roles ur ON ur.role_id = r.id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    GROUP BY r.id ORDER BY r.code
  `).all();
  const users = db.prepare(`
    SELECT u.id, u.email, u.username, u.display_name, u.full_name, u.phone, u.date_of_birth, u.gender,
           u.address, u.status, u.is_verified, u.created_at, u.profile_updated_at,
           COALESCE(GROUP_CONCAT(DISTINCT r.code), 'patient') AS roles,
           (SELECT MAX(created_at) FROM sessions WHERE user_id = u.id) AS last_session_at,
           (SELECT COUNT(*) FROM appointments WHERE user_id = u.id) AS appointment_count
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200
  `).all();
  const tenants = db.prepare('SELECT id, code, name, brand_name, license_number, hotline, address, is_active FROM tenants ORDER BY created_at DESC').all();
  const specialties = db.prepare('SELECT id, name, category, short_desc, full_desc, common_symptoms, chief_doctor_name, icon_name, diseases_covered, is_active FROM specialties ORDER BY name').all();
  const services = db.prepare('SELECT id, specialty_id, name, code, service_type, description, is_active FROM services ORDER BY service_type, name').all();
  const doctors = db.prepare(`SELECT d.id, d.name, d.title, d.specialty_id, s.name AS specialty_name, d.experience_years,
    d.education, d.hospital_affiliation, d.bio, d.available_days, d.consultation_fee, d.image_url, d.qualifications, d.achievements, d.is_active
    FROM doctors d JOIN specialties s ON s.id = d.specialty_id ORDER BY s.name, d.name`).all();
  const appointments = db.prepare('SELECT id, patient_name, patient_phone, appointment_date, appointment_time, status, queue_number, specialty_id FROM appointments ORDER BY created_at DESC LIMIT 30').all();
  const triage = db.prepare('SELECT id, stage, chief_complaint, is_emergency, recommended_specialty_id, created_at FROM ai_triage_sessions ORDER BY created_at DESC LIMIT 30').all();
  const invoices = db.prepare('SELECT id, appointment_id, amount, payment_method, payment_status, transaction_code, created_at FROM invoices ORDER BY created_at DESC LIMIT 30').all();
  const audit = db.prepare('SELECT id, action, resource_type, resource_id, user_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 30').all();
  const feedback = db.prepare(`SELECT f.id,f.rating,f.comment,f.status,f.created_at,d.name AS doctor_name,s.name AS specialty_name FROM patient_feedback f JOIN doctors d ON d.id=f.doctor_id JOIN specialties s ON s.id=f.specialty_id ORDER BY f.created_at DESC LIMIT 50`).all();
  const specialtyPerformance = db.prepare(`SELECT s.id,s.name,COUNT(DISTINCT a.id) AS appointment_count,COUNT(DISTINCT f.id) AS feedback_count,ROUND(AVG(f.rating),1) AS average_rating FROM specialties s LEFT JOIN appointments a ON a.specialty_id=s.id LEFT JOIN patient_feedback f ON f.specialty_id=s.id AND f.status='published' GROUP BY s.id ORDER BY average_rating DESC,s.name`).all();
  const inventory = db.prepare('SELECT * FROM inventory_items ORDER BY category,name').all();
  const stockMovements = db.prepare(`SELECT m.id,m.movement_type,m.quantity,m.note,m.created_at,i.name AS item_name,i.unit FROM stock_movements m JOIN inventory_items i ON i.id=m.item_id ORDER BY m.created_at DESC LIMIT 50`).all();
  const maintenance = db.prepare('SELECT * FROM maintenance_records ORDER BY next_maintenance_date').all();
  const operatingMetrics = {
    appointmentsTotal: counts.appointments,
    feedbackTotal: counts.patient_feedback,
    averageRating: Number((db.prepare("SELECT ROUND(AVG(rating),1) AS value FROM patient_feedback WHERE status='published'").get() as { value?: number }).value || 0),
    inventoryAlerts: Number((db.prepare('SELECT COUNT(*) AS value FROM inventory_items WHERE is_active=1 AND current_quantity<=minimum_quantity').get() as { value: number }).value),
    maintenanceDue: Number((db.prepare("SELECT COUNT(*) AS value FROM maintenance_records WHERE status IN ('due_soon','overdue')").get() as { value: number }).value),
  };

  return NextResponse.json({
    authenticated: true,
    viewer: { ...auth.user, roles: getUserRoles(auth.user.id) },
    counts, permissions, roles, users, tenants, specialties, services, doctors, appointments, triage, invoices, audit,
    feedback, specialtyPerformance, inventory, stockMovements, maintenance, operatingMetrics,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ detail: 'Dữ liệu không hợp lệ.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ detail: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const db = getDb();
  const entity = String(body.entity || '');
  const id = String(body.id || '');
  const value = body.value;

  if (entity === 'appointment_status') {
    const now = Math.floor(Date.now() / 1000);
    const result = db.transaction(() => {
      const appointment = db.prepare('SELECT status FROM appointments WHERE id=?').get(id) as { status: string } | undefined;
      if (!appointment) return { code: 404, detail: 'Không tìm thấy lịch hẹn.' };
      if (body.expectedStatus && appointment.status !== body.expectedStatus) return { code: 409, detail: 'Lịch hẹn vừa được cập nhật. Hãy tải lại dữ liệu.' };
      if (!(APPOINTMENT_NEXT[appointment.status] || []).includes(value)) return { code: 409, detail: 'Không thể chuyển trạng thái lịch hẹn theo bước này.' };
      const reason = String(body.reason || '').trim();
      if (value === 'cancelled' && (!reason || reason.length > 1000)) return { code: 400, detail: 'Vui lòng nhập lý do hủy lịch (tối đa 1.000 ký tự).' };
      db.prepare(`UPDATE appointments SET status=?, checkin_at=CASE WHEN ?='checked_in' THEN ? ELSE checkin_at END,
        completed_at=CASE WHEN ?='completed' THEN ? ELSE completed_at END,
        cancellation_reason=CASE WHEN ?='cancelled' THEN ? ELSE cancellation_reason END WHERE id=?`)
        .run(value, value, now, value, now, value, reason, id);
      logAudit({ userId: auth.user.id, action: 'admin.appointment_status_update', resourceType: 'appointment', resourceId: id, details: { from: appointment.status, value, reason } });
      return { code: 200, detail: 'Đã cập nhật lịch hẹn.' };
    })();
    return NextResponse.json(result, { status: result.code });
  }

  if (entity === 'user_roles') {
    const requested = Array.isArray(value) ? value.map(String) : [];
    const validRoles = db.prepare(`SELECT id, code FROM roles WHERE code IN (${requested.map(() => '?').join(',') || "''"})`).all(...requested) as Array<{ id: string; code: string }>;
    const currentRoles = getUserRoles(id);
    if (currentRoles.includes('super_admin') && !requested.includes('super_admin')) return NextResponse.json({ detail: 'Không thể gỡ quyền cao nhất khỏi tài khoản được bảo vệ.' }, { status: 409 });
    if (!id || !validRoles.length) return NextResponse.json({ detail: 'Phải giữ ít nhất một vai trò hợp lệ.' }, { status: 400 });
    const tenantId = (db.prepare('SELECT tenant_id FROM users WHERE id = ?').get(id) as { tenant_id?: string } | undefined)?.tenant_id || 'yg-clinic-hn';
    const now = Math.floor(Date.now() / 1000);
    db.transaction(() => {
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);
      const insert = db.prepare('INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at) VALUES (?, ?, ?, ?)');
      validRoles.forEach((role) => insert.run(id, role.id, tenantId, now));
    })();
    logAudit({ userId: auth.user.id, action: 'admin.user_roles_update', resourceType: 'user', resourceId: id, details: { roles: validRoles.map((role) => role.code) } });
    return NextResponse.json({ success: true });
  }

  if (entity === 'specialty_profile') {
    const specialty = body.specialty || {};
    if (!id || !String(specialty.name || '').trim() || !String(specialty.category || '').trim()) return NextResponse.json({ detail: 'Tên và mã phân loại chuyên khoa là bắt buộc.' }, { status: 400 });
    const symptoms = Array.isArray(specialty.commonSymptoms) ? specialty.commonSymptoms.map(String).filter(Boolean) : [];
    const result = db.prepare(`UPDATE specialties SET name=?, category=?, short_desc=?, full_desc=?, common_symptoms=?, chief_doctor_name=?, icon_name=?, diseases_covered=?, is_active=? WHERE id=?`)
      .run(String(specialty.name).trim(), String(specialty.category).trim(), String(specialty.shortDesc || '').trim(), String(specialty.fullDesc || '').trim(), JSON.stringify(symptoms), String(specialty.chiefDoctor || '').trim(), String(specialty.iconName || 'Stethoscope'), Number(specialty.diseasesCovered || 0), specialty.isActive ? 1 : 0, id);
    if (!result.changes) return NextResponse.json({ detail: 'Không tìm thấy chuyên khoa.' }, { status: 404 });
    logAudit({ userId: auth.user.id, action: 'admin.specialty_update', resourceType: 'specialty', resourceId: id });
    return NextResponse.json({ success: true });
  }

  if (entity === 'service_profile') {
    const service = body.service || {};
    if (!id || !String(service.name || '').trim() || !String(service.code || '').trim()) return NextResponse.json({ detail: 'Tên và mã dịch vụ là bắt buộc.' }, { status: 400 });
    try {
      const result = db.prepare('UPDATE services SET name=?, code=?, service_type=?, specialty_id=?, description=?, price=0, discount_price=NULL, is_active=? WHERE id=?')
        .run(String(service.name).trim(), String(service.code).trim(), String(service.serviceType || 'clinical'), service.specialtyId || null, String(service.description || '').trim(), service.isActive ? 1 : 0, id);
      if (!result.changes) return NextResponse.json({ detail: 'Không tìm thấy dịch vụ.' }, { status: 404 });
    } catch { return NextResponse.json({ detail: 'Mã dịch vụ đã tồn tại.' }, { status: 409 }); }
    logAudit({ userId: auth.user.id, action: 'admin.service_update', resourceType: 'service', resourceId: id });
    return NextResponse.json({ success: true });
  }

  if (entity === 'tenant_profile') {
    const tenant = body.tenant || {};
    if (!id || !String(tenant.name || '').trim()) return NextResponse.json({ detail: 'Tên cơ sở là bắt buộc.' }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare('UPDATE tenants SET name=?, brand_name=?, license_number=?, hotline=?, address=?, updated_at=? WHERE id=?').run(String(tenant.name).trim(), String(tenant.brandName || '').trim(), String(tenant.licenseNumber || '').trim(), String(tenant.hotline || '').trim(), String(tenant.address || '').trim(), now, id);
    if (!result.changes) return NextResponse.json({ detail: 'Không tìm thấy cơ sở.' }, { status: 404 });
    logAudit({ userId: auth.user.id, action: 'admin.tenant_profile_update', resourceType: 'tenant', resourceId: id });
    return NextResponse.json({ success: true });
  }

  if (entity === 'inventory_profile') {
    const item = body.item || {};
    if (!id || !String(item.name || '').trim() || !String(item.sku || '').trim()) return NextResponse.json({ detail: 'Tên và mã kho là bắt buộc.' }, { status: 400 });
    try { db.prepare('UPDATE inventory_items SET sku=?,name=?,category=?,unit=?,minimum_quantity=?,expiry_date=?,is_active=? WHERE id=?').run(String(item.sku).trim(), String(item.name).trim(), String(item.category || 'Vật tư'), String(item.unit || 'Đơn vị'), Number(item.minimumQuantity || 0), item.expiryDate || null, item.isActive ? 1 : 0, id); }
    catch { return NextResponse.json({ detail: 'Mã kho đã tồn tại.' }, { status: 409 }); }
    logAudit({ userId: auth.user.id, action: 'admin.inventory_update', resourceType: 'inventory_item', resourceId: id });
    return NextResponse.json({ success: true });
  }

  if (entity === 'maintenance_profile') {
    const item = body.item || {};
    if (!id || !String(item.assetName || '').trim() || !String(item.assetCode || '').trim()) return NextResponse.json({ detail: 'Tên và mã thiết bị là bắt buộc.' }, { status: 400 });
    const allowed = ['scheduled','due_soon','overdue','in_progress','completed']; if (!allowed.includes(item.status)) return NextResponse.json({ detail: 'Trạng thái bảo trì không hợp lệ.' }, { status: 400 });
    try { db.prepare('UPDATE maintenance_records SET asset_code=?,asset_name=?,category=?,last_maintenance_date=?,next_maintenance_date=?,status=?,note=?,updated_at=? WHERE id=?').run(String(item.assetCode).trim(), String(item.assetName).trim(), String(item.category || ''), item.lastDate || null, item.nextDate || null, item.status, String(item.note || ''), Math.floor(Date.now()/1000), id); }
    catch { return NextResponse.json({ detail: 'Mã thiết bị đã tồn tại.' }, { status: 409 }); }
    logAudit({ userId: auth.user.id, action: 'admin.maintenance_update', resourceType: 'maintenance', resourceId: id });
    return NextResponse.json({ success: true });
  }

  if (entity === 'doctor_profile') {
    const doctor = body.doctor || {};
    const specialtyExists = db.prepare('SELECT 1 FROM specialties WHERE id = ? AND is_active = 1').get(String(doctor.specialtyId || ''));
    const experience = Number(doctor.experienceYears);
    if (!id || !String(doctor.name || '').trim() || !specialtyExists || !Number.isFinite(experience) || experience < 0) {
      return NextResponse.json({ detail: 'Thông tin bác sĩ không hợp lệ.' }, { status: 400 });
    }
    const days = Array.isArray(doctor.availableDays) ? doctor.availableDays.map(String).filter(Boolean) : [];
    const result = db.prepare(`UPDATE doctors SET name = ?, title = ?, specialty_id = ?, experience_years = ?, education = ?,
      hospital_affiliation = ?, bio = ?, available_days = ?, consultation_fee = 0, image_url = ?, qualifications = ?, achievements = ?, is_active = ? WHERE id = ?`)
      .run(String(doctor.name).trim(), String(doctor.title || '').trim(), String(doctor.specialtyId), experience,
        String(doctor.education || '').trim(), String(doctor.hospitalAffiliation || '').trim(), String(doctor.bio || '').trim(),
        JSON.stringify(days), String(doctor.imageUrl || '').trim(),
        JSON.stringify(Array.isArray(doctor.qualifications) ? doctor.qualifications.map(String).filter(Boolean) : []),
        JSON.stringify(Array.isArray(doctor.achievements) ? doctor.achievements.map(String).filter(Boolean) : []),
        doctor.isActive ? 1 : 0, id);
    if (!result.changes) return NextResponse.json({ detail: 'Không tìm thấy bác sĩ.' }, { status: 404 });
    logAudit({ userId: auth.user.id, action: 'admin.doctor_profile_update', resourceType: 'doctor', resourceId: id, details: { specialtyId: doctor.specialtyId, consultation: 'free' } });
    return NextResponse.json({ success: true });
  }

  const rules: Record<string, { sql: string; allowed: Array<string | number>; action: string }> = {
    user_status: { sql: 'UPDATE users SET status = ?, updated_at = ? WHERE id = ?', allowed: ['active', 'suspended'], action: 'admin.user_status_update' },
    appointment_status: { sql: 'UPDATE appointments SET status = ? WHERE id = ?', allowed: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'], action: 'admin.appointment_status_update' },
    chat_status: { sql: 'UPDATE chat_channels SET status = ? WHERE id = ?', allowed: ['active', 'closed'], action: 'admin.chat_status_update' },
    invoice_status: { sql: 'UPDATE invoices SET payment_status = ? WHERE id = ?', allowed: ['pending', 'paid_demo', 'failed', 'refunded_demo'], action: 'admin.invoice_status_update' },
    feedback_status: { sql: 'UPDATE patient_feedback SET status = ? WHERE id = ?', allowed: ['published', 'reviewed', 'hidden'], action: 'admin.feedback_status_update' },
    tenant_active: { sql: 'UPDATE tenants SET is_active = ?, updated_at = ? WHERE id = ?', allowed: [0, 1], action: 'admin.tenant_status_update' },
  };
  const rule = rules[entity];
  if (!rule || !id || !rule.allowed.includes(value)) return NextResponse.json({ detail: 'Thao tác không hợp lệ.' }, { status: 400 });

  if (entity === 'user_status' && value === 'suspended') {
    const targetRoles = getUserRoles(id);
    if (targetRoles.includes('super_admin')) {
      return NextResponse.json({ detail: 'Không thể tạm khóa tài khoản có quyền cao nhất.' }, { status: 409 });
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const result = entity === 'user_status' || entity === 'tenant_active'
    ? db.prepare(rule.sql).run(value, now, id)
    : db.prepare(rule.sql).run(value, id);
  if (!result.changes) return NextResponse.json({ detail: 'Không tìm thấy bản ghi.' }, { status: 404 });

  logAudit({ userId: auth.user.id, action: rule.action, resourceType: entity, resourceId: id, details: { value } });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ('error' in auth) return auth.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ detail: 'Dữ liệu không hợp lệ.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ detail: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const entity = String(body.entity || '');
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const id = `${entity}-${crypto.randomUUID()}`;
  if (entity === 'doctor') {
    const specialtyId = String(body.specialtyId || '');
    if (!String(body.name || '').trim() || !db.prepare('SELECT 1 FROM specialties WHERE id=?').get(specialtyId)) return NextResponse.json({ detail: 'Tên và chuyên khoa hợp lệ là bắt buộc.' }, { status: 400 });
    db.prepare(`INSERT INTO doctors (id,tenant_id,name,title,specialty_id,experience_years,education,hospital_affiliation,bio,available_days,consultation_fee,is_active,created_at,image_url,qualifications,achievements) VALUES (?,'yg-clinic-hn',?,?,?,?,?,?,?,?,0,1,?,?,?,?)`)
      .run(id, String(body.name).trim(), String(body.title || 'Bác sĩ'), specialtyId, Number(body.experienceYears || 0), '', '', '', '[]', now, '', '[]', '[]');
  } else if (entity === 'specialty') {
    if (!String(body.name || '').trim() || !String(body.category || '').trim()) return NextResponse.json({ detail: 'Tên và mã phân loại là bắt buộc.' }, { status: 400 });
    db.prepare(`INSERT INTO specialties (id,tenant_id,name,category,short_desc,full_desc,common_symptoms,chief_doctor_name,icon_name,diseases_covered,is_active,created_at) VALUES (?,'yg-clinic-hn',?,?,?,?,'[]','','Stethoscope',0,1,?)`)
      .run(id, String(body.name).trim(), String(body.category).trim(), String(body.shortDesc || '').trim(), String(body.fullDesc || '').trim(), now);
  } else if (entity === 'service') {
    if (!String(body.name || '').trim()) return NextResponse.json({ detail: 'Tên dịch vụ là bắt buộc.' }, { status: 400 });
    const code = String(body.code || `DV-${Date.now()}`).trim();
    try { db.prepare(`INSERT INTO services (id,tenant_id,specialty_id,name,code,service_type,price,discount_price,description,is_active,created_at) VALUES (?,'yg-clinic-hn',?,?,?,?,0,NULL,?,1,?)`).run(id, body.specialtyId || null, String(body.name).trim(), code, String(body.serviceType || 'clinical'), String(body.description || '').trim(), now); }
    catch { return NextResponse.json({ detail: 'Mã dịch vụ đã tồn tại.' }, { status: 409 }); }
  } else if (entity === 'inventory') {
    if (!String(body.name || '').trim() || !String(body.sku || '').trim()) return NextResponse.json({ detail: 'Tên và mã kho là bắt buộc.' }, { status: 400 });
    try { db.prepare(`INSERT INTO inventory_items (id,tenant_id,sku,name,category,unit,current_quantity,minimum_quantity,expiry_date,is_active,created_at) VALUES (?,'yg-clinic-hn',?,?,?,?,0,?,?,1,?)`).run(id,String(body.sku).trim(),String(body.name).trim(),String(body.category||'Vật tư'),String(body.unit||'Đơn vị'),Number(body.minimumQuantity||0),body.expiryDate||null,now); }
    catch { return NextResponse.json({ detail: 'Mã kho đã tồn tại.' }, { status: 409 }); }
  } else if (entity === 'stock_movement') {
    const itemId=String(body.itemId||''), movementType=String(body.movementType||''), quantity=Number(body.quantity);
    const item=db.prepare('SELECT current_quantity FROM inventory_items WHERE id=? AND is_active=1').get(itemId) as {current_quantity:number}|undefined;
    if(!item || !['in','out','adjust'].includes(movementType) || !Number.isFinite(quantity) || (movementType === 'adjust' ? quantity < 0 : quantity <= 0)) return NextResponse.json({detail:'Phiếu nhập/xuất không hợp lệ.'},{status:400});
    const next=movementType==='in'?item.current_quantity+quantity:movementType==='out'?item.current_quantity-quantity:quantity;
    if(next<0) return NextResponse.json({detail:'Số lượng xuất vượt tồn kho.'},{status:409});
    db.transaction(()=>{db.prepare('INSERT INTO stock_movements (id,item_id,movement_type,quantity,note,created_by,created_at) VALUES (?,?,?,?,?,?,?)').run(id,itemId,movementType,quantity,String(body.note||''),auth.user.id,now);db.prepare('UPDATE inventory_items SET current_quantity=? WHERE id=?').run(next,itemId);})();
  } else if (entity === 'maintenance') {
    if(!String(body.assetName||'').trim()||!String(body.assetCode||'').trim()) return NextResponse.json({detail:'Tên và mã thiết bị là bắt buộc.'},{status:400});
    try{db.prepare(`INSERT INTO maintenance_records (id,tenant_id,asset_code,asset_name,category,last_maintenance_date,next_maintenance_date,status,note,created_at,updated_at) VALUES (?,'yg-clinic-hn',?,?,?,?,?,'scheduled',?,?,?)`).run(id,String(body.assetCode).trim(),String(body.assetName).trim(),String(body.category||''),body.lastDate||null,body.nextDate||null,String(body.note||''),now,now);}catch{return NextResponse.json({detail:'Mã thiết bị đã tồn tại.'},{status:409});}
  } else return NextResponse.json({ detail: 'Loại dữ liệu không hỗ trợ tạo mới.' }, { status: 400 });
  logAudit({ userId: auth.user.id, action: `admin.${entity}_create`, resourceType: entity, resourceId: id });
  return NextResponse.json({ success: true, id }, { status: 201 });
}
