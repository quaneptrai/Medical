import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Award, Building2, CalendarDays, CheckCircle2, ChevronLeft, Clock3, GraduationCap, HeartHandshake, Info, Stethoscope,
} from 'lucide-react';
import { getCatalogDoctor, getCatalogDoctors } from '@/lib/doctor-catalog';
import { BODY_SYSTEMS } from '@/lib/disease-library';

export const dynamic = 'force-dynamic';

export default async function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = getCatalogDoctor(id);
  if (!doctor) notFound();

  const colleagues = getCatalogDoctors().filter((item) => item.specialtyId === doctor.specialtyId && item.id !== doctor.id).slice(0, 3);
  const system = BODY_SYSTEMS.find((item) => item.specialtyId === doctor.specialtyId);

  return (
    <div className="clinic-page space-y-7">
      <Link href="/bac-si" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#526a65]"><ChevronLeft className="h-4 w-4" /> Quay lại đội ngũ bác sĩ</Link>

      <section className="grid grid-cols-[380px_1fr] gap-10 rounded-[28px] border border-[#cfe1db] bg-white p-9 shadow-[0_20px_60px_rgba(27,78,69,.08)]">
        <div className="h-[430px] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#d9efe8] to-[#f4e5bd]">
          {doctor.imageUrl ? (
            <img src={doctor.imageUrl} alt={`Chân dung ${doctor.name}`} className="h-full w-full object-cover object-top" />
          ) : (
            <div className="grid h-full place-items-center">
              <span className="grid h-40 w-40 place-items-center rounded-full border-[6px] border-white/70 bg-white/55 text-5xl font-black text-[#075f59]">
                {doctor.name.split(' ').slice(-2).map((word) => word[0]).join('')}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between py-2">
          <div>
            <Link href={`/chuyen-khoa#${doctor.specialtyId}`} className="clinic-kicker hover:underline">Hồ sơ bác sĩ · {doctor.specialtyName}</Link>
            <h1 className="mt-4 text-[48px] leading-tight">{doctor.name}</h1>
            <p className="mt-2 text-base font-bold text-[#087f73]">{doctor.title}</p>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-[#526a65]">{doctor.bio}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ProfileStat icon={<Clock3 />} value={`${doctor.experienceYears} năm`} label="Kinh nghiệm lâm sàng" />
            <ProfileStat icon={<HeartHandshake />} value="Miễn phí 100%" label="Khám ban đầu" />
            <ProfileStat icon={<CalendarDays />} value={doctor.availableDays.length ? doctor.availableDays[0] : 'Liên hệ'} label="Lịch gần nhất" />
          </div>
          <div className="mt-6 flex gap-3">
            <Link href={`/dat-lich?bacsi=${doctor.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-extrabold text-white">Chọn bác sĩ này và đặt lịch</Link>
            <Link href="/tro-ly" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Chưa chắc đúng khoa? Hỏi trợ lý</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <InfoPanel icon={<GraduationCap />} title="Bằng cấp & chứng chỉ" items={doctor.qualifications.length ? doctor.qualifications : [doctor.education]} />
        <InfoPanel icon={<Award />} title="Hoạt động & thành tích chuyên môn" items={doctor.achievements} />
        <InfoPanel icon={<Building2 />} title="Kinh nghiệm công tác" items={[doctor.hospitalAffiliation, `${doctor.experienceYears} năm thực hành trong lĩnh vực ${doctor.specialtyName}`]} />
        <InfoPanel
          icon={<Stethoscope />}
          title="Lịch tiếp nhận"
          items={[
            `Nhận bệnh vào: ${doctor.availableDays.join(', ') || 'liên hệ tổng đài'}`,
            'Sáng 08:00–12:00 · Chiều 13:00–19:00',
            'Vui lòng tới trước giờ hẹn 15 phút để hoàn tất tiếp nhận.',
          ]}
        />
      </section>

      {colleagues.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl">Bác sĩ khác cùng {doctor.specialtyName}</h2>
            <Link href="/bac-si" className="text-xs font-bold text-[#075f59]">Xem toàn bộ đội ngũ →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {colleagues.map((item) => (
              <Link key={item.id} href={`/bac-si/${item.id}`} className="flex items-center gap-4 rounded-2xl border border-[#dde8e4] bg-white p-4 hover:border-[#8fc7b9]">
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover object-top" /> : <span className="grid h-16 w-16 place-items-center rounded-xl bg-[#dff3ed] font-black text-[#075f59]">{item.name.split(' ').slice(-2).map((word) => word[0]).join('')}</span>}
                <span>
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="mt-1 block text-[11px] text-[#60736f]">{item.title} · {item.experienceYears} năm</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="flex items-start gap-2.5 rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-5 py-3.5 text-xs leading-6 text-[#60736f]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#087f73]" />
        <span>
          Thông tin trên trang nhằm giúp bạn chọn bác sĩ phù hợp, không thay thế cho thăm khám trực tiếp.
          {system ? <> Bạn có thể tham khảo thêm nhóm bệnh lý thuộc <Link href={`/co-the-nguoi/${system.slug}`} className="font-bold text-[#075f59] underline">{system.name}</Link> trước buổi khám.</> : null}
        </span>
      </p>
    </div>
  );
}

function ProfileStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-[#f2f8f6] p-4">
      <span className="mb-3 block h-5 w-5 text-[#087f73]">{icon}</span>
      <strong className="block text-sm">{value}</strong>
      <span className="text-[11px] text-[#60736f]">{label}</span>
    </div>
  );
}

function InfoPanel({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <article className="rounded-[22px] border border-[#d8e4df] bg-white p-7">
      <div className="mb-5 flex items-center gap-3 text-[#075f59]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf6f1]">{icon}</span>
        <h2 className="font-sans text-lg font-bold">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.filter(Boolean).map((item, index) => (
          <p key={index} className="flex gap-2.5 text-sm leading-6 text-[#526a65]">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#33a27e]" />{item}
          </p>
        ))}
      </div>
    </article>
  );
}
