import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';
import { createSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();

    if (!email || !code) {
      return NextResponse.json({ detail: 'Vui lòng cung cấp email và mã xác minh.' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return NextResponse.json({ detail: 'Mã xác minh không chính xác hoặc đã hết hạn.' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = db.prepare(`
      SELECT id FROM verification_tokens
      WHERE user_id = ? AND token_code = ? AND expires_at > ?
    `).get(user.id, code, now) as any;

    if (!token) {
      return NextResponse.json({ detail: 'Mã xác minh không chính xác hoặc đã hết hạn.' }, { status: 400 });
    }

    // Activate user and consume token
    db.prepare('UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?').run(now, user.id);
    db.prepare('DELETE FROM verification_tokens WHERE user_id = ?').run(user.id);

    // Issue session immediately on verification
    const userAgent = req.headers.get('user-agent') || undefined;
    await createSession(user.id, userAgent);

    return NextResponse.json({ message: 'Xác minh tài khoản thành công.' });
  } catch (error: any) {
    return NextResponse.json({ detail: 'Lỗi máy chủ khi xác minh.', error: error.message }, { status: 500 });
  }
}
