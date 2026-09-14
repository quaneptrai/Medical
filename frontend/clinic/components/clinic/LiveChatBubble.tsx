'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgeDollarSign, CalendarDays, ChevronLeft, Clock3, HeartPulse, LogIn, MessageCircle, Send, Stethoscope, X } from 'lucide-react';
import styles from './LiveChatBubble.module.css';

type Intent = 'booking' | 'symptoms' | null;
type Stage = 'menu' | 'awaiting_symptom' | 'result' | 'live';
type ChatMessage = { id: string; role: 'assistant' | 'user' | 'danger'; text: string };
type TriageResult = { original: string; category: string; specialtyId: string | null; specialtyName: string; summary: string };

const commands = [
  { command: '/kham', label: 'Tôi muốn thăm khám', icon: CalendarDays },
  { command: '/hoi-benh', label: 'Hỏi bệnh, triệu chứng', icon: HeartPulse },
  { command: '/gio-kham', label: 'Giờ và địa chỉ', icon: Clock3 },
  { command: '/gia', label: 'Giá dịch vụ', icon: BadgeDollarSign },
] as const;

const specialtyRules: Array<[string[], string, string]> = [
  [['respiratory', 'hô hấp', 'phổi'], 'ho-hap', 'Khoa Hô Hấp & Phổi'],
  [['digestive', 'tiêu hóa', 'gan mật'], 'tieu-hoa', 'Khoa Tiêu Hóa & Gan Mật'],
  [['dermatology', 'da liễu'], 'da-lieu', 'Khoa Da Liễu'],
  [['musculoskeletal', 'cơ xương', 'xương khớp'], 'co-xuong-khop', 'Khoa Cơ Xương Khớp'],
  [['ent', 'tai mũi họng'], 'tai-mui-hong', 'Khoa Tai Mũi Họng'],
  [['cardiology', 'tim mạch'], 'tim-mach', 'Khoa Tim Mạch'],
  [['neurology', 'thần kinh'], 'than-kinh', 'Khoa Nội Thần Kinh'],
  [['obgyn', 'sản', 'phụ khoa'], 'san-phu-khoa', 'Khoa Sản – Phụ Khoa'],
  [['pediatrics', 'nhi khoa'], 'nhi-khoa', 'Khoa Nhi'],
  [['ophthalmology', 'mắt'], 'mat', 'Khoa Mắt'],
];

function resolveSpecialty(category: string) {
  const value = category.toLocaleLowerCase('vi');
  const match = specialtyRules.find(([needles]) => needles.some((needle) => value.includes(needle)));
  return match ? { id: match[1], name: match[2] } : { id: null, name: category || 'Nội tổng quát' };
}

const greeting = (name?: string) => `Chào ${name || 'bạn'}, mình là bàn tiếp nhận Quang Thanh. Bạn có thể chọn nhanh một yêu cầu bên dưới hoặc nhập lệnh.`;

export function LiveChatBubble() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState<Stage>('menu');
  const [intent, setIntent] = React.useState<Intent>(null);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [account, setAccount] = React.useState<{ authenticated: boolean; id?: string; name?: string; isDoctor?: boolean }>({ authenticated: false });
  const [messages, setMessages] = React.useState<ChatMessage[]>([{ id: 'welcome', role: 'assistant', text: greeting() }]);
  const [result, setResult] = React.useState<TriageResult | null>(null);
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const hidden = ['/quan-tri', '/dang-nhap', '/dang-ky', '/quen-mat-khau', '/dat-lai-mat-khau', '/xac-minh-email', '/tro-ly'].some((path) => pathname.startsWith(path));
  const add = React.useCallback((role: ChatMessage['role'], text: string) => setMessages((current) => [...current, { id: `${role}-${Date.now()}-${Math.random()}`, role, text }]), []);

  React.useEffect(() => {
    fetch('/api/auth/me').then(async (response) => response.ok ? response.json() : null).then((data) => {
      const next = { authenticated: Boolean(data?.authenticated), id: data?.user?.id, name: data?.user?.display_name || undefined, isDoctor: Boolean(data?.user?.roles?.includes('doctor')) };
      setAccount(next);
      setMessages([{ id: 'welcome', role: 'assistant', text: next.isDoctor ? `Chào ${next.name || 'bác sĩ'}, đây là hộp thư tư vấn được chuyển riêng tới tài khoản của bạn.` : greeting(next.name) }]);
      if (next.authenticated) {
        if (next.isDoctor) {
          fetch('/api/chat', { cache: 'no-store' }).then((response) => response.json()).then((chatData) => {
            const first = chatData.channels?.[0];
            if (first) { setChannelId(first.id); setStage('live'); }
          });
          return;
        }
        const pending = sessionStorage.getItem('quangthanh_pending_chat');
        if (pending) {
          const parsed = JSON.parse(pending) as TriageResult;
          setResult(parsed); setStage('result'); setOpen(true);
          setMessages([{ id: 'welcome-back', role: 'assistant', text: `Thông tin “${parsed.original}” vẫn đang chờ. Nhấn chuyển tiếp để gửi riêng tới một bác sĩ phù hợp.` }]);
        }
      }
    }).catch(() => {});
  }, [pathname]);

  React.useEffect(() => { const node = scrollRef.current; if (node) node.scrollTop = node.scrollHeight; }, [messages, busy]);

  const loadChannel = React.useCallback(async (id: string) => {
    const response = await fetch(`/api/chat/${id}/messages`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setMessages(data.messages.map((message: any) => ({ id: message.id, role: message.sender_id === account.id ? 'user' : 'assistant', text: message.content })));
  }, [account.id]);

  React.useEffect(() => {
    if (!open || !channelId) return;
    loadChannel(channelId);
    const timer = window.setInterval(() => loadChannel(channelId), 5000);
    return () => window.clearInterval(timer);
  }, [channelId, loadChannel, open]);

  const resetMenu = () => { setStage('menu'); setIntent(null); setResult(null); setChannelId(null); setMessages([{ id: `welcome-${Date.now()}`, role: 'assistant', text: account.isDoctor ? 'Các tin tư vấn mới chỉ hiển thị khi được hệ thống chuyển đúng tới tài khoản bác sĩ này.' : greeting(account.name) }]); };

  const showPrices = async () => {
    add('user', '/gia · Xem giá dịch vụ'); setBusy(true);
    try {
      const response = await fetch('/api/services'); const data = await response.json();
      const lines = data.services.slice(0, 6).map((service: any) => `• ${service.name}`);
      add('assistant', `Khám ban đầu miễn phí 100%.\n\nCác dịch vụ đang tiếp nhận:\n${lines.join('\n')}\n\nBảng giá dịch vụ sẽ được phòng khám cập nhật sau.`);
    } catch { add('assistant', 'Chưa tải được bảng giá. Bạn có thể gọi 0222 444 56687 để được xác nhận.'); }
    finally { setBusy(false); }
  };

  const chooseCommand = (command: string) => {
    if (command === '/gio-kham') { add('user', '/gio-kham · Giờ và địa chỉ'); add('assistant', 'Giờ khám Thứ Hai–Chủ nhật:\n• Sáng 08:00–12:00\n• Chiều 13:00–19:00\n\nĐịa chỉ: Quang Trung, An Lão, Hải Phòng.\nHotline: 0222 444 56687 · Cấp cứu: 115.'); return; }
    if (command === '/gia') { showPrices(); return; }
    const nextIntent: Intent = command === '/kham' ? 'booking' : 'symptoms';
    setIntent(nextIntent); setStage('awaiting_symptom');
    add('user', command === '/kham' ? '/kham · Tôi muốn thăm khám' : '/hoi-benh · Hỏi bệnh, triệu chứng');
    add('assistant', command === '/kham' ? 'Trước khi chuyển bác sĩ, bạn hãy mô tả triệu chứng chính, bắt đầu từ khi nào và mức độ khó chịu.' : 'Bạn hãy mô tả triệu chứng, thời điểm bắt đầu và điều gì làm triệu chứng tăng hoặc giảm.');
  };

  const forward = async (triage: TriageResult) => {
    if (!account.authenticated) {
      sessionStorage.setItem('quangthanh_pending_chat', JSON.stringify(triage));
      add('assistant', 'Kết quả đã được giữ trong phiên này. Bạn cần đăng nhập để chuyển thông tin y tế riêng tới bác sĩ.');
      setStage('result'); return;
    }
    setBusy(true);
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specialtyId: triage.specialtyId, candidateCategory: triage.category, initialMessage: triage.original, triageSummary: triage.summary }) });
    const data = await response.json();
    if (!response.ok) add('assistant', data.detail || 'Chưa thể chuyển thông tin tới bác sĩ.');
    else {
      sessionStorage.removeItem('quangthanh_pending_chat'); setChannelId(data.channelId); setStage('live');
      add('assistant', `Đã chuyển riêng tới ${data.doctor.name} · ${data.doctor.specialty_name}. Từ đây bạn đang trao đổi trong một kênh duy nhất với bác sĩ phù hợp.`);
    }
    setBusy(false);
  };

  const triage = async (text: string) => {
    add('user', text); setBusy(true);
    try {
      const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text, top_k: 3, mode: 'auto' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không thể tra cứu');
      if (data.emergency?.is_emergency) { add('danger', `${data.emergency.message}\nHãy gọi 115 hoặc đến cơ sở cấp cứu gần nhất ngay. Thông tin này sẽ không được chuyển qua chat để chờ phản hồi.`); setStage('menu'); return; }
      const top = data.candidates?.[0];
      if (!top) { add('assistant', 'Chưa đủ thông tin để xác định hướng phù hợp. Bạn hãy mô tả cụ thể hơn vị trí khó chịu, thời điểm bắt đầu và mức độ.'); return; }
      const specialty = resolveSpecialty(top.category);
      const summary = `Định hướng ban đầu: ${top.name}. Nhóm chuyên môn: ${top.category}. Mức độ: ${top.urgency}. Mô tả: ${top.description}`;
      const nextResult = { original: text, category: top.category, specialtyId: specialty.id, specialtyName: specialty.name, summary };
      setResult(nextResult); setStage('result');
      add('assistant', `Đã tra cứu trước khi chuyển tiếp.\n• Biểu hiện gần nhất: ${top.name}\n• Hướng chuyên khoa: ${specialty.name}\n• Mức độ: ${top.urgency === 'high' ? 'nên thăm khám sớm' : 'khám theo lịch phù hợp'}\n\nĐây là định hướng ban đầu, không phải chẩn đoán.`);
      if (intent === 'booking') await forward(nextResult);
    } catch (error: any) { add('assistant', `Chưa thể hoàn tất tra cứu: ${error.message}. Nếu có dấu hiệu nguy hiểm, hãy gọi 115.`); }
    finally { setBusy(false); }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault(); const text = input.trim(); if (!text || busy) return; setInput('');
    const known = commands.find((item) => item.command === text.toLocaleLowerCase('vi'));
    if (known) { chooseCommand(known.command); return; }
    if (stage === 'awaiting_symptom') { await triage(text); return; }
    if (stage === 'live' && channelId) {
      const response = await fetch(`/api/chat/${channelId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) });
      if (response.ok) await loadChannel(channelId); else add('assistant', 'Tin nhắn chưa gửi được. Vui lòng thử lại.');
      return;
    }
    add('user', text); add('assistant', 'Hãy chọn một lệnh phù hợp để mình xử lý đúng luồng và không chuyển nhầm thông tin.');
  };

  if (hidden) return null;
  return <div className={styles.root}>
    {open ? <section className={styles.panel} role="dialog" aria-label="Live Chat Quang Thanh">
      <header className={styles.header}><div className={styles.identity}><span className={styles.avatar}><Stethoscope /></span><div><strong>Tiếp nhận Quang Thanh</strong><span><i /> {stage === 'live' ? 'Đang trao đổi với bác sĩ' : 'Sẵn sàng hỗ trợ'}</span></div></div><div className={styles.headerActions}>{stage !== 'menu' ? <button onClick={resetMenu} aria-label="Đổi chủ đề"><ChevronLeft /></button> : null}<button onClick={() => setOpen(false)} aria-label="Đóng Live Chat"><X /></button></div></header>
      <div className={styles.context}>{account.authenticated ? `Hồ sơ: ${account.name || 'Người dùng đã đăng nhập'}` : 'Khách chưa đăng nhập · vẫn có thể xem thông tin và tra cứu ban đầu'}</div>
      <div ref={scrollRef} className={styles.messages} aria-live="polite">
        {messages.map((message) => <div key={message.id} className={`${styles.message} ${styles[message.role]}`}><div>{message.text}</div></div>)}
        {stage === 'menu' && !account.isDoctor ? <div className={styles.commands}>{commands.map(({ command, label, icon: Icon }) => <button key={command} onClick={() => chooseCommand(command)}><Icon /> <span>{label}<small style={{ display: 'block', color: '#718681', fontSize: 9, marginTop: 2 }}>{command}</small></span></button>)}</div> : null}
        {stage === 'result' && result ? account.authenticated ? <button className={styles.action} onClick={() => forward(result)}><Stethoscope /> Chuyển tới 1 bác sĩ {result.specialtyName}</button> : <Link className={styles.loginAction} href="/dang-nhap?returnUrl=/tai-khoan"><LogIn /> Đăng nhập để chuyển bác sĩ</Link> : null}
        {busy ? <div className={styles.typing}><i /><i /><i /> Đang xử lý đúng luồng...</div> : null}
      </div>
      <div className={styles.composer}><form onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={stage === 'awaiting_symptom' ? 'Mô tả triệu chứng của bạn...' : stage === 'live' ? 'Nhắn cho bác sĩ...' : 'Nhập lệnh hoặc nội dung...'} /><button disabled={!input.trim() || busy} aria-label="Gửi"><Send /></button></form><p className={styles.privacy}>Không dùng Live Chat để chờ xử lý khi có dấu hiệu cấp cứu.</p></div>
    </section> : null}
    <button className={styles.launcher} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Đóng Live Chat' : 'Mở Live Chat'}><MessageCircle />{!open ? <span>1</span> : null}</button>
  </div>;
}
