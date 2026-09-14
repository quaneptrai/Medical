import Link from 'next/link';
import { ArrowRight, ChevronLeft, Compass, Quote, Target } from 'lucide-react';
import { CAPACITY, CORE_VALUES, VISION } from '@/lib/about-data';

export const metadata = {
  title: 'Tầm nhìn & Sứ mệnh · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Định hướng phát triển, sứ mệnh và bốn giá trị cốt lõi của Phòng khám Đa khoa Quốc tế Quang Thanh.',
};

export default function VisionMissionPage() {
  return (
    <div className="clinic-page space-y-9">
      <Link href="/gioi-thieu" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#526a65]"><ChevronLeft className="h-4 w-4" /> Về Quang Thanh</Link>

      <section className="rounded-[30px] border border-[#cfe1db] bg-[#eaf6f1] p-10">
        <span className="clinic-kicker">Giới thiệu chung</span>
        <h1 className="mt-4 max-w-4xl text-[50px] leading-[1.06]">Tầm nhìn & Sứ mệnh</h1>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-[#526a65]">{VISION.intro}</p>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <article className="rounded-[26px] border border-[#d8e4df] bg-white p-9">
          <div className="flex items-center gap-3 text-[#075f59]">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf6f1]"><Compass className="h-5 w-5" /></span>
            <h2 className="font-sans text-lg font-bold">Tầm nhìn</h2>
          </div>
          <p className="mt-5 text-lg leading-8 text-[#2c4440]">{VISION.vision}</p>
        </article>

        <article className="rounded-[26px] border border-[#18312d] bg-[#18312d] p-9 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Target className="h-5 w-5" /></span>
            <h2 className="font-sans text-lg font-bold text-white">Sứ mệnh</h2>
          </div>
          <p className="mt-5 flex gap-3 text-2xl font-bold leading-relaxed">
            <Quote className="mt-1.5 h-6 w-6 shrink-0 text-[#ffdd79]" />
            {VISION.mission}
          </p>
          <p className="mt-5 text-sm leading-7 text-white/75">{VISION.missionDetail}</p>
        </article>
      </section>

      <section className="rounded-[26px] border border-[#d8e4df] bg-white p-9">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <span className="clinic-kicker">Giá trị cốt lõi</span>
            <h2 className="mt-2 text-3xl">T.Â.M.C — bốn điều không thỏa hiệp</h2>
          </div>
          <p className="max-w-md text-xs leading-6 text-[#879995]">
            Bốn giá trị này được dùng làm tiêu chí trong sinh hoạt chuyên môn hằng tuần và trong phản hồi của người bệnh sau mỗi lần khám.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {CORE_VALUES.map((value) => (
            <article key={value.name} className="rounded-[20px] bg-[#f7fbf9] p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#087f73] text-lg font-black text-white">{value.key}</span>
              <h3 className="mt-5 font-sans text-lg font-bold">{value.name}</h3>
              <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#879995]">{value.en}</p>
              <p className="mt-3 text-sm leading-6 text-[#60736f]">{value.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-[#cfe1db] bg-[#eaf6f1] p-9">
        <span className="clinic-kicker">Quy mô hiện tại</span>
        <h2 className="mt-2 text-3xl">Phòng khám đang vận hành với</h2>
        <div className="mt-7 grid grid-cols-6 gap-4">
          {CAPACITY.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-5 text-center">
              <strong className="block text-3xl text-[#087f73]">{item.value}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-[#60736f]">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between rounded-[24px] border border-[#d8e4df] bg-white px-8 py-7">
        <div>
          <strong className="block text-xl">Muốn biết chúng tôi đã đi được tới đâu?</strong>
          <span className="mt-1 block text-sm text-[#60736f]">Xem các chuẩn chuyên môn đang tuân thủ và dấu mốc từng năm.</span>
        </div>
        <Link href="/gioi-thieu/thanh-tuu-giai-thuong" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white">Thành tựu & Giải thưởng <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
