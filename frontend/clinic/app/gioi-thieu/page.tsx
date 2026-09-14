import Link from 'next/link';
import {
  ArrowRight, Award, BookOpen, Building2, Clock3, Compass, HeartHandshake, PackageCheck, Stethoscope, UsersRound,
} from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';
import { getCatalogDoctors, getCatalogSpecialties } from '@/lib/doctor-catalog';
import { getDiseaseLibrary } from '@/lib/disease-library';
import { CORE_VALUES, VISION } from '@/lib/about-data';
import { DoctorCard } from '@/components/clinic/DoctorCard';

export const metadata = {
  title: 'Giới thiệu · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Câu chuyện, định hướng và cách làm việc của Phòng khám Đa khoa Quốc tế Quang Thanh tại An Lão, Hải Phòng.',
};
export const dynamic = 'force-dynamic';

export default function AboutPage() {
  const specialties = getCatalogSpecialties();
  const doctors = getCatalogDoctors();
  const featured = doctors.filter((doctor) => doctor.experienceYears >= 18).slice(0, 4);
  const library = getDiseaseLibrary();

  return (
    <div className="clinic-page space-y-12">
      <section className="grid grid-cols-[1.1fr_.9fr] gap-10 rounded-[30px] border border-[#cfe1db] bg-[#eaf6f1] p-10">
        <div>
          <span className="clinic-kicker">Về Quang Thanh</span>
          <h1 className="mt-4 text-[52px] leading-[1.04]">Một phòng khám gần nhà, nói bằng ngôn ngữ dễ hiểu</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#526a65]">{VISION.intro}</p>
          <div className="mt-7 flex gap-3">
            <Link href="/bac-si" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white">Xem đội ngũ bác sĩ <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/lien-he" className="inline-flex min-h-12 items-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Thông tin liên hệ</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <AboutStat icon={<Stethoscope />} value={specialties.length} label="Chuyên khoa" />
          <AboutStat icon={<UsersRound />} value={doctors.length} label="Bác sĩ tiếp nhận" />
          <AboutStat icon={<Clock3 />} value="08–19h" label="Mỗi ngày, 7/7" />
          <AboutStat icon={<Building2 />} value="An Lão" label="Hải Phòng" />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-5">
        <NavCard
          href="/gioi-thieu/tam-nhin-su-menh"
          icon={<Compass />}
          title="Tầm nhìn & Sứ mệnh"
          text="Chúng tôi muốn phòng khám trở thành nơi nào trong đời sống của người dân An Lão, và bốn giá trị chi phối cách làm việc hằng ngày."
        />
        <NavCard
          href="/gioi-thieu/thanh-tuu-giai-thuong"
          icon={<Award />}
          title="Thành tựu & Giải thưởng"
          text="Giấy phép, chuẩn chuyên môn đang tuân thủ và những dấu mốc phòng khám đã đi qua kể từ năm 2008."
        />
        <NavCard
          href="/dich-vu"
          icon={<PackageCheck />}
          title="Sản phẩm & Dịch vụ"
          text="Các gói khám tổng quát, tầm soát chuyên sâu, theo dõi thai kỳ và chăm sóc người cao tuổi đang triển khai."
        />
      </section>

      <section className="rounded-[26px] border border-[#d8e4df] bg-white p-9">
        <div className="grid grid-cols-[.85fr_1.15fr] gap-10">
          <div>
            <span className="clinic-kicker">Sứ mệnh</span>
            <h2 className="mt-3 text-4xl leading-tight">{VISION.mission}</h2>
            <Link href="/gioi-thieu/tam-nhin-su-menh" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#075f59]">Đọc đầy đủ tầm nhìn & sứ mệnh <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {CORE_VALUES.map((value) => (
              <article key={value.name} className="rounded-2xl bg-[#f7fbf9] p-5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#087f73] text-sm font-black text-white">{value.key}</span>
                <h3 className="mt-4 font-sans text-base font-bold">{value.name}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#60736f]">{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-5">
        <Value
          icon={<HeartHandshake />}
          title="Tôn trọng người bệnh"
          text="Giải thích rõ ràng và dành thời gian để người bệnh hiểu bước tiếp theo, thay vì chỉ đưa một tờ đơn thuốc."
        />
        <Value
          icon={<BookOpen />}
          title="Thông tin có thể tra cứu"
          text={`Toàn bộ ${library.length} mục bệnh lý mà hệ thống dùng để định hướng chuyên khoa đều công khai trong cẩm nang sức khỏe.`}
        />
        <Value
          icon={<Stethoscope />}
          title="Đúng chuyên khoa ngay từ đầu"
          text="Triệu chứng ban đầu được định hướng tới một bác sĩ phù hợp, thay vì phải đi vòng qua nhiều nơi."
        />
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="clinic-kicker">Gặp gỡ đội ngũ</span>
            <h2 className="mt-2 text-4xl">Những bác sĩ nhiều năm nghề nhất</h2>
          </div>
          <Link href="/bac-si" className="text-sm font-bold text-[#075f59]">Xem toàn bộ {doctors.length} bác sĩ →</Link>
        </div>
        <div className="grid grid-cols-4 gap-5">{featured.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />)}</div>
      </section>

      <section className="flex items-center justify-between rounded-[24px] bg-[#18312d] px-8 py-7 text-white">
        <div>
          <strong className="block text-xl">Giờ khám: Thứ Hai — Chủ nhật</strong>
          <span className="mt-1 block text-sm text-white/70">Sáng 08:00–12:00 · Chiều 13:00–19:00 · Hotline {CLINIC_INFO.hotline}</span>
        </div>
        <Link href="/dat-lich" className="rounded-xl bg-[#ffdd79] px-6 py-3 text-sm font-extrabold text-[#18312d]">Đặt lịch khám</Link>
      </section>
    </div>
  );
}

function AboutStat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-6">
      <span className="text-[#087f73]">{icon}</span>
      <strong className="mt-6 block text-3xl">{value}</strong>
      <span className="text-xs text-[#60736f]">{label}</span>
    </div>
  );
}

function NavCard({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="group rounded-[22px] border border-[#d8e4df] bg-white p-7 transition-all hover:border-[#8fc7b9] hover:shadow-[0_16px_40px_rgba(27,78,69,.09)]">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf6f1] text-[#087f73]">{icon}</span>
      <h2 className="mt-5 font-sans text-lg font-bold group-hover:text-[#087f73]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#60736f]">{text}</p>
      <span className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#075f59]">Xem trang <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

function Value({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-[22px] border border-[#d8e4df] bg-white p-7">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf6f1] text-[#087f73]">{icon}</span>
      <h2 className="mt-5 font-sans text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#60736f]">{text}</p>
    </article>
  );
}
