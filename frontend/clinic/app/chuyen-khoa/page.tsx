import * as React from 'react';
import Link from 'next/link';
import { SPECIALTIES } from '@/lib/clinic-data';
import {
  Wind,
  Activity,
  Sparkles,
  Shield,
  Ear,
  Brain,
  ArrowRight,
  UserCheck,
  Stethoscope,
} from 'lucide-react';

export const metadata = {
  title: 'Danh mục Chuyên khoa · Phòng khám Đa khoa Quốc tế YG',
  description: 'Các chuyên khoa sâu tại Phòng khám YG: Hô hấp, Tiêu hóa, Da liễu, Cơ xương khớp, Tai Mũi Họng, Thần kinh.',
};

export default function SpecialtiesPage() {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wind':
        return <Wind className="w-6 h-6" />;
      case 'Activity':
        return <Activity className="w-6 h-6" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6" />;
      case 'Shield':
        return <Shield className="w-6 h-6" />;
      case 'Ear':
        return <Ear className="w-6 h-6" />;
      case 'Brain':
        return <Brain className="w-6 h-6" />;
      default:
        return <Stethoscope className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block">
          Hệ thống 6 Chuyên khoa
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 font-heading tracking-tight">
          Danh mục chuyên khoa lâm sàng
        </h1>
        <p className="text-sm md:text-base text-neutral-600">
          Trang thiết bị chẩn đoán hiện đại, phác đồ điều trị chuẩn mực y tế ban đầu và đội ngũ bác sĩ chuyên sâu từng khoa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SPECIALTIES.map((spec) => (
          <article
            key={spec.id}
            className="bg-neutral-0 border border-neutral-200 rounded-xl p-6 shadow-xs hover:border-brand-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-lg border border-brand-200 shrink-0">
                  {getIcon(spec.iconName)}
                </div>
                <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded">
                  {spec.diseasesCovered} bệnh lý
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-neutral-900 font-heading">
                  {spec.name}
                </h2>
                <p className="text-xs text-brand-700 font-medium">
                  Chuyên khoa: {spec.category.toUpperCase()}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                {spec.fullDesc}
              </p>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <p className="text-xs font-bold text-neutral-700">Triệu chứng hay gặp:</p>
                <div className="flex flex-wrap gap-1.5">
                  {spec.commonSymptoms.map((sym, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-neutral-50 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <UserCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Trưởng khoa: <strong>{spec.chiefDoctor}</strong></span>
              </div>
              <Link
                href={`/dat-lich?khoa=${spec.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-md shadow-xs transition-colors"
              >
                <span>Đặt lịch khám khoa {spec.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
