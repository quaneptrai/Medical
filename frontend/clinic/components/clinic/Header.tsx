'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, PhoneCall, User, X } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  children?: Array<{ href: string; label: string; hint: string }>;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Trang chủ' },
  {
    href: '/gioi-thieu',
    label: 'Giới thiệu',
    children: [
      { href: '/gioi-thieu', label: 'Tổng quan phòng khám', hint: 'Câu chuyện, con người và cách chúng tôi làm việc' },
      { href: '/gioi-thieu/tam-nhin-su-menh', label: 'Tầm nhìn & Sứ mệnh', hint: 'Định hướng phát triển và giá trị cốt lõi' },
      { href: '/gioi-thieu/thanh-tuu-giai-thuong', label: 'Thành tựu & Giải thưởng', hint: 'Chứng nhận chuyên môn và dấu mốc từng năm' },
    ],
  },
  { href: '/chuyen-khoa', label: 'Chuyên khoa' },
  { href: '/bac-si', label: 'Bác sĩ' },
  {
    href: '/benh',
    label: 'Cẩm nang sức khỏe',
    children: [
      { href: '/co-the-nguoi', label: 'Cơ thể người', hint: 'Tra cứu theo cơ quan và hệ cơ quan' },
      { href: '/benh', label: 'Thư viện bệnh', hint: 'Triệu chứng, dấu hiệu cảnh báo, khi nào cần khám' },
    ],
  },
  { href: '/dich-vu', label: 'Sản phẩm & Dịch vụ' },
  { href: '/tro-ly', label: 'Trợ lý sức khỏe' },
];

function BrandMark() {
  return (
    <span className="relative grid h-10 w-10 place-items-center rounded-[13px_13px_13px_4px] bg-[#087f73] shadow-[0_8px_18px_rgba(8,127,115,.2)]" aria-hidden="true">
      <span className="absolute h-1.5 w-5 rounded-full bg-white" />
      <span className="absolute h-5 w-1.5 rounded-full bg-white" />
    </span>
  );
}

type Account = { authenticated: boolean; isStaff: boolean; name: string };

const EMPTY_ACCOUNT: Account = { authenticated: false, isStaff: false, name: '' };

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = React.useState<Account>(EMPTY_ACCOUNT);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => setAccount({
        authenticated: Boolean(data?.authenticated),
        isStaff: Boolean(data?.user?.roles?.includes('super_admin') || data?.user?.roles?.includes('clinic_admin')),
        name: data?.user?.profile?.fullName || data?.user?.display_name || data?.user?.username || data?.user?.email || '',
      }))
      .catch(() => setAccount(EMPTY_ACCOUNT));
  }, [pathname]);

  React.useEffect(() => { setOpenMenu(null); setAccountOpen(false); setMobileOpen(false); }, [pathname]);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAccount(EMPTY_ACCOUNT);
      setAccountOpen(false);
      setLoggingOut(false);
      router.push('/');
      router.refresh();
    }
  };

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    if (item.children) return item.children.some((child) => pathname.startsWith(child.href));
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#18312d]/10 bg-[#fff9f1]/95 text-[#18312d] backdrop-blur-xl">
      <div className="hidden bg-[#075f59] text-[#eafff9] sm:block">
        <div className="mx-auto flex h-8 max-w-[1640px] items-center justify-between px-6 text-[11px] font-medium xl:px-8 2xl:px-0">
          <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-[#8ff0ad] shadow-[0_0_0_3px_rgba(143,240,173,.14)]" /> Tiếp nhận lịch khám hôm nay</span>
          <span className="flex items-center gap-3"><strong className="hidden lg:inline">Sáng 08:00–12:00 · Chiều 13:00–19:00</strong><i className="hidden h-3 w-px bg-white/25 lg:block" /><a className="font-extrabold text-white" href="tel:115">Cấp cứu 115</a><i className="h-3 w-px bg-white/25" /><span className="hidden md:inline">Quang Trung, An Lão, Hải Phòng</span></span>
        </div>
      </div>

      <div className="mx-auto flex h-[68px] max-w-[1640px] items-center justify-between px-4 sm:h-[74px] sm:px-6 xl:h-[78px] xl:px-8 2xl:px-0">
        <Link href="/" className="flex items-center gap-3" aria-label="Phòng khám Đa khoa Quốc tế Quang Thanh — Trang chủ">
          <BrandMark />
          <span><strong className="block text-[14px] tracking-[.04em] sm:text-[15px]">QUANG THANH</strong><small className="hidden text-[9px] uppercase tracking-[.08em] text-[#60736f] sm:block">Phòng khám đa khoa quốc tế</small></span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Điều hướng chính" onMouseLeave={() => setOpenMenu(null)}>
          {navItems.map((item) => {
            const active = isActive(item);
            const tone = active ? 'bg-[#eaf6f1] text-[#075f59]' : 'text-[#4e625e] hover:bg-[#eaf6f1] hover:text-[#075f59]';
            if (!item.children) {
              return (
                <Link key={item.href} href={item.href} className={`rounded-[10px] px-3 py-2 text-xs font-semibold transition-colors ${tone}`}>
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={item.label} className="relative" onMouseEnter={() => setOpenMenu(item.label)}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                  aria-expanded={openMenu === item.label}
                  className={`flex items-center gap-1 rounded-[10px] px-3 py-2 text-xs font-semibold transition-colors ${tone}`}
                >
                  {item.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${openMenu === item.label ? 'rotate-180' : ''}`} />
                </button>
                {openMenu === item.label ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] w-[330px] rounded-2xl border border-[#d8e4df] bg-white p-2 shadow-[0_24px_60px_rgba(27,78,69,.14)]">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded-xl px-3 py-2.5 transition-colors ${pathname === child.href ? 'bg-[#eaf6f1]' : 'hover:bg-[#f3f9f7]'}`}
                      >
                        <strong className="block text-[13px] text-[#18312d]">{child.label}</strong>
                        <span className="mt-0.5 block text-[11px] leading-5 text-[#60736f]">{child.hint}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a href="tel:115" className="hidden min-h-10 items-center gap-2 rounded-xl border border-[#dcb9b4] bg-[#fff0ed] px-3 text-xs font-bold text-[#962d31] sm:flex"><PhoneCall className="h-3.5 w-3.5" /> 115</a>
          {account.isStaff ? (
            <Link href="/quan-tri" className={`hidden min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold lg:flex ${pathname.startsWith('/quan-tri') ? 'bg-[#ffdd79] text-[#18312d]' : 'bg-[#fff1bf] text-[#70550a] hover:bg-[#ffdd79]'}`}><LayoutDashboard className="h-3.5 w-3.5" /> Điều hành</Link>
          ) : null}
          {account.authenticated ? (
            <div className="relative hidden lg:block" onMouseLeave={() => setAccountOpen(false)}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex min-h-10 items-center gap-2 rounded-xl bg-[#087f73] px-4 text-xs font-bold text-white"
              >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[150px] truncate">{account.name || 'Tài khoản'}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountOpen ? (
                <div role="menu" className="absolute right-0 top-[calc(100%+6px)] w-[240px] rounded-2xl border border-[#d8e4df] bg-white p-2 shadow-[0_24px_60px_rgba(27,78,69,.14)]">
                  <Link href="/tai-khoan" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#18312d] hover:bg-[#f3f9f7]"><User className="h-4 w-4 text-[#087f73]" /> Hồ sơ của tôi</Link>
                  <Link href="/tai-khoan" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#18312d] hover:bg-[#f3f9f7]"><CalendarDays className="h-4 w-4 text-[#087f73]" /> Lịch hẹn của tôi</Link>
                  {account.isStaff ? (
                    <Link href="/quan-tri" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#18312d] hover:bg-[#f3f9f7]"><LayoutDashboard className="h-4 w-4 text-[#087f73]" /> Bảng điều hành</Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={logout}
                    disabled={loggingOut}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-[#eef4f2] px-3 py-2.5 text-left text-[13px] font-semibold text-[#a4262c] hover:bg-[#fff3ef] disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" /> {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/dang-nhap" className="px-2 py-2 text-xs font-bold text-[#18312d]">Đăng nhập</Link>
              <Link href="/dat-lich" className="flex min-h-11 items-center gap-2 rounded-xl bg-[#087f73] px-4 text-xs font-extrabold text-white shadow-[0_9px_22px_rgba(8,127,115,.18)]">Đặt lịch khám <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
          )}
          <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d8e4df] bg-white text-[#18312d] xl:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[#d8e4df] bg-[#fffdf9] px-4 py-4 shadow-[0_24px_45px_rgba(27,78,69,.12)] xl:hidden">
          <nav className="mx-auto grid max-h-[calc(100vh-110px)] max-w-3xl gap-1 overflow-y-auto" aria-label="Điều hướng di động">
            {navItems.map((item) => (
              <div key={item.href} className="rounded-2xl border border-[#e3ece9] bg-white p-1.5">
                <Link href={item.href} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold ${isActive(item) ? 'bg-[#eaf6f1] text-[#075f59]' : 'text-[#18312d]'}`}>
                  {item.label}<ArrowUpRight className="h-4 w-4" />
                </Link>
                {item.children ? (
                  <div className="grid grid-cols-1 gap-1 px-2 pb-1 sm:grid-cols-2">
                    {item.children.map((child) => <Link key={child.href} href={child.href} className="rounded-lg px-2 py-2 text-xs text-[#60736f] hover:bg-[#f3f9f7]"><strong className="block text-[#18312d]">{child.label}</strong><span className="mt-0.5 block text-[10px] leading-4">{child.hint}</span></Link>)}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {account.authenticated ? <Link href="/tai-khoan" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#9ec7bd] bg-white text-xs font-bold text-[#075f59]"><User className="h-4 w-4" /> Tài khoản</Link> : <Link href="/dang-nhap" className="flex min-h-11 items-center justify-center rounded-xl border border-[#9ec7bd] bg-white text-xs font-bold text-[#075f59]">Đăng nhập</Link>}
              <Link href="/dat-lich" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087f73] text-xs font-extrabold text-white">Đặt lịch khám <CalendarDays className="h-4 w-4" /></Link>
            </div>
            <a href="tel:115" className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0ed] text-xs font-extrabold text-[#a4262c]"><PhoneCall className="h-4 w-4" /> Cấp cứu 115</a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
