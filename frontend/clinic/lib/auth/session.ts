import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

const SESSION_COOKIE_NAME = 'botmed_session_id';
const SESSION_EXPIRY_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  display_name: string | null;
  is_verified: boolean;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateTokenCode(): string {
  // 6-digit numeric verification code for clean user experience
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const db = getDb();
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_EXPIRY_DAYS * 24 * 60 * 60;

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(sessionId, userId, expiresAt, now, userAgent || null, ipAddress || null);

  const cookieStore = await cookies();
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') || process.env.COOKIE_SECURE === 'true';
  (cookieStore as any).set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });

  return sessionId;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionId) return null;

    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      SELECT u.id, u.email, u.display_name, u.is_verified, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `);

    const result = stmt.get(sessionId, now) as any;
    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      display_name: result.display_name,
      is_verified: Boolean(result.is_verified),
    };
  } catch {
    return null;
  }
}

export async function revokeCurrentSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionId) {
      const db = getDb();
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch {}
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
