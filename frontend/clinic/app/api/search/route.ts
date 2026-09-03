import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BOTMED_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (query.length < 2) {
      return NextResponse.json(
        { detail: 'Mô tả triệu chứng quá ngắn (tối thiểu 2 ký tự).' },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        detail: 'Dịch vụ Phòng khám YG đang ngoại tuyến hoặc khởi động. Vui lòng thử lại sau.',
      },
      { status: 503 }
    );
  }
}
