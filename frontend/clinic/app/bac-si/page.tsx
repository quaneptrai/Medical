import * as React from 'react';
import { DOCTORS } from '@/lib/clinic-data';
import { DoctorCard } from '@/components/clinic/DoctorCard';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Đội ngũ Bác sĩ Chuyên khoa · Phòng khám Đa khoa Quốc tế YG',
  description: 'Danh sách các bác sĩ CKI, CKII, Thạc sĩ, Tiến sĩ tại Phòng khám YG.',
};

export default function DoctorsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block">
          Hội đồng chuyên môn
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 font-heading tracking-tight">
          Đội ngũ Bác sĩ Chuyên khoa
        </h1>
        <p className="text-sm md:text-base text-neutral-600">
          Đội ngũ chuyên gia giàu y đức, tận tâm với người bệnh, có nhiều năm kinh nghiệm lâm sàng tại các bệnh viện đầu ngành.
        </p>

        <div className="inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mt-2">
          <ShieldCheck className="w-4 h-4" />
          <span>100% Bác sĩ có chứng chỉ hành nghề và được thẩm định chuyên môn</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DOCTORS.map((doc) => (
          <DoctorCard key={doc.id} doctor={doc} />
        ))}
      </div>
    </div>
  );
}
