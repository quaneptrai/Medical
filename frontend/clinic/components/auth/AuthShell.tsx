'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, ArrowLeft, BrainCircuit, Check, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

export function AuthShell({ children, mode }: { children: React.ReactNode; mode: 'login' | 'register' }) {
  return (
    <div className="relative min-h-[calc(100vh-68px)] overflow-hidden">
      <div className="app-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid min-h-[calc(100vh-68px)] max-w-[1440px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/[0.08] p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-[100px]" />
          <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Trở về tổng quan</Link>
          <div className="relative z-10 max-w-xl">
            <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-12 h-44 w-44">
              <div className="absolute inset-0 rounded-full border border-violet-300/20 orb-ring" />
              <div className="absolute inset-8 rounded-full border border-dashed border-cyan-300/20 orb-ring-reverse" />
              <div className="orb-core absolute inset-12 rounded-full" />
              <BrainCircuit className="absolute inset-0 m-auto h-8 w-8 text-white" />
            </motion.div>
            <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Private health workspace</p>
            <h2 className="text-5xl font-semibold leading-[1.02] xl:text-6xl">Sức khỏe của bạn.<br /><span className="text-gradient">Một nơi an toàn.</span></h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-zinc-500">Đăng nhập để quản lý lịch hẹn và thông tin tài khoản. Nội dung mô tả triệu chứng không được lưu mặc định.</p>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[['Phiên riêng tư', LockKeyhole], ['Bảo vệ dữ liệu', ShieldCheck], ['AI định hướng', Activity]].map(([label, Icon]) => {
              const Glyph = Icon as React.ComponentType<{ className?: string }>;
              return <div key={label as string} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><Glyph className="mb-3 h-4 w-4 text-violet-300" /><p className="text-[11px] text-zinc-400">{label as string}</p></div>;
            })}
          </div>
        </section>
        <section className="relative flex items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-600/10 blur-[100px]" />
          <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .45 }} className="glass-panel relative w-full max-w-[520px] rounded-3xl p-6 sm:p-9">
            <div className="mb-8 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15"><Activity className="h-4 w-4 text-violet-300" /></span> Phòng khám YG</span><span className="flex items-center gap-1.5 text-[10px] text-zinc-600"><Check className="h-3 w-3 text-emerald-400" /> Kết nối bảo mật</span></div>
            {children}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
