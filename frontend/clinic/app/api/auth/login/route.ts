import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json({ detail: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email, password_hash, is_verified FROM users WHERE email = ?').get(email) as any;

    // Neutral invalid credentials response
    if (!user) {
      return NextResponse.json({ detail: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ detail: 'Email hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    if (!user.is_verified) {
      return NextResponse.json({
        detail: 'Tài khoản chưa được xác minh email.',
        require_verification: true,
        email: user.email,
      }, { status: 403 });
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ip = req.headers.get('x-forwarded-for') || undefined;
    await createSession(user.id, userAgent, ip);

    return NextResponse.json({ message: 'Đăng nhập thành công.' });
  } catch (error: any) {
    return NextResponse.json({ detail: 'Lỗi máy chủ khi đăng nhập.', error: error.message }, { status: 500 });
  }
}
