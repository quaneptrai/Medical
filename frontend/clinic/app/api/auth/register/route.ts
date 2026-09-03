import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateId, generateTokenCode } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const displayName = (body.displayName || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: 'Email không hợp lệ.' }, { status: 400 });
    }

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.isValid) {
      return NextResponse.json({ detail: pwCheck.message }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      // Neutral message to prevent email enumeration attacks
      return NextResponse.json({
        message: 'Nếu email hợp lệ và chưa đăng ký, mã xác minh đã được tạo.',
        email,
      });
    }

    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(userId, email, passwordHash, displayName || null, now, now);

    // Generate 6-digit verification code valid for 24h
    const verificationCode = generateTokenCode();
    const tokenExpires = now + 24 * 60 * 60;
    db.prepare(`
      INSERT INTO verification_tokens (id, user_id, token_code, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), userId, verificationCode, tokenExpires, now);

    return NextResponse.json({
      message: 'Đăng ký thành công. Vui lòng nhập mã xác minh.',
      email,
      // For local development and test ease, expose dev_code in non-production
      dev_code: process.env.NODE_ENV !== 'production' ? verificationCode : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: 'Lỗi máy chủ khi đăng ký.', error: error.message }, { status: 500 });
  }
}
