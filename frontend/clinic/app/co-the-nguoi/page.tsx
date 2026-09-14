import Link from 'next/link';
import { Activity, BookOpen, Brain, HeartPulse, MessageSquareText, Search, ShieldCheck } from 'lucide-react';
import { BODY_SYSTEMS, countDiseasesBySystem, getDiseaseLibrary } from '@/lib/disease-library';
import { BodyAtlasExplorer } from '@/components/clinic/BodyAtlasExplorer';

export const metadata = {
  title: 'Cơ thể người · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Tra cứu bệnh lý theo từng cơ quan và hệ cơ quan: dấu hiệu thường gặp, khi nào cần đi khám và khoa nào tiếp nhận.',
};
export const dynamic = 'force-dynamic';

export default function BodyAtlasPage() {
  const counts = countDiseasesBySystem();
  const total = getDiseaseLibrary().length;

  return (
    <div className="clinic-page space-y-9">
      <section className="relative overflow-hidden rounded-[30px] border border-[#cfe1db] bg-[#eaf6f1] px-10 py-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[42px] border-white/35" />
        <div className="relative grid grid-cols-[1.2fr_.8fr] items-end gap-10">
        <div>
          <span className="clinic-kicker">Cẩm nang sức khỏe</span>
          <h1 className="mt-3 max-w-4xl text-[52px] leading-[1.04]">Hiểu cơ thể, nhận ra điều bất thường sớm hơn</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#526a65]">
            Cơ thể hoạt động như một mạng lưới liên kết giữa các hệ cơ quan. Bạn có thể bắt đầu từ vùng đang khó chịu,
            tìm hiểu chức năng của từng hệ, nhận biết dấu hiệu không nên chờ đợi và chọn đúng nơi cần khám.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/tro-ly" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white"><MessageSquareText className="h-4 w-4" /> Mô tả triệu chứng của bạn</Link>
            <Link href="/benh" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]"><Search className="h-4 w-4" /> Tìm theo tên bệnh</Link>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-white p-6">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#087f73]" />
          <span>
            <strong className="block text-3xl leading-tight">{total}</strong>
            <span className="text-xs text-[#60736f]">mục bệnh lý được sắp xếp theo {BODY_SYSTEMS.length} hệ cơ quan</span>
          </span>
        </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4" aria-label="Kiến thức nền tảng về cơ thể">
        <InfoCard icon={<Brain />} title="Hệ cơ quan phối hợp" text="Một triệu chứng có thể liên quan nhiều hệ. Đau đầu, chẳng hạn, không chỉ xuất phát từ thần kinh mà còn có thể liên quan mắt, xoang hoặc huyết áp." />
        <InfoCard icon={<HeartPulse />} title="Dấu hiệu quan trọng hơn tên bệnh" text="Thời điểm khởi phát, mức độ tăng nhanh và triệu chứng đi kèm giúp bác sĩ đánh giá tốt hơn việc tự đoán một tên bệnh." />
        <InfoCard icon={<ShieldCheck />} title="Tra cứu để chuẩn bị đi khám" text="Ghi lại diễn biến, thuốc đang dùng và bệnh nền. Cẩm nang hỗ trợ chuẩn bị thông tin, không thay thế chẩn đoán trực tiếp." />
      </section>

      <BodyAtlasExplorer systems={BODY_SYSTEMS.map((system) => ({ ...system, count: counts[system.slug] || 0 }))} />

      <section className="flex items-center justify-between gap-6 rounded-[24px] bg-[#18312d] px-8 py-7 text-white">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10"><Activity className="h-5 w-5" /></span>
          <div><strong className="block text-lg">Không biết nên bắt đầu từ hệ nào?</strong><span className="mt-1 block text-sm text-white/70">Hãy mô tả điều bạn cảm thấy bằng ngôn ngữ tự nhiên, trợ lý sẽ giúp sắp xếp thông tin ban đầu.</span></div>
        </div>
        <Link href="/tro-ly" className="shrink-0 rounded-xl bg-[#ffdd79] px-6 py-3 text-sm font-extrabold text-[#18312d]">Mở trợ lý sức khỏe</Link>
      </section>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-[22px] border border-[#d8e4df] bg-white p-6">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf6f1] text-[#087f73]">{icon}</span>
      <h2 className="mt-4 font-sans text-base font-bold">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-[#60736f]">{text}</p>
    </article>
  );
}
