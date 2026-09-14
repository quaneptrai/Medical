import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles } from '@/lib/auth/rbac';

/** Hồ sơ đầy đủ và lịch sử hoạt động của một người dùng, phục vụ trang điều hành. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ detail: 'Chưa đăng nhập.' }, { status: 401 });
  if (!getUserRoles(viewer.id).includes('super_admin')) {
    return NextResponse.json({ detail: 'Chỉ Super Administrator được truy cập.' }, { status: 403 });
  }

  const { id } = await context.params;
  const db = getDb();

  const user = db.prepare(`
    SELECT u.id, u.email, u.username, u.display_name, u.full_name, u.phone, u.date_of_birth, u.gender,
           u.address, u.status, u.is_verified, u.created_at, u.updated_at, u.profile_updated_at,
           COALESCE(GROUP_CONCAT(DISTINCT r.code), 'patient') AS roles,
           (SELECT MAX(created_at) FROM sessions WHERE user_id = u.id) AS last_session_at,
           (SELECT COUNT(*) FROM appointments WHERE user_id = u.id) AS appointment_count
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = ?
    GROUP BY u.id
  `).get(id);

  if (!user) return NextResponse.json({ detail: 'Không tìm thấy người dùng.' }, { status: 404 });

  const audit = db.prepare(`
    SELECT id, action, resource_type, resource_id, details, ip_address, created_at
    FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(id);

  const sessions = db.prepare(`
    SELECT id, created_at, expires_at, user_agent, ip_address
    FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(id);

  const appointments = db.prepare(`
    SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.queue_number,
           s.name AS specialty_name, d.name AS doctor_name
    FROM appointments a
    LEFT JOIN specialties s ON s.id = a.specialty_id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = ? ORDER BY a.appointment_date DESC LIMIT 20
  `).all(id);

  const now = Math.floor(Date.now() / 1000);
  const activeSessions = db
    .prepare('SELECT COUNT(*) AS value FROM sessions WHERE user_id = ? AND expires_at > ?')
    .get(id, now) as { value: number };

  return NextResponse.json({ user, audit, sessions, appointments, activeSessions: activeSessions.value });
}
