import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ChevronLeft, Info, PhoneCall, ShieldAlert, Stethoscope } from 'lucide-react';
import { BODY_SYSTEMS, SYSTEM_BY_SLUG, getDiseasesBySystem } from '@/lib/disease-library';
import { getCatalogDoctors, getCatalogSpecialties } from '@/lib/doctor-catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = SYSTEM_BY_SLUG.get(slug);
  if (!system) return { title: 'Không tìm thấy hệ cơ quan · Phòng khám Quang Thanh' };
  return { title: `${system.name} · Cơ thể người · Phòng khám Quang Thanh`, description: system.description.slice(0, 180) };
}

export default async function BodySystemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = SYSTEM_BY_SLUG.get(slug);
  if (!system) notFound();

  const diseases = getDiseasesBySystem(slug);
  const specialty = system.specialtyId ? getCatalogSpecialties().find((item) => item.id === system.specialtyId) : undefined;
  const doctors = specialty ? getCatalogDoctors().filter((doctor) => doctor.specialtyId === specialty.id) : [];
  const neighbours = BODY_SYSTEMS.filter((item) => item.region === system.region && item.slug !== system.slug);

  return (
    <div className="clinic-page space-y-7">
      <nav className="flex items-center gap-2 text-xs text-[#879995]">
        <Link href="/co-the-nguoi" className="inline-flex items-center gap-1.5 font-bold text-[#526a65]"><ChevronLeft className="h-4 w-4" /> Cơ thể người</Link>
        <span>·</span><span>{system.region}</span>
      </nav>

      <section className="grid grid-cols-[1.25fr_.75fr] gap-10 rounded-[28px] border border-[#cfe1db] bg-[#eaf6f1] px-10 py-9">
        <div>
          <span className="clinic-kicker">{system.tagline}</span>
          <h1 className="mt-3 text-[46px] leading-[1.06]">{system.name}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#526a65]">{system.description}</p>
          <div className="mt-6 flex gap-3">
            <Link href={specialty ? `/dat-lich?khoa=${specialty.id}` : '/dat-lich'} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white"><Stethoscope className="h-4 w-4" /> Đặt lịch khám</Link>
            <Link href="/tro-ly" className="inline-flex min-h-12 items-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Mô tả triệu chứng cho trợ lý</Link>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6">
          <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">Các cơ quan thuộc hệ này</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {system.organs.map((organ) => (
              <span key={organ} className="rounded-lg bg-[#f2f8f6] px-2.5 py-1.5 text-xs text-[#4e625e]">{organ}</span>
            ))}
          </div>
          <p className="mt-6 border-t border-[#e3ece9] pt-4 text-xs text-[#60736f]">
            <strong className="text-2xl text-[#087f73]">{diseases.length}</strong> mục bệnh lý đang được theo dõi trong cẩm nang.
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#eecfc8] bg-[#fff3ef] p-7">
        <div className="mb-4 flex items-center gap-3 text-[#a4262c]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white"><ShieldAlert className="h-5 w-5" /></span>
          <h2 className="font-sans text-lg font-bold">Dấu hiệu không nên chờ đợi</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {system.watchFor.map((item) => (
            <p key={item} className="flex gap-2.5 text-sm leading-6 text-[#7b3a34]"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" />{item}</p>
          ))}
        </div>
        <a href="tel:115" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#a4262c] px-5 text-xs font-extrabold text-white"><PhoneCall className="h-4 w-4" /> Gọi cấp cứu 115</a>
      </section>

      {specialty ? (
        <section className="rounded-[24px] border border-[#d8e4df] bg-white p-7">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <span className="clinic-kicker">Khoa tiếp nhận</span>
              <h2 className="mt-2 text-2xl">{specialty.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#60736f]">{specialty.shortDesc}</p>
            </div>
            <Link href={`/chuyen-khoa#${specialty.id}`} className="text-xs font-bold text-[#075f59]">Xem chi tiết khoa →</Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {doctors.map((doctor) => (
              <Link key={doctor.id} href={`/bac-si/${doctor.id}`} className="flex items-center gap-3 rounded-2xl border border-[#e0e9e5] bg-[#fbfdfc] p-3.5 hover:border-[#8fc7b9]">
                {doctor.imageUrl ? <img src={doctor.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover object-top" /> : null}
                <span>
                  <strong className="block text-xs leading-snug">{doctor.name}</strong>
                  <span className="mt-1 block text-[11px] text-[#879995]">{doctor.title} · {doctor.experienceYears} năm</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl">Bệnh lý thuộc {system.name.toLowerCase()}</h2>
          <Link href="/benh" className="text-xs font-bold text-[#075f59]">Tìm kiếm trong toàn bộ thư viện →</Link>
        </div>
        {diseases.length ? (
          <div className="grid grid-cols-3 gap-3">
            {diseases.map((disease) => (
              <Link key={disease.slug} href={`/benh/${disease.slug}`} className="group rounded-xl border border-[#e0e9e5] bg-white px-4 py-3.5 transition-colors hover:border-[#8fc7b9] hover:bg-[#fbfdfc]">
                <strong className="block text-sm leading-snug text-[#18312d] group-hover:text-[#087f73]">{disease.name}</strong>
                {disease.symptoms.common.length ? (
                  <span className="mt-1.5 block truncate text-[11px] text-[#879995]">{disease.symptoms.common.slice(0, 3).join(' · ')}</span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#c7ded7] bg-[#f7fbf9] p-10 text-center text-sm text-[#60736f]">Chưa có mục bệnh lý nào được gắn vào hệ cơ quan này.</p>
        )}
      </section>

      {neighbours.length ? (
        <section>
          <h2 className="mb-3 text-lg font-bold">Cùng nhóm {system.region.toLowerCase()}</h2>
          <div className="flex flex-wrap gap-2">
            {neighbours.map((item) => (
              <Link key={item.slug} href={`/co-the-nguoi/${item.slug}`} className="rounded-full border border-[#d8e4df] bg-white px-4 py-2 text-xs font-bold text-[#4e625e] hover:border-[#8fc7b9] hover:text-[#075f59]">
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="flex items-start gap-2.5 rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-5 py-3.5 text-xs leading-6 text-[#60736f]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#087f73]" />
        Trang tra cứu này giúp bạn chuẩn bị trước buổi khám. Chẩn đoán cuối cùng luôn thuộc về bác sĩ sau khi thăm khám trực tiếp và làm cận lâm sàng cần thiết.
      </p>
    </div>
  );
}
