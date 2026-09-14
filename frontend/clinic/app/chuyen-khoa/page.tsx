import Link from 'next/link';
import { ArrowRight, BookOpen, MessageSquareText, Stethoscope, UsersRound } from 'lucide-react';
import { getCatalogDoctors, getCatalogSpecialties } from '@/lib/doctor-catalog';
import { BODY_SYSTEMS, countDiseasesBySystem } from '@/lib/disease-library';

export const metadata = {
  title: 'Chuyên khoa khám chữa bệnh · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Phạm vi tiếp nhận, triệu chứng thường gặp và đội ngũ bác sĩ của từng chuyên khoa tại Phòng khám Quang Thanh.',
};
export const dynamic = 'force-dynamic';

export default function SpecialtiesPage() {
  const specialties = getCatalogSpecialties();
  const doctors = getCatalogDoctors();
  const diseaseCounts = countDiseasesBySystem();

  return (
    <div className="clinic-page space-y-10">
      <section className="grid grid-cols-[1.25fr_.75fr] items-end gap-10 rounded-[28px] border border-[#cfe1db] bg-[#eaf6f1] px-10 py-9">
        <div>
          <span className="clinic-kicker">Chuyên khoa khám chữa bệnh</span>
          <h1 className="mt-3 text-[46px] leading-[1.06]">Vào đúng khoa ngay từ lần khám đầu tiên</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#526a65]">
            Phần lớn người bệnh đến phòng khám với một triệu chứng chứ không phải một chẩn đoán. Mỗi khoa dưới đây ghi rõ
            những dấu hiệu mà khoa đó tiếp nhận và ai là người sẽ khám cho bạn — nếu vẫn phân vân, trợ lý sức khỏe sẽ
            gợi ý khoa phù hợp trước khi bạn đặt lịch.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/tro-ly" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white"><MessageSquareText className="h-4 w-4" /> Mô tả triệu chứng để được gợi ý khoa</Link>
            <Link href="/co-the-nguoi" className="inline-flex min-h-12 items-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Tra cứu theo cơ quan</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-5"><strong className="block text-3xl text-[#087f73]">{specialties.length}</strong><span className="text-xs text-[#60736f]">Chuyên khoa</span></div>
          <div className="rounded-2xl bg-white p-5"><strong className="block text-3xl text-[#087f73]">{doctors.length}</strong><span className="text-xs text-[#60736f]">Bác sĩ tiếp nhận</span></div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Chuyển nhanh tới chuyên khoa">
        {specialties.map((specialty) => (
          <a key={specialty.id} href={`#${specialty.id}`} className="rounded-full border border-[#d8e4df] bg-white px-4 py-2 text-xs font-bold text-[#4e625e] hover:border-[#8fc7b9] hover:text-[#075f59]">
            {specialty.name.replace(/^Khoa\s+/, '')}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {specialties.map((specialty, index) => {
          const team = doctors.filter((doctor) => doctor.specialtyId === specialty.id);
          const system = BODY_SYSTEMS.find((item) => item.specialtyId === specialty.id);
          return (
            <section key={specialty.id} id={specialty.id} className="grid scroll-mt-28 grid-cols-[.72fr_1.28fr] gap-8 rounded-[24px] border border-[#d8e4df] bg-white p-7 shadow-[0_14px_40px_rgba(27,78,69,.06)]">
              <div className="flex flex-col justify-between">
                <div>
                  <span className="flex items-center gap-2 text-xs font-bold text-[#087f73]"><Stethoscope className="h-4 w-4" /> Khoa {String(index + 1).padStart(2, '0')}</span>
                  <h2 className="mt-3 text-3xl">{specialty.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#60736f]">{specialty.shortDesc}</p>
                  {specialty.fullDesc ? <p className="mt-2 text-sm leading-6 text-[#879995]">{specialty.fullDesc}</p> : null}

                  {specialty.commonSymptoms.length ? (
                    <div className="mt-5">
                      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">Thường gặp tại khoa</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {specialty.commonSymptoms.map((symptom) => (
                          <span key={symptom} className="rounded-lg bg-[#f2f8f6] px-2.5 py-1 text-[11px] text-[#4e625e]">{symptom}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {system ? (
                    <Link href={`/co-the-nguoi/${system.slug}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#075f59]">
                      <BookOpen className="h-3.5 w-3.5" /> {diseaseCounts[system.slug] || 0} bệnh lý liên quan trong cẩm nang
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#e3ece9] pt-4">
                  <span className="flex items-center gap-2 text-xs text-[#60736f]"><UsersRound className="h-4 w-4 text-[#087f73]" /> {team.length} bác sĩ đang tiếp nhận</span>
                  <Link href={`/dat-lich?khoa=${specialty.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075f59]">Đặt lịch khoa này <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {team.map((doctor) => (
                  <Link key={doctor.id} href={`/bac-si/${doctor.id}`} className="group flex min-h-[118px] gap-3 rounded-2xl border border-[#e0e9e5] bg-[#fbfdfc] p-4 hover:border-[#8fc7b9]">
                    {doctor.imageUrl
                      ? <img src={doctor.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover object-top" />
                      : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#dff3ed] text-sm font-black text-[#075f59]">{doctor.name.split(' ').slice(-2).map((word) => word[0]).join('')}</span>}
                    <span>
                      <strong className="block text-sm text-[#18312d] group-hover:text-[#087f73]">{doctor.name}</strong>
                      <span className="mt-1 block text-[11px] text-[#60736f]">{doctor.title} · {doctor.experienceYears} năm</span>
                      <span className="mt-2 block text-[11px] font-bold text-[#087f73]">Khám ban đầu miễn phí</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
