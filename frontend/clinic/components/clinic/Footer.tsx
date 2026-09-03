import Link from 'next/link';
import { Activity, ArrowUpRight, PhoneCall } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#05050b]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm"><div className="mb-4 flex items-center gap-2.5 text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20"><Activity className="h-4 w-4 text-violet-300" /></span><span className="font-semibold">Phòng khám YG</span></div><p className="text-sm leading-6 text-zinc-500">Trợ lý hỗ trợ tra cứu và định hướng triệu chứng ban đầu. Kết quả không thay thế việc thăm khám hoặc chẩn đoán của bác sĩ.</p></div>
          <div><p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Khám phá</p><div className="grid gap-3 text-sm text-zinc-400"><Link href="/tro-ly" className="hover:text-white">Trò chuyện với AI</Link><Link href="/chuyen-khoa" className="hover:text-white">Chuyên khoa</Link><Link href="/dat-lich" className="hover:text-white">Đặt lịch khám</Link></div></div>
          <div><p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-zinc-500">Tài khoản</p><div className="grid gap-3 text-sm text-zinc-400"><Link href="/dang-nhap" className="hover:text-white">Đăng nhập</Link><Link href="/dang-ky" className="hover:text-white">Đăng ký</Link><a href="tel:115" className="flex items-center gap-2 text-red-300 hover:text-red-200"><PhoneCall className="h-3.5 w-3.5" /> Cấp cứu 115 <ArrowUpRight className="h-3 w-3" /></a></div></div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.08] pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Phòng khám YG. Built for safer first steps.</p><p>Quyền riêng tư · Điều khoản sử dụng</p></div>
      </div>
    </footer>
  );
}
