import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles, logAudit } from '@/lib/auth/rbac';

function categoryToSpecialty(value: string) {
  const text = value.toLocaleLowerCase('vi');
  const rules: Array<[string[], string]> = [
    [['respiratory', 'hô hấp', 'phổi'], 'ho-hap'],
    [['digestive', 'tiêu hóa', 'gan mật'], 'tieu-hoa'],
    [['dermatology', 'da liễu'], 'da-lieu'],
    [['musculoskeletal', 'cơ xương', 'xương khớp'], 'co-xuong-khop'],
    [['ent', 'tai mũi họng'], 'tai-mui-hong'],
    [['cardiology', 'tim mạch'], 'tim-mach'],
    [['neurology', 'thần kinh'], 'than-kinh'],
    [['obgyn', 'sản', 'phụ khoa'], 'san-phu-khoa'],
    [['pediatrics', 'nhi khoa'], 'nhi-khoa'],
    [['ophthalmology', 'mắt'], 'mat'],
  ];
  return rules.find(([needles]) => needles.some((needle) => text.includes(needle)))?.[1] || null;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });
    const db = getDb();
    const roles = getUserRoles(user.id);
    let channels: any[];
    if (roles.includes('doctor')) {
      const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(user.id) as { id: string } | undefined;
      channels = db.prepare(`SELECT c.*, u.display_name AS patient_name FROM chat_channels c LEFT JOIN users u ON c.patient_id = u.id WHERE c.doctor_id = ? ORDER BY c.last_message_at DESC`).all(doctor?.id || null);
    } else {
      channels = db.prepare(`SELECT c.*, d.name AS doctor_name, d.title AS doctor_title, s.name AS specialty_name FROM chat_channels c LEFT JOIN doctors d ON c.doctor_id = d.id LEFT JOIN specialties s ON d.specialty_id = s.id WHERE c.patient_id = ? ORDER BY c.last_message_at DESC`).all(user.id);
    }
    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Lỗi tải kênh chat.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ detail: 'Đăng nhập để chuyển thông tin tới bác sĩ.', requireLogin: true }, { status: 401 });
    const body = await request.json();
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    let specialtyId = typeof body.specialtyId === 'string' ? body.specialtyId : categoryToSpecialty(String(body.candidateCategory || ''));
    let doctor: any = null;

    if (body.doctorId) {
      doctor = db.prepare(`SELECT d.id, d.name, d.title, d.specialty_id, s.name AS specialty_name FROM doctors d JOIN specialties s ON s.id = d.specialty_id WHERE d.id = ? AND d.is_active = 1`).get(body.doctorId);
      specialtyId = doctor?.specialty_id || specialtyId;
    } else if (specialtyId) {
      doctor = db.prepare(`SELECT d.id, d.name, d.title, d.specialty_id, s.name AS specialty_name FROM doctors d JOIN specialties s ON s.id = d.specialty_id WHERE d.specialty_id = ? AND d.is_active = 1 ORDER BY d.name LIMIT 1`).get(specialtyId);
    }
    if (!doctor) return NextResponse.json({ detail: 'Chưa tìm thấy bác sĩ phù hợp để chuyển tiếp. Bạn có thể đặt lịch khám tổng quát.' }, { status: 422 });

    const initialMessage = String(body.initialMessage || '').trim().slice(0, 1500);
    const triageSummary = String(body.triageSummary || '').trim().slice(0, 1800);
    const existing = db.prepare(`SELECT id FROM chat_channels WHERE patient_id = ? AND doctor_id = ? AND status != 'closed'`).get(user.id, doctor.id) as { id: string } | undefined;
    const channelId = existing?.id || `chan-${crypto.randomUUID()}`;

    const insertMessage = db.prepare(`INSERT INTO chat_messages (id, channel_id, sender_id, sender_role, message_type, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const write = db.transaction(() => {
      if (!existing) {
        db.prepare(`INSERT INTO chat_channels (id, tenant_id, channel_type, patient_id, doctor_id, appointment_id, status, last_message_text, last_message_at, created_at) VALUES (?, ?, 'doctor_patient', ?, ?, ?, 'active', ?, ?, ?)`)
          .run(channelId, 'yg-clinic-hn', user.id, doctor.id, body.appointmentId || null, initialMessage || 'Kênh tư vấn đã được khởi tạo', now, now);
        insertMessage.run(`msg-${crypto.randomUUID()}`, channelId, user.id, 'system', 'system_event', `Thông tin được chuyển riêng tới ${doctor.name} · ${doctor.specialty_name}.`, 1, now);
      }
      if (initialMessage) insertMessage.run(`msg-${crypto.randomUUID()}`, channelId, user.id, 'patient', 'text', initialMessage, 0, now + 1);
      if (triageSummary) insertMessage.run(`msg-${crypto.randomUUID()}`, channelId, user.id, 'system', 'triage_summary', triageSummary, 1, now + 2);
      db.prepare('UPDATE chat_channels SET last_message_text = ?, last_message_at = ? WHERE id = ?').run(initialMessage || triageSummary || 'Đã chuyển thông tin', now + 2, channelId);
    });
    write();
    logAudit({ userId: user.id, action: 'chat.forward_to_specialist', resourceType: 'chat_channel', resourceId: channelId, details: { doctorId: doctor.id, specialtyId, isExisting: Boolean(existing) } });
    return NextResponse.json({ channelId, isExisting: Boolean(existing), doctor });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Không thể tạo kênh chat.' }, { status: 500 });
  }
}
