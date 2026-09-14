import Link from 'next/link';
import { ArrowRight, BadgeCheck, HeartHandshake, Stethoscope } from 'lucide-react';
import { getCatalogDoctors, getCatalogSpecialties } from '@/lib/doctor-catalog';
import { DoctorDirectory } from '@/components/clinic/DoctorDirectory';

export const metadata = {
  title: 'Đội ngũ bác sĩ · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Hồ sơ bác sĩ CKI, CKII, Thạc sĩ, Tiến sĩ đang tiếp nhận tại Phòng khám Quang Thanh — xem chuyên môn, lịch khám và đặt hẹn trực tiếp.',
};

export const dynamic = 'force-dynamic';

export default function DoctorsPage() {
  const doctors = getCatalogDoctors();
  const specialties = getCatalogSpecialties();
  const seniors = doctors.filter((doctor) => doctor.experienceYears >= 15).length;

  return (
    <div className="clinic-page space-y-9">
      <section className="grid grid-cols-[1.2fr_.8fr] items-end gap-10 rounded-[28px] border border-[#cfe1db] bg-[#eaf6f1] px-10 py-9">
        <div>
          <span className="clinic-kicker">Chuyên gia y tế</span>
          <h1 className="mt-3 text-[46px] leading-[1.06]">Người sẽ ngồi đối diện bạn trong phòng khám</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#526a65]">
            Mỗi hồ sơ dưới đây cho biết bác sĩ được đào tạo ở đâu, đang theo đuổi thế mạnh nào và nhận bệnh vào những ngày nào —
            đủ để bạn chọn đúng người trước khi bấm đặt lịch, thay vì tới nơi rồi mới biết.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/dat-lich" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white">Đặt lịch khám <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/chuyen-khoa" className="inline-flex min-h-12 items-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Xem theo chuyên khoa</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Stethoscope className="h-5 w-5" />} value={String(doctors.length)} label="Bác sĩ đang tiếp nhận" />
          <Stat icon={<BadgeCheck className="h-5 w-5" />} value={String(specialties.length)} label="Chuyên khoa" />
          <Stat icon={<HeartHandshake className="h-5 w-5" />} value={String(seniors)} label="Bác sĩ trên 15 năm nghề" />
          <Stat icon={<BadgeCheck className="h-5 w-5" />} value="100%" label="Có chứng chỉ hành nghề" />
        </div>
      </section>

      <DoctorDirectory doctors={doctors} specialties={specialties} />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-5">
      <span className="text-[#087f73]">{icon}</span>
      <strong className="mt-5 block text-3xl">{value}</strong>
      <span className="text-xs text-[#60736f]">{label}</span>
    </div>
  );
}
