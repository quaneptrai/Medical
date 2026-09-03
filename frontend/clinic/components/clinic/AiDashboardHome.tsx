'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, ArrowUpRight, BrainCircuit, CalendarDays, Check, ChevronRight, CircleDot, HeartPulse, LockKeyhole, MessageSquareText, Mic, Send, ShieldCheck, Sparkles, Stethoscope, Zap } from 'lucide-react';

const reveal = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } };

function HealthOrb() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] select-none" aria-hidden="true">
      <div className="absolute inset-[8%] rounded-full border border-violet-300/15 orb-ring">
        <span className="absolute left-[11%] top-[8%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_4px_rgba(103,232,249,.55)]" />
        <span className="absolute bottom-[12%] right-[6%] h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_16px_4px_rgba(196,181,253,.6)]" />
      </div>
      <div className="absolute inset-[19%] rotate-45 rounded-[42%] border border-dashed border-white/10 orb-ring-reverse" />
      <div className="absolute inset-[25%] rounded-full orb-core float-slow" />
      <svg className="absolute inset-[15%] h-[70%] w-[70%] text-violet-300/45" viewBox="0 0 300 300">
        <path d="M20 154 C48 154, 54 132, 72 132 S92 196, 112 196 S130 74, 151 74 S170 174, 190 174 S205 144, 224 144 S245 154, 280 154" fill="none" stroke="currentColor" strokeWidth="1.2" className="dash-flow" />
      </svg>
      <div className="absolute left-[7%] top-[30%] rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-xl float-slow"><p className="text-[9px] uppercase tracking-[.18em] text-zinc-500">Phản hồi</p><p className="mt-0.5 text-sm font-semibold text-white">Theo thời gian thực</p></div>
      <div className="absolute bottom-[20%] right-[2%] rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-xl float-slow"><p className="flex items-center gap-1.5 text-xs font-medium text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Bảo vệ riêng tư</p></div>
    </div>
  );
}

function MiniConversation() {
  return (
    <div className="relative h-full min-h-[350px] overflow-hidden rounded-2xl border border-white/[0.09] bg-black/25 p-4 sm:p-5">
      <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-violet-400/[0.08] to-transparent" />
      <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15"><BrainCircuit className="h-4 w-4 text-violet-300" /></span><div><p className="text-xs font-semibold text-white">Trợ lý Phòng khám YG</p><p className="text-[10px] text-zinc-500">Phiên tư vấn riêng tư</p></div></div>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-300"><CircleDot className="h-3 w-3" /> Sẵn sàng</span>
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 max-w-[88%] rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.045] p-3.5 text-xs leading-5 text-zinc-300">Chào bạn, hãy mô tả điều khiến bạn khó chịu. Mình sẽ giúp sắp xếp thông tin và gợi ý bước tiếp theo.</motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .22 }} viewport={{ once: true }} className="ml-auto mb-4 max-w-[82%] rounded-2xl rounded-tr-sm bg-violet-500 p-3.5 text-xs leading-5 text-white shadow-[0_12px_32px_rgba(124,58,237,.22)]">Tôi ho khan ba ngày, hơi sốt và mệt nhiều vào buổi tối.</motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .44 }} viewport={{ once: true }} className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] p-4">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> Đang làm rõ thông tin</p>
        <div className="space-y-2 text-xs text-zinc-300"><p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Thời gian xuất hiện: 3 ngày</p><p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-300" /> Ho khan, sốt nhẹ, mệt về tối</p><p className="flex items-center gap-2 text-zinc-500"><CircleDot className="h-3.5 w-3.5" /> Cần hỏi thêm dấu hiệu khó thở</p></div>
      </motion.div>
    </div>
  );
}

export function AiDashboardHome() {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) sessionStorage.setItem('botmed_initial_intake', input.trim());
    router.push('/tro-ly');
  };

  return (
    <div className="relative overflow-hidden">
      <div className="app-grid pointer-events-none absolute inset-x-0 top-0 h-[950px]" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[60] mix-blend-soft-light" />

      <section className="relative mx-auto grid min-h-[calc(100vh-68px)] max-w-[1440px] items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-12">
        <motion.div initial="hidden" animate="show" transition={{ staggerChildren: .1 }} className="relative z-10 max-w-3xl">
          <motion.div variants={reveal} className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-200"><Sparkles className="h-3.5 w-3.5" /> Trợ lý sức khỏe thế hệ mới</motion.div>
          <motion.h1 variants={reveal} className="max-w-[760px] text-[clamp(3.25rem,7vw,7.2rem)] font-semibold leading-[.91] tracking-[-.075em]"><span className="text-white">Hiểu cơ thể.</span><br /><span className="text-gradient">Chủ động hơn.</span></motion.h1>
          <motion.p variants={reveal} className="mt-7 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">Một không gian AI riêng tư giúp bạn mô tả triệu chứng, nhận diện dấu hiệu cần chú ý và tìm đúng hướng chăm sóc ban đầu.</motion.p>

          <motion.form variants={reveal} onSubmit={submit} className="electric-border mt-9 rounded-2xl bg-[#0b0a14] p-[1px] shadow-[0_30px_100px_rgba(76,29,149,.25)]">
            <div className="rounded-[15px] bg-[#0a0912] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1"><span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-500"><MessageSquareText className="h-3.5 w-3.5 text-violet-300" /> Bắt đầu với một câu</span><span className="text-[10px] text-zinc-600">Không lưu mặc định</span></div>
              <div className="flex items-center gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none sm:text-base" placeholder="Ví dụ: Tôi đau đầu và chóng mặt từ sáng..." aria-label="Mô tả triệu chứng" />
                <button type="button" className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-500 hover:text-white sm:grid" aria-label="Nhập bằng giọng nói"><Mic className="h-4 w-4" /></button>
                <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-black transition hover:scale-[1.04] hover:bg-violet-100" aria-label="Mở trợ lý"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </motion.form>
          <motion.div variants={reveal} className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-zinc-400"><span className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-zinc-300" /> Bảo mật phiên</span><span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-zinc-300" /> Luôn kiểm tra dấu hiệu khẩn cấp</span><Link href="/tro-ly" className="flex items-center gap-1 font-medium text-violet-300 hover:text-violet-200">Mở toàn màn hình <ArrowRight className="h-3.5 w-3.5" /></Link></motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: .86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, ease: [0.2, 0.8, 0.2, 1] }} className="relative min-h-[420px] lg:min-h-[640px]"><HealthOrb /></motion.div>
      </section>

      <section className="relative mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-violet-300">Your health command center</p><h2 className="text-3xl font-semibold sm:text-5xl">Mọi bước chăm sóc, trong một nơi.</h2></div><p className="max-w-sm text-sm leading-6 text-zinc-500">Không chỉ là chat. Phòng khám YG kết nối định hướng triệu chứng, chuyên khoa và lịch khám thành một hành trình liền mạch.</p></div>
        <div className="grid auto-rows-[minmax(180px,auto)] gap-4 lg:grid-cols-12">
          <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} className="glass-panel lg:col-span-7 lg:row-span-2 rounded-3xl p-3"><MiniConversation /></motion.article>
          <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .1 }} viewport={{ once: true, margin: '-80px' }} className="glass-panel group relative overflow-hidden rounded-3xl p-6 lg:col-span-5">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl transition group-hover:bg-violet-500/30" />
            <div className="mb-8 flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/10"><BrainCircuit className="h-5 w-5 text-violet-300" /></span><ArrowUpRight className="h-5 w-5 text-zinc-600 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white" /></div>
            <h3 className="text-xl">Định hướng bằng AI</h3><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Đối chiếu mô tả tự nhiên với kho 652 mục kiến thức để tìm thông tin có thể liên quan.</p>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .16 }} viewport={{ once: true, margin: '-80px' }} className="glass-panel rounded-3xl p-6 lg:col-span-5">
            <div className="mb-8 flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.08]"><CalendarDays className="h-5 w-5 text-cyan-300" /></span><span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] text-emerald-300">Luồng liền mạch</span></div>
            <h3 className="text-xl">Đặt lịch đúng chuyên khoa</h3><p className="mt-2 text-sm leading-6 text-zinc-500">Chuyển từ kết quả tham khảo sang bước đặt lịch mà không phải nhập lại thông tin.</p><Link href="/dat-lich" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 hover:text-white">Khám các khung giờ <ChevronRight className="h-3.5 w-3.5" /></Link>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-violet-600 to-indigo-950 p-7 lg:col-span-4">
            <Zap className="mb-8 h-6 w-6 text-violet-100" /><p className="text-4xl font-semibold tracking-[-.06em]">652</p><p className="mt-1 text-sm text-violet-200">mục kiến thức bệnh học đang được đối chiếu</p>
          </motion.article>
          <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} viewport={{ once: true, margin: '-80px' }} className="glass-panel rounded-3xl p-7 lg:col-span-4"><Stethoscope className="mb-8 h-6 w-6 text-violet-300" /><p className="text-4xl font-semibold tracking-[-.06em]">06</p><p className="mt-1 text-sm text-zinc-500">nhóm chuyên khoa để tiếp tục thăm khám</p></motion.article>
          <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .16 }} viewport={{ once: true, margin: '-80px' }} className="glass-panel rounded-3xl p-7 lg:col-span-4"><HeartPulse className="mb-8 h-6 w-6 text-red-300" /><p className="text-4xl font-semibold tracking-[-.06em]">115</p><p className="mt-1 text-sm text-zinc-500">luôn ở một thao tác khi cần hỗ trợ khẩn cấp</p></motion.article>
        </div>
      </section>

      <section className="relative border-t border-white/[0.08] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(124,58,237,.18),transparent_45%)]" />
        <div className="relative mx-auto max-w-4xl text-center"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[.22em] text-violet-300">Ready when you are</p><h2 className="text-4xl font-semibold leading-tight sm:text-6xl">Tạo không gian sức khỏe<br className="hidden sm:block" /> dành riêng cho bạn.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-zinc-500">Lưu lịch hẹn, quản lý hồ sơ cá nhân và quay lại hành trình chăm sóc của bạn ở bất kỳ đâu.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/dang-ky" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-violet-100">Tạo tài khoản miễn phí <ArrowRight className="h-4 w-4" /></Link><Link href="/dang-nhap" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-white hover:bg-white/[0.08]">Đăng nhập</Link></div></div>
      </section>
    </div>
  );
}
