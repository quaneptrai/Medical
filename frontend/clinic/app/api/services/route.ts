import { NextResponse } from 'next/server';
import { getDb } from '@/lib/auth/db';

export async function GET() {
  const db = getDb();
  const services = db.prepare(`SELECT id, name, code, service_type, description FROM services WHERE is_active = 1 ORDER BY service_type, name`).all();
  return NextResponse.json({ services, consultationFree: true, pricingStatus: 'coming_soon', demoNotice: 'Khám ban đầu miễn phí 100%. Bảng giá dịch vụ sẽ được cập nhật sau.' });
}
