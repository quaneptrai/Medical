import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles, getUserPermissions } from '@/lib/auth/rbac';
import { getProfile, isProfileComplete, missingProfileFields } from '@/lib/auth/profile';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const roles = getUserRoles(user.id);
  const permissions = getUserPermissions(user.id);

  const profile = getProfile(user.id);
  const db = getDb();
  const account = db.prepare('SELECT username FROM users WHERE id = ?').get(user.id) as { username: string | null } | undefined;
  const appointments = db.prepare(`
    SELECT id, specialty_id, doctor_id, appointment_date, appointment_time, patient_name, patient_phone, notes, status, queue_number, created_at
    FROM appointments
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(user.id);

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      roles,
      permissions,
      username: account?.username || '',
      profile,
    },
    profileComplete: isProfileComplete(profile),
    profileMissing: missingProfileFields(profile),
    appointments,
  });
}
