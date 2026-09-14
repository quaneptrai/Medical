import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles, logAudit } from '@/lib/auth/rbac';
import { getProfile, isProfileComplete, missingProfileFields } from '@/lib/auth/profile';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });
    }

    const roles = getUserRoles(user.id);
    const db = getDb();

    // Nếu là Super Admin, Clinic Admin hoặc Staff -> Được xem toàn bộ lịch khám
    if (roles.includes('super_admin') || roles.includes('clinic_admin') || roles.includes('staff')) {
      const appointments = db.prepare(`
        SELECT a.*, d.name as doctor_name, s.name as specialty_name
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN specialties s ON a.specialty_id = s.id
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
      `).all();
      return NextResponse.json({ appointments });
    }

    // Nếu là Bác sĩ -> Xem lịch của chính bác sĩ
    if (roles.includes('doctor')) {
      const doctorRow = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(user.id) as { id: string } | undefined;
      const doctorId = doctorRow ? doctorRow.id : null;
      const appointments = db.prepare(`
        SELECT a.*, s.name as specialty_name
        FROM appointments a
        LEFT JOIN specialties s ON a.specialty_id = s.id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
      `).all(doctorId);
      return NextResponse.json({ appointments });
    }

    // Nếu là Bệnh nhân -> Xem lịch của chính mình
    const appointments = db.prepare(`
      SELECT a.*, d.name as doctor_name, s.name as specialty_name
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN specialties s ON a.specialty_id = s.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(user.id);

    return NextResponse.json({ appointments });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Lỗi xử lý yêu cầu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { specialtyId, doctorId, serviceId, appointmentDate, appointmentTime, notes } = body;

    // Đặt lịch phải gắn với một hồ sơ người bệnh có thật, nên bắt buộc đăng nhập.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { detail: 'Vui lòng đăng nhập để đặt lịch khám.', code: 'auth_required' },
        { status: 401 }
      );
    }

    // Họ tên và số điện thoại lấy từ hồ sơ đã lưu, không nhận từ client.
    const profile = getProfile(user.id);
    if (!isProfileComplete(profile)) {
      return NextResponse.json(
        {
          detail: 'Vui lòng hoàn thiện thông tin cá nhân trước khi đặt lịch khám.',
          code: 'profile_incomplete',
          missing: missingProfileFields(profile),
        },
        { status: 403 }
      );
    }
    const patientName = profile.fullName;
    const patientPhone = profile.phone;

    if (!specialtyId || !doctorId || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { detail: 'Vui lòng chọn bác sĩ, chuyên khoa và thời gian khám.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = 'apt-' + crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const selectedDoctor = db.prepare('SELECT id, specialty_id, consultation_fee FROM doctors WHERE id = ? AND is_active = 1').get(doctorId) as { id: string; specialty_id: string; consultation_fee: number } | undefined;
    if (!selectedDoctor || selectedDoctor.specialty_id !== specialtyId) {
      return NextResponse.json({ detail: 'Bác sĩ không thuộc chuyên khoa đã chọn hoặc hiện không tiếp nhận.' }, { status: 400 });
    }
    const dateLooksValid = /^\d{4}-\d{2}-\d{2}$/.test(String(appointmentDate));
    const minutes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(appointmentTime));
    const totalMinutes = minutes ? Number(minutes[1]) * 60 + Number(minutes[2]) : -1;
    const inClinicHours = (totalMinutes >= 8 * 60 && totalMinutes < 12 * 60) || (totalMinutes >= 13 * 60 && totalMinutes < 19 * 60);
    if (!dateLooksValid || !inClinicHours) return NextResponse.json({ detail: 'Ngày hoặc giờ khám nằm ngoài khung tiếp nhận.' }, { status: 400 });
    const occupied = db.prepare(`SELECT 1 FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled', 'completed')`).get(doctorId, appointmentDate, appointmentTime);
    if (occupied) return NextResponse.json({ detail: 'Bác sĩ đã có lịch ở khung giờ này. Vui lòng chọn giờ khác.' }, { status: 409 });

    // Tính số thứ tự khám (queue_number) trong ngày cho chuyên khoa này
    const queueRow = db.prepare(`
      SELECT COALESCE(MAX(queue_number), 0) + 1 as next_queue
      FROM appointments
      WHERE specialty_id = ? AND appointment_date = ?
    `).get(specialtyId, appointmentDate) as { next_queue: number };
    const queueNumber = queueRow ? queueRow.next_queue : 1;

    // Khám ban đầu miễn phí 100%; giá dịch vụ phát sinh sẽ được cập nhật sau.
    const fee = 0;

    const insertStmt = db.prepare(`
      INSERT INTO appointments (
        id, tenant_id, user_id, specialty_id, doctor_id, service_id,
        appointment_date, appointment_time, patient_name, patient_phone,
        notes, queue_number, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      'yg-clinic-hn',
      user.id,
      specialtyId,
      doctorId || null,
      serviceId || null,
      appointmentDate,
      appointmentTime,
      patientName,
      patientPhone,
      notes || null,
      queueNumber,
      'confirmed',
      now
    );

    // Tạo hóa đơn thử nghiệm (Mock Invoice / Demo Payment)
    const invoiceId = 'inv-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO invoices (
        id, tenant_id, appointment_id, user_id, amount, payment_method,
        payment_status, transaction_code, demo_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      'yg-clinic-hn',
      id,
      user.id,
      fee,
      'vietqr_demo',
      'pending',
      'TXN-DEMO-' + Math.floor(100000 + Math.random() * 900000),
      'Hóa đơn khám bệnh thử nghiệm (Demo Mode) - Phòng khám Đa khoa Quốc tế Quang Thanh',
      now
    );

    // Ghi audit log
    logAudit({
      userId: user.id,
      action: 'appointment.create',
      resourceType: 'appointment',
      resourceId: id,
      details: { patientName, specialtyId, queueNumber, fee },
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id,
        patientName,
        patientPhone,
        appointmentDate,
        appointmentTime,
        queueNumber,
        status: 'confirmed',
        invoiceId,
        fee,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Không thể tạo lịch hẹn' }, { status: 500 });
  }
}
