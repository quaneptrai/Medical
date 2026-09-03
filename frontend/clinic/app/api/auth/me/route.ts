import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const db = getDb();
  const appointments = db.prepare(`
    SELECT id, specialty_id, doctor_id, appointment_date, appointment_time, patient_name, patient_phone, notes, status, created_at
    FROM appointments
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(user.id);

  return NextResponse.json({
    authenticated: true,
    user,
    appointments,
  });
}
