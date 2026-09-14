import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';

const BACKEND_URL = process.env.BOTMED_BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  let body: Record<string, any>;
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

    // Tự động ghi nhật ký phân luồng AI Triage vào SQLite (Database-first SaaS Logging)
    try {
      const user = await getCurrentUser();
      const db = getDb();
      const now = Math.floor(Date.now() / 1000);

      const sessionId = body.sessionId || 'ses-' + crypto.randomUUID();
      const isEmergency = Boolean(data.emergency?.is_emergency);
      const emergencyRuleId = data.emergency?.rule_id || null;

      // Xác định chuyên khoa đề xuất từ kết quả top 1
      const topCandidate = data.candidates && data.candidates.length > 0 ? data.candidates[0] : null;
      let recSpecialtyId: string | null = null;
      if (topCandidate?.category) {
        const spec = db.prepare('SELECT id FROM specialties WHERE name LIKE ? OR category LIKE ?').get(
          `%${topCandidate.category}%`,
          `%${topCandidate.category}%`
        ) as { id: string } | undefined;
        if (spec) recSpecialtyId = spec.id;
      }

      // Upsert Session
      const existingSession = db.prepare('SELECT id FROM ai_triage_sessions WHERE id = ?').get(sessionId);
      if (!existingSession) {
        db.prepare(`
          INSERT INTO ai_triage_sessions (
            id, tenant_id, user_id, session_token, stage,
            chief_complaint, is_emergency, emergency_rule_id,
            recommended_specialty_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sessionId,
          'yg-clinic-hn',
          user ? user.id : null,
          sessionId,
          isEmergency ? 'emergency' : 'concluded',
          query.slice(0, 200),
          isEmergency ? 1 : 0,
          emergencyRuleId,
          recSpecialtyId,
          now,
          now
        );
      } else {
        db.prepare(`
          UPDATE ai_triage_sessions
          SET stage = ?, is_emergency = ?, updated_at = ?
          WHERE id = ?
        `).run(
          isEmergency ? 'emergency' : 'concluded',
          isEmergency ? 1 : 0,
          now,
          sessionId
        );
      }

      // Ghi log turn
      const logId = 'log-' + crypto.randomUUID();
      const turnIndex = Number(body.turnIndex) || 1;
      const botReply = isEmergency
        ? `CẢNH BÁO KHẨN CẤP: ${data.emergency?.message}`
        : `Tìm thấy ${data.candidates?.length || 0} bệnh lý phù hợp. Gợi ý hàng đầu: ${topCandidate?.name || 'Chưa rõ'}`;

      db.prepare(`
        INSERT INTO ai_triage_logs (
          id, session_id, turn_index, user_message, bot_reply,
          stage, extracted_symptoms, top_candidates, latency_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        sessionId,
        turnIndex,
        query,
        botReply,
        isEmergency ? 'emergency' : 'concluded',
        JSON.stringify(topCandidate?.symptoms || []),
        JSON.stringify(data.candidates || []),
        data.latency_ms || 0,
        now
      );
    } catch (logErr) {
      console.error('Lỗi khi lưu trữ AI triage log:', logErr);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        detail: 'Dịch vụ Phòng khám Quang Thanh đang ngoại tuyến hoặc khởi động. Vui lòng thử lại sau.',
      },
      { status: 503 }
    );
  }
}
