import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BOTMED_BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        service: 'offline',
        detail: 'Không thể kết nối tới backend Phòng khám Quang Thanh.',
      },
      { status: 503 }
    );
  }
}
