import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { logAudit } from '@/lib/auth/rbac';

export async function GET() {
  const db = getDb();
  const summary = db.prepare(`SELECT s.id,s.name,COUNT(f.id) AS total,ROUND(AVG(f.rating),1) AS average FROM specialties s LEFT JOIN patient_feedback f ON f.specialty_id=s.id AND f.status='published' GROUP BY s.id ORDER BY average DESC,s.name`).all();
  return NextResponse.json({ summary });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ detail: 'Vui lòng đăng nhập để gửi đánh giá.' }, { status: 401 });
  const body = await request.json(); const rating = Number(body.rating); const doctorId = String(body.doctorId || '');
  const db = getDb();
  const doctor = db.prepare('SELECT id,specialty_id FROM doctors WHERE id=? AND is_active=1').get(doctorId) as { id: string; specialty_id: string } | undefined;
  if (!doctor || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ detail: 'Bác sĩ hoặc số điểm đánh giá không hợp lệ.' }, { status: 400 });
  const id = `feedback-${crypto.randomUUID()}`; const now = Math.floor(Date.now()/1000);
  db.prepare(`INSERT INTO patient_feedback (id,tenant_id,user_id,appointment_id,doctor_id,specialty_id,rating,comment,status,created_at) VALUES (?,'yg-clinic-hn',?,?,?,?,?,?,'published',?)`).run(id,user.id,body.appointmentId||null,doctor.id,doctor.specialty_id,rating,String(body.comment||'').trim().slice(0,1500),now);
  logAudit({ userId:user.id,action:'feedback.create',resourceType:'patient_feedback',resourceId:id,details:{doctorId,rating} });
  return NextResponse.json({success:true,id},{status:201});
}
