import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';
import { generateId, generateTokenCode } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ detail: 'Vui lòng nhập email.' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;

    if (user) {
      const resetCode = generateTokenCode();
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 60 * 60; // 1 hour validity

      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token_code, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId(), user.id, resetCode, expiresAt, now);

      return NextResponse.json({
        message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.',
        dev_code: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
      });
    }

    // Enumeration-safe neutral response
    return NextResponse.json({
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.',
    });
  } catch (error: any) {
    return NextResponse.json({ detail: 'Lỗi máy chủ.', error: error.message }, { status: 500 });
  }
}
