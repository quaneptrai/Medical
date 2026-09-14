import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { logAudit } from '@/lib/auth/rbac';
import {
  PatientProfile, getProfile, isProfileComplete, missingProfileFields, saveProfile, validateProfile,
} from '@/lib/auth/profile';

function readProfile(body: Record<string, unknown>): PatientProfile {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  return {
    fullName: text(body.fullName),
    phone: text(body.phone),
    dateOfBirth: text(body.dateOfBirth),
    gender: text(body.gender) as PatientProfile['gender'],
    address: text(body.address),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });

  const profile = getProfile(user.id);
  const row = getDb().prepare('SELECT username FROM users WHERE id = ?').get(user.id) as { username: string | null } | undefined;

  return NextResponse.json({
    profile,
    username: row?.username || '',
    email: user.email,
    complete: isProfileComplete(profile),
    missing: missingProfileFields(profile),
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });

  try {
    const profile = readProfile(await req.json());
    const problem = validateProfile(profile);
    if (problem) return NextResponse.json({ detail: problem }, { status: 400 });

    saveProfile(user.id, profile);
    logAudit({ userId: user.id, action: 'profile.update', resourceType: 'user', resourceId: user.id });

    const saved = getProfile(user.id);
    return NextResponse.json({
      message: 'Đã lưu thông tin cá nhân.',
      profile: saved,
      complete: isProfileComplete(saved),
      missing: missingProfileFields(saved),
    });
  } catch {
    return NextResponse.json({ detail: 'Không đọc được dữ liệu gửi lên.' }, { status: 400 });
  }
}
