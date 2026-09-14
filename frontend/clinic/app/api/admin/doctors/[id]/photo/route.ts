import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles, logAudit } from '@/lib/auth/rbac';

const allowedTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ detail: 'Chưa đăng nhập.' }, { status: 401 });
  if (!getUserRoles(user.id).includes('super_admin')) return NextResponse.json({ detail: 'Chỉ quản trị viên cao nhất được đổi ảnh bác sĩ.' }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  if (!db.prepare('SELECT 1 FROM doctors WHERE id = ?').get(id)) return NextResponse.json({ detail: 'Không tìm thấy bác sĩ.' }, { status: 404 });
  const form = await request.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) return NextResponse.json({ detail: 'Vui lòng chọn ảnh.' }, { status: 400 });
  const extension = allowedTypes[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) return NextResponse.json({ detail: 'Chỉ nhận JPG, PNG, WEBP tối đa 5 MB.' }, { status: 400 });
  const directory = path.join(process.cwd(), 'public', 'uploads', 'doctors');
  await fs.mkdir(directory, { recursive: true });
  const filename = `${id}-${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  const url = `/uploads/doctors/${filename}`;
  db.prepare('UPDATE doctors SET image_url = ? WHERE id = ?').run(url, id);
  logAudit({ userId: user.id, action: 'admin.doctor_photo_update', resourceType: 'doctor', resourceId: id, details: { url } });
  return NextResponse.json({ success: true, url });
}
