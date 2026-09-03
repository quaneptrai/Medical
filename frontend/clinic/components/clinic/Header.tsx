'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowUpRight, Menu, PhoneCall, Sparkles, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Tổng quan' },
  { href: '/tro-ly', label: 'Trợ lý AI' },
  { href: '/chuyen-khoa', label: 'Chuyên khoa' },
  { href: '/dat-lich', label: 'Đặt lịch' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [isAuth, setIsAuth] = React.useState(false);
  React.useEffect(() => { fetch('/api/auth/me').then((res) => setIsAuth(res.ok)).catch(() => {}); }, []);
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#05050b]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="Phòng khám YG — Trang chủ">
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.07] shadow-[0_0_28px_rgba(139,92,246,.3)]">
            <span className="absolute inset-0 bg-gradient-to-br from-violet-500/45 to-cyan-400/10 opacity-80 transition-opacity group-hover:opacity-100" />
            <Activity className="relative h-[18px] w-[18px] text-white" />
          </span>
          <span><span className="block text-sm font-semibold tracking-[-.02em] text-white">Phòng khám YG</span><span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300"><Sparkles className="h-2.5 w-2.5" /> AI Health OS</span></span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 lg:flex" aria-label="Điều hướng chính">
          {navLinks.map((link) => <Link key={link.href} href={link.href} className={cn('rounded-full px-4 py-2 text-xs font-medium transition-all', pathname === link.href ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white')}>{link.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href="tel:115" className="hidden min-h-10 items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[0.08] px-3.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/[0.14] sm:flex"><PhoneCall className="h-3.5 w-3.5" /> 115</a>
          {isAuth ? <Link href="/tai-khoan" className="hidden min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:bg-violet-100 sm:flex"><User className="h-3.5 w-3.5" /> Dashboard</Link> : <div className="hidden items-center gap-2 sm:flex"><Link href="/dang-nhap" className="px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white">Đăng nhập</Link><Link href="/dang-ky" className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:bg-violet-100">Bắt đầu <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>}
          <button onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-zinc-300 lg:hidden" aria-expanded={open} aria-label="Mở menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && <div className="border-t border-white/[0.08] bg-[#080810] px-4 py-5 lg:hidden"><nav className="mx-auto grid max-w-lg gap-1">{navLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">{link.label}</Link>)}<div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4"><Link href="/dang-nhap" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-white">Đăng nhập</Link><Link href="/dang-ky" className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black">Đăng ký</Link></div></nav></div>}
    </header>
  );
}
