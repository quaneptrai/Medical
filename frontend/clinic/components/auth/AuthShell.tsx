'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck2, Check, HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react';

export function AuthShell({ children, mode }: { children: React.ReactNode; mode: 'login' | 'register' }) {
  return (
    <div className="min-h-[760px] bg-[#fff9f1]">
      <div className="mx-auto grid min-h-[760px] max-w-[1640px] grid-cols-[.88fr_1.12fr] border-x border-[#18312d]/10 bg-white">
        <section className="flex flex-col justify-between bg-[#eaf6f1] p-16">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-xs font-bold text-[#075f59]"><ArrowLeft className="h-4 w-4" /> Trở về trang chủ</Link>
          <div className="max-w-[520px]">
            <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#087f73]">Không gian chăm sóc riêng tư</p>
            <h2 className="text-[54px] leading-[1.08] text-[#18312d]">Một tài khoản.<br />Theo suốt hành trình khám.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#60736f]">Quản lý lịch hẹn, trao đổi tư vấn và thông tin viện phí trong cùng một nơi rõ ràng, an toàn.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Lịch hẹn', CalendarCheck2], ['Dữ liệu an toàn', ShieldCheck], ['Hỗ trợ liên tục', HeartHandshake]].map(([label, Icon]) => {
              const Glyph = Icon as React.ComponentType<{ className?: string }>;
              return <div key={label as string} className="rounded-2xl border border-[#bddbd2] bg-white/70 p-4"><Glyph className="mb-3 h-5 w-5 text-[#087f73]" /><p className="text-[11px] font-bold text-[#49635e]">{label as string}</p></div>;
            })}
          </div>
        </section>
        <section className="flex items-center justify-center px-20 py-14">
          <div className="w-full max-w-[560px] rounded-[28px] border border-[#d8e4df] bg-white p-10 shadow-[0_24px_70px_rgba(27,78,69,.12)]">
            <div className="mb-8 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-extrabold text-[#18312d]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#087f73] text-white"><LockKeyhole className="h-4 w-4" /></span> QUANG THANH</span><span className="flex items-center gap-1.5 text-[10px] text-[#60736f]"><Check className="h-3 w-3 text-[#087f73]" /> Kết nối bảo mật</span></div>
            <div className="auth-content" data-mode={mode}>{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
