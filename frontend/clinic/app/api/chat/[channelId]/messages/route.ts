import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/auth/db';
import { getUserRoles } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ detail: 'Yêu cầu đăng nhập.' }, { status: 401 });
    }

    const { channelId } = await params;
    const db = getDb();

    // Xác thực quyền truy cập kênh
    const channel = db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(channelId) as any;
    if (!channel) {
      return NextResponse.json({ detail: 'Kênh chat không tồn tại.' }, { status: 404 });
    }

    const roles = getUserRoles(user.id);
    const isChannelPatient = channel.patient_id === user.id;

    let isChannelDoctor = false;
    if (roles.includes('doctor')) {
      const doc = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(user.id) as { id: string } | undefined;
      if (doc && doc.id === channel.doctor_id) isChannelDoctor = true;
    }

    if (!isChannelPatient && !isChannelDoctor) {
      return NextResponse.json({ detail: 'Bạn không có quyền xem cuộc trò chuyện này.' }, { status: 403 });
    }

    const messages = db.prepare(`
      SELECT * FROM chat_messages
      WHERE channel_id = ?
      ORDER BY created_at ASC
    `).all(channelId);

    // Đánh dấu đã đọc các tin nhắn không phải của user hiện tại
    db.prepare(`
      UPDATE chat_messages
      SET is_read = 1
      WHERE channel_id = ? AND sender_id != ?
    `).run(channelId, user.id);

    return NextResponse.json({ channel, messages });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Lỗi tải tin nhắn' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ detail: 'Yêu cầu đăng nhập để gửi tin nhắn.' }, { status: 401 });
    }

    const { channelId } = await params;
    const body = await req.json();
    const { content, messageType = 'text', attachmentUrl } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ detail: 'Nội dung tin nhắn không được để trống.' }, { status: 400 });
    }

    const db = getDb();
    const channel = db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(channelId) as any;
    if (!channel) {
      return NextResponse.json({ detail: 'Kênh chat không tồn tại.' }, { status: 404 });
    }

    const roles = getUserRoles(user.id);
    const isChannelPatient = channel.patient_id === user.id;
    const doctor = roles.includes('doctor') ? db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(user.id) as { id: string } | undefined : undefined;
    const isChannelDoctor = doctor?.id === channel.doctor_id;
    if (!isChannelPatient && !isChannelDoctor) return NextResponse.json({ detail: 'Bạn không có quyền gửi tin nhắn trong kênh này.' }, { status: 403 });
    const senderRole = isChannelDoctor ? 'doctor' : 'patient';

    const msgId = 'msg-' + crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO chat_messages (
        id, channel_id, sender_id, sender_role, message_type, content, attachment_url, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msgId,
      channelId,
      user.id,
      senderRole,
      messageType,
      content.trim(),
      attachmentUrl || null,
      0,
      now
    );

    // Cập nhật thông tin tóm tắt ở channel
    db.prepare(`
      UPDATE chat_channels
      SET last_message_text = ?, last_message_at = ?
      WHERE id = ?
    `).run(content.trim().slice(0, 150), now, channelId);

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        channelId,
        senderId: user.id,
        senderRole,
        messageType,
        content: content.trim(),
        attachmentUrl: attachmentUrl || null,
        isRead: false,
        createdAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Không thể gửi tin nhắn' }, { status: 500 });
  }
}
