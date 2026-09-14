import Link from 'next/link';
import { ArrowUpRight, Clock3, PhoneCall } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#18312d]/10 bg-[#eef8f3] text-[#18312d]">
      <div className="mx-auto max-w-[1640px] px-4 py-10 sm:px-6 lg:py-12 xl:px-8 2xl:px-0">
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="relative grid h-9 w-9 place-items-center rounded-[12px_12px_12px_4px] bg-[#087f73]" aria-hidden="true"><i className="absolute h-1.5 w-4 rounded-full bg-white" /><i className="absolute h-4 w-1.5 rounded-full bg-white" /></span>
              <div><strong className="block text-sm tracking-[.04em]">QUANG THANH</strong><span className="text-[9px] uppercase tracking-[.08em] text-[#60736f]">Phòng khám đa khoa quốc tế</span></div>
            </div>
            <p className="text-sm leading-6 text-[#60736f]">Phòng khám Đa khoa Quốc tế Quang Thanh tại An Lão, Hải Phòng cung cấp dịch vụ khám chuyên khoa, đặt lịch và tiếp nhận người bệnh trong không gian thân thiện, rõ ràng.</p>
          </div>
          <div><p className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-[#075f59]">Chăm sóc</p><div className="grid gap-3 text-sm text-[#4e625e]"><Link href="/tro-ly">Trợ lý sức khỏe</Link><Link href="/chuyen-khoa">Chuyên khoa</Link><Link href="/bac-si">Đội ngũ bác sĩ</Link><Link href="/dich-vu">Sản phẩm & Dịch vụ</Link><Link href="/danh-gia">Gửi đánh giá</Link></div></div>
          <div><p className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-[#075f59]">Cẩm nang & Giới thiệu</p><div className="grid gap-3 text-sm text-[#4e625e]"><Link href="/co-the-nguoi">Cơ thể người</Link><Link href="/benh">Thư viện bệnh</Link><Link href="/gioi-thieu/tam-nhin-su-menh">Tầm nhìn & Sứ mệnh</Link><Link href="/gioi-thieu/thanh-tuu-giai-thuong">Thành tựu & Giải thưởng</Link><Link href="/lien-he">Liên hệ phòng khám</Link></div></div>
          <div><p className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-[#075f59]">Giờ tiếp nhận</p><div className="grid gap-2 text-sm text-[#4e625e]"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#087f73]" /> Thứ Hai–Chủ nhật</p><p>Sáng 08:00–12:00</p><p>Chiều 13:00–19:00</p><a href="tel:022244456687" className="mt-1 flex items-center gap-2 font-bold text-[#075f59]"><PhoneCall className="h-3.5 w-3.5" /> Hotline 0222 444 56687 <ArrowUpRight className="h-3 w-3" /></a><a href="tel:115" className="flex items-center gap-2 font-bold text-[#a4262c]"><PhoneCall className="h-3.5 w-3.5" /> Cấp cứu 115 <ArrowUpRight className="h-3 w-3" /></a></div></div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-[#18312d]/10 pt-6 text-xs text-[#60736f] sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Phòng khám Đa khoa Quốc tế Quang Thanh.</p><p>Quyền riêng tư · Điều khoản sử dụng</p></div>
      </div>
    </footer>
  );
}
