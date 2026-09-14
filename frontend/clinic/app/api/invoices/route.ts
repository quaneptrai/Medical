import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles, logAudit } from '@/lib/auth/rbac';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });
    }

    const roles = getUserRoles(user.id);
    const db = getDb();

    if (roles.includes('super_admin') || roles.includes('clinic_admin') || roles.includes('staff')) {
      const invoices = db.prepare(`
        SELECT i.*, a.patient_name, a.patient_phone, a.appointment_date, a.appointment_time
        FROM invoices i
        JOIN appointments a ON i.appointment_id = a.id
        ORDER BY i.created_at DESC
      `).all();
      return NextResponse.json({ invoices });
    }

    // Patient xem hóa đơn của mình
    const invoices = db.prepare(`
      SELECT i.*, a.patient_name, a.patient_phone, a.appointment_date, a.appointment_time
      FROM invoices i
      JOIN appointments a ON i.appointment_id = a.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `).all(user.id);

    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Lỗi tải hóa đơn' }, { status: 500 });
  }
}

/**
 * Xử lý thanh toán thử nghiệm (Mock Payment Execution)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });
    }

    const body = await req.json();
    const { invoiceId, paymentMethod = 'vietqr_demo' } = body;

    if (!invoiceId) {
      return NextResponse.json({ detail: 'Thiếu mã hóa đơn (invoiceId).' }, { status: 400 });
    }

    const db = getDb();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    if (!invoice) {
      return NextResponse.json({ detail: 'Không tìm thấy hóa đơn.' }, { status: 404 });
    }

    const now = Math.floor(Date.now() / 1000);
    const txnCode = 'MOCK-PAY-' + Math.floor(100000 + Math.random() * 900000);

    db.prepare(`
      UPDATE invoices
      SET payment_status = 'mock_success',
          payment_method = ?,
          transaction_code = ?,
          paid_at = ?
      WHERE id = ?
    `).run(paymentMethod, txnCode, now, invoiceId);

    // Cập nhật trạng thái lịch hẹn nếu cần
    db.prepare(`
      UPDATE appointments
      SET status = 'confirmed'
      WHERE id = ?
    `).run(invoice.appointment_id);

    logAudit({
      userId: user.id,
      action: 'invoice.mock_payment',
      resourceType: 'invoice',
      resourceId: invoiceId,
      details: { amount: invoice.amount, paymentMethod, transactionCode: txnCode },
    });

    return NextResponse.json({
      success: true,
      message: 'Thanh toán thử nghiệm (Demo) thành công!',
      invoice: {
        id: invoiceId,
        paymentStatus: 'mock_success',
        transactionCode: txnCode,
        paidAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Lỗi xử lý thanh toán' }, { status: 500 });
  }
}
