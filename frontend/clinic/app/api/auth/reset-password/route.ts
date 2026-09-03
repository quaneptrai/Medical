import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { revokeAllUserSessions } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();
    const newPassword = body.newPassword || '';

    if (!email || !code || !newPassword) {
      return NextResponse.json({ detail: 'Vui lòng cung cấp đầy đủ thông tin.' }, { status: 400 });
    }

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.isValid) {
      return NextResponse.json({ detail: pwCheck.message }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return NextResponse.json({ detail: 'Mã đặt lại không chính xác hoặc đã hết hạn.' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = db.prepare(`
      SELECT id FROM password_reset_tokens
      WHERE user_id = ? AND token_code = ? AND expires_at > ?
    `).get(user.id, code, now) as any;

    if (!token) {
      return NextResponse.json({ detail: 'Mã đặt lại không chính xác hoặc đã hết hạn.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, user.id);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);

    // Invalidate all existing sessions on password change for security
    await revokeAllUserSessions(user.id);

    return NextResponse.json({ message: 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.' });
  } catch (error: any) {
    return NextResponse.json({ detail: 'Lỗi máy chủ khi đặt lại mật khẩu.', error: error.message }, { status: 500 });
  }
}
