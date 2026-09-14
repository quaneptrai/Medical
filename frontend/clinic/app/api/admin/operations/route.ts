import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoles, logAudit } from '@/lib/auth/rbac';
import { getDb } from '@/lib/auth/db';
import { BODY_SYSTEMS, getDiseaseLibrary } from '@/lib/disease-library';
import { vietnamDate } from '@/lib/admin-labels';

async function authorize() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ detail: 'Vui lòng đăng nhập.' }, { status: 401 }) };
  if (!getUserRoles(user.id).includes('super_admin')) return { error: NextResponse.json({ detail: 'Cần quyền Quản trị hệ thống.' }, { status: 403 }) };
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  const db = getDb();
  const view = request.nextUrl.searchParams.get('view');
  if (view === 'appointments') {
    const search = request.nextUrl.searchParams;
    const requestedPage = Number(search.get('page'));
    const safePage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const query = (search.get('q') || '').slice(0, 100);
    const where = ['1=1']; const values: string[] = [];
    if (query) { where.push('(a.patient_name LIKE ? OR a.patient_phone LIKE ? OR a.id LIKE ?)'); values.push(...Array(3).fill(`%${query.replace(/[%_]/g, '')}%`)); }
    for (const [key,column] of [['date','appointment_date'],['status','status'],['specialty','specialty_id']]) {
      const value = search.get(key); if (value) { where.push(`a.${column}=?`); values.push(value); }
    }
    const clause = where.join(' AND ');
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM appointments a WHERE ${clause}`).get(...values) as {n:number}).n;
    const page = Math.min(safePage, Math.max(1, Math.ceil(total / 20)));
    const rows = db.prepare(`SELECT a.id,a.patient_name,a.patient_phone,a.appointment_date,a.appointment_time,a.status,a.queue_number,
      a.notes,a.cancellation_reason,a.specialty_id,s.name AS specialty_name,d.name AS doctor_name
      FROM appointments a LEFT JOIN specialties s ON s.id=a.specialty_id LEFT JOIN doctors d ON d.id=a.doctor_id
      WHERE ${clause} ORDER BY a.appointment_date DESC,a.appointment_time DESC,a.id LIMIT 20 OFFSET ?`).all(...values, (page-1)*20);
    return NextResponse.json({ rows, total, page, pageSize: 20 });
  }
  if (view === 'content') {
    const settings = db.prepare("SELECT setting_key,setting_value FROM system_settings WHERE category='editorial_review' AND tenant_id='yg-clinic-hn'").all() as Array<{setting_key:string;setting_value:string}>;
    const notes = new Map<string, {status:string;note:string}>(settings.map(row => { try { return [row.setting_key, JSON.parse(row.setting_value)]; } catch { return [row.setting_key, {status:'todo',note:''}]; } }));
    const rows = getDiseaseLibrary().map(disease => ({
      id: disease.slug, name: disease.name,
      system: BODY_SYSTEMS.find(system => system.category === disease.category)?.name || 'Chưa phân nhóm',
      hasWarnings: Boolean(disease.redFlags.length || disease.emergencySigns.length),
      hasRisks: Boolean(disease.riskFactors.length), hasQuestions: Boolean(disease.questions.length),
      review: notes.get(`disease:${disease.slug}`) || { status: 'todo', note: '' },
    }));
    return NextResponse.json({ rows });
  }
  const today = vietnamDate();
  const daily = db.prepare('SELECT status,COUNT(*) AS count FROM appointments WHERE appointment_date=? GROUP BY status').all(today);
  const trend = db.prepare('SELECT appointment_date AS date,COUNT(*) AS count FROM appointments WHERE appointment_date BETWEEN ? AND ? GROUP BY appointment_date ORDER BY appointment_date').all(vietnamDate(new Date(Date.now()-6*86400000)),today);
  const upcoming = db.prepare(`SELECT a.id,a.patient_name,a.appointment_time,a.status,s.name AS specialty_name FROM appointments a
    LEFT JOIN specialties s ON s.id=a.specialty_id WHERE a.appointment_date=? AND a.status NOT IN ('completed','cancelled') ORDER BY a.appointment_time LIMIT 8`).all(today);
  const lowStock = db.prepare('SELECT id,name,current_quantity,minimum_quantity,unit,expiry_date FROM inventory_items WHERE is_active=1 AND (current_quantity<=minimum_quantity OR (expiry_date IS NOT NULL AND expiry_date<=?)) ORDER BY current_quantity LIMIT 8').all(today);
  const maintenance = db.prepare("SELECT id,asset_name,next_maintenance_date,status FROM maintenance_records WHERE status!='completed' AND (next_maintenance_date<=? OR status IN ('overdue','due_soon','in_progress')) ORDER BY next_maintenance_date LIMIT 8").all(vietnamDate(new Date(Date.now()+7*86400000)));
  const totals = db.prepare('SELECT status,COUNT(*) AS count FROM appointments GROUP BY status').all();
  const chat = db.prepare(`SELECT c.id,c.status,c.channel_type,c.last_message_at,c.created_at,
    COALESCE(u.full_name,u.display_name,u.email) AS patient_name,d.name AS doctor_name,
    (SELECT COUNT(*) FROM chat_messages m WHERE m.channel_id=c.id) AS message_count
    FROM chat_channels c LEFT JOIN users u ON u.id=c.patient_id LEFT JOIN doctors d ON d.id=c.doctor_id
    ORDER BY COALESCE(c.last_message_at,c.created_at) DESC LIMIT 100`).all();
  return NextResponse.json({ today, daily, trend, upcoming, lowStock, maintenance, totals, chat });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize();
  if ('error' in auth) return auth.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({detail:'Dữ liệu không hợp lệ.'},{status:400}); }
  if (!body || !getDiseaseLibrary().some(d => d.slug === body.id) || !['todo','in_progress','done'].includes(body.status) || typeof body.note !== 'string' || body.note.length>2000) {
    return NextResponse.json({detail:'Mục bệnh, trạng thái hoặc ghi chú không hợp lệ (tối đa 2.000 ký tự).'},{status:400});
  }
  const value = JSON.stringify({status:body.status,note:body.note.trim(),updatedAt:Date.now()});
  getDb().prepare(`INSERT INTO system_settings(id,tenant_id,setting_key,setting_value,category,description,updated_at)
    VALUES (?,'yg-clinic-hn',?,?,'editorial_review','Ghi chú rà soát nội bộ',?)
    ON CONFLICT(id) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at`)
    .run(`editorial:${body.id}`,`disease:${body.id}`,value,Math.floor(Date.now()/1000));
  logAudit({userId:auth.user.id,action:'admin.content_review',resourceType:'disease',resourceId:body.id,details:{status:body.status}});
  return NextResponse.json({success:true});
}
