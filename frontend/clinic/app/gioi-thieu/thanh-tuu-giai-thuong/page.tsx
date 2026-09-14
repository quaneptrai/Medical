import Link from 'next/link';
import { ArrowRight, BadgeCheck, ChevronLeft, Info } from 'lucide-react';
import { ACCREDITATIONS, MILESTONES } from '@/lib/about-data';
import { CLINIC_INFO } from '@/lib/clinic-data';

export const metadata = {
  title: 'Thành tựu & Giải thưởng · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Giấy phép hoạt động, chuẩn chuyên môn đang tuân thủ và các dấu mốc phát triển của Phòng khám Quang Thanh.',
};

export default function AchievementsPage() {
  return (
    <div className="clinic-page space-y-9">
      <Link href="/gioi-thieu" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#526a65]"><ChevronLeft className="h-4 w-4" /> Về Quang Thanh</Link>

      <section className="rounded-[30px] border border-[#cfe1db] bg-[#eaf6f1] p-10">
        <span className="clinic-kicker">Thành tựu và giải thưởng</span>
        <h1 className="mt-4 max-w-4xl text-[50px] leading-[1.06]">Những gì chúng tôi cam kết đều có thể kiểm chứng</h1>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-[#526a65]">
          Phòng khám không theo đuổi danh hiệu. Điều chúng tôi công bố ở đây là giấy phép đang có hiệu lực, các chuẩn chuyên môn
          đang tuân thủ và những việc đã thực sự hoàn thành theo từng năm — để người bệnh có thể đối chiếu trước khi chọn nơi khám.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#075f59]">
          <BadgeCheck className="h-4 w-4" /> {CLINIC_INFO.license}
        </p>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <span className="clinic-kicker">Chuẩn chuyên môn</span>
            <h2 className="mt-2 text-3xl">Giấy phép và chuẩn đang tuân thủ</h2>
          </div>
        </div>
        <div className="space-y-4">
          {ACCREDITATIONS.map((item) => (
            <article key={item.code} className="grid grid-cols-[190px_1fr] gap-8 rounded-[22px] border border-[#d8e4df] bg-white p-7">
              <div className="flex flex-col items-center justify-center rounded-[18px] bg-[#eaf6f1] p-6 text-center">
                <strong className="text-2xl tracking-[.04em] text-[#075f59]">{item.code}</strong>
                <span className="mt-2 text-[11px] leading-4 text-[#60736f]">{item.issuer}</span>
              </div>
              <div>
                <h3 className="font-sans text-lg font-bold">{item.name}</h3>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-[#526a65]">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6">
          <span className="clinic-kicker">Dấu mốc</span>
          <h2 className="mt-2 text-3xl">Chặng đường từ 2008 tới nay</h2>
        </div>
        <ol className="relative space-y-6 border-l border-[#d8e4df] pl-10">
          {MILESTONES.map((milestone) => (
            <li key={milestone.year} className="relative">
              <span className="absolute -left-[46px] grid h-8 w-8 place-items-center rounded-full border-4 border-[#eaf6f1] bg-[#087f73] text-[10px] font-black text-white" aria-hidden="true" />
              <div className="rounded-[20px] border border-[#d8e4df] bg-white p-6">
                <span className="text-xs font-black tracking-[.1em] text-[#087f73]">{milestone.year}</span>
                <h3 className="mt-2 font-sans text-lg font-bold">{milestone.title}</h3>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-[#60736f]">{milestone.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="flex items-start gap-2.5 rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-5 py-3.5 text-xs leading-6 text-[#60736f]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#087f73]" />
        Bản sao giấy phép hoạt động và chứng chỉ hành nghề của bác sĩ được niêm yết tại quầy tiếp nhận. Người bệnh có thể yêu cầu xem bất cứ lúc nào.
      </p>

      <section className="flex items-center justify-between rounded-[24px] bg-[#18312d] px-8 py-7 text-white">
        <div>
          <strong className="block text-xl">Sẵn sàng đặt lịch khám?</strong>
          <span className="mt-1 block text-sm text-white/70">Khám ban đầu miễn phí 100% · Hotline {CLINIC_INFO.hotline}</span>
        </div>
        <Link href="/dat-lich" className="inline-flex items-center gap-2 rounded-xl bg-[#ffdd79] px-6 py-3 text-sm font-extrabold text-[#18312d]">Đặt lịch ngay <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
