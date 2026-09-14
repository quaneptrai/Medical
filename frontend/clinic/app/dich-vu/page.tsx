import Link from 'next/link';
import { ArrowRight, CheckCircle2, Info, PhoneCall, Users } from 'lucide-react';
import { SERVICE_PACKAGES } from '@/lib/about-data';
import { CLINIC_INFO } from '@/lib/clinic-data';
import { getCatalogSpecialties } from '@/lib/doctor-catalog';

export const metadata = {
  title: 'Sản phẩm & Dịch vụ · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Các gói khám sức khỏe tổng quát, tầm soát chuyên sâu, theo dõi thai kỳ, chăm sóc sau sinh và người cao tuổi tại Phòng khám Quang Thanh.',
};
export const dynamic = 'force-dynamic';

export default function ServicesPage() {
  const specialties = getCatalogSpecialties();
  const specialtyName = (id?: string) => specialties.find((item) => item.id === id)?.name;

  return (
    <div className="clinic-page space-y-9">
      <section className="grid grid-cols-[1.2fr_.8fr] items-end gap-10 rounded-[28px] border border-[#cfe1db] bg-[#eaf6f1] px-10 py-9">
        <div>
          <span className="clinic-kicker">Sản phẩm & Dịch vụ</span>
          <h1 className="mt-3 text-[46px] leading-[1.06]">Chăm sóc sức khỏe cho cả người chưa có bệnh</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#526a65]">
            Phần lớn vấn đề sức khỏe được xử lý dễ dàng hơn nhiều nếu phát hiện sớm. Bên cạnh khám chữa bệnh theo triệu chứng,
            Quang Thanh xây dựng các gói theo từng giai đoạn cuộc đời — từ khám tổng quát định kỳ, theo dõi thai kỳ, chăm sóc
            sau sinh cho tới quản lý bệnh mạn tính ở người cao tuổi.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/dat-lich" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white">Đặt lịch tư vấn gói khám <ArrowRight className="h-4 w-4" /></Link>
            <a href={`tel:${CLINIC_INFO.hotline.replace(/\s/g, '')}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]"><PhoneCall className="h-4 w-4" /> {CLINIC_INFO.hotline}</a>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">Lưu ý về chi phí</p>
          <p className="mt-3 text-sm leading-6 text-[#60736f]">
            Khám chuyên khoa ban đầu <strong className="text-[#087f73]">miễn phí 100%</strong>. Chi phí cận lâm sàng và thủ thuật
            được báo trước khi thực hiện; bảng giá chi tiết niêm yết tại quầy tiếp nhận.
          </p>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Chuyển nhanh tới gói dịch vụ">
        {SERVICE_PACKAGES.map((item) => (
          <a key={item.slug} href={`#${item.slug}`} className="rounded-full border border-[#d8e4df] bg-white px-4 py-2 text-xs font-bold text-[#4e625e] hover:border-[#8fc7b9] hover:text-[#075f59]">
            {item.name}
          </a>
        ))}
      </nav>

      <div className="space-y-5">
        {SERVICE_PACKAGES.map((item, index) => (
          <section key={item.slug} id={item.slug} className="grid scroll-mt-28 grid-cols-[1.05fr_.95fr] gap-9 rounded-[24px] border border-[#d8e4df] bg-white p-8 shadow-[0_14px_40px_rgba(27,78,69,.06)]">
            <div>
              <span className="text-xs font-black tracking-[.1em] text-[#87a19b]">GÓI {String(index + 1).padStart(2, '0')}</span>
              <h2 className="mt-2 text-3xl leading-tight">{item.name}</h2>
              <p className="mt-2 text-sm font-bold text-[#087f73]">{item.tagline}</p>
              <p className="mt-5 text-sm leading-7 text-[#526a65]">{item.description}</p>

              <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f2f8f6] px-4 py-2.5 text-xs font-semibold text-[#4e625e]">
                <Users className="h-3.5 w-3.5 text-[#087f73]" /> {item.audience}
              </p>

              <div className="mt-6 flex gap-3">
                <Link
                  href={item.specialtyId ? `/dat-lich?khoa=${item.specialtyId}` : '/dat-lich'}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#087f73] px-5 text-xs font-bold text-white"
                >
                  Đăng ký gói này <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {item.specialtyId ? (
                  <Link href={`/chuyen-khoa#${item.specialtyId}`} className="inline-flex min-h-11 items-center rounded-xl border border-[#dbe6e2] px-5 text-xs font-bold text-[#4e625e]">
                    {specialtyName(item.specialtyId) || 'Xem chuyên khoa'}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-[20px] bg-[#f7fbf9] p-7">
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">Gói bao gồm</p>
              <div className="mt-4 space-y-2.5">
                {item.includes.map((line) => (
                  <p key={line} className="flex gap-2.5 text-sm leading-6 text-[#526a65]">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#33a27e]" />{line}
                  </p>
                ))}
              </div>
              <p className="mt-5 flex items-start gap-2 border-t border-[#e3ece9] pt-4 text-xs leading-6 text-[#879995]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item.note}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section className="flex items-center justify-between rounded-[24px] bg-[#18312d] px-8 py-7 text-white">
        <div>
          <strong className="block text-xl">Chưa chắc nên chọn gói nào?</strong>
          <span className="mt-1 block text-sm text-white/70">Gọi tổng đài hoặc mô tả tình trạng cho trợ lý sức khỏe, chúng tôi sẽ gợi ý gói phù hợp với độ tuổi và tiền sử của bạn.</span>
        </div>
        <div className="flex gap-3">
          <Link href="/tro-ly" className="rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white">Hỏi trợ lý</Link>
          <Link href="/lien-he" className="rounded-xl bg-[#ffdd79] px-6 py-3 text-sm font-extrabold text-[#18312d]">Liên hệ phòng khám</Link>
        </div>
      </section>
    </div>
  );
}
