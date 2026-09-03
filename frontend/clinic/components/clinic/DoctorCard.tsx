import * as React from 'react';
import Link from 'next/link';
import { UserCheck, Award, Calendar, ArrowRight, Building } from 'lucide-react';
import { Doctor } from '@/lib/clinic-data';
import { cn } from '@/lib/utils';

export function DoctorCard({ doctor, className }: { doctor: Doctor; className?: string }) {
  return (
    <article
      className={cn(
        'rounded-xl border border-neutral-200 bg-neutral-0 p-5 shadow-xs hover:border-brand-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4',
        className
      )}
    >
      <div className="space-y-3">
        {/* Doctor header & title */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base shrink-0 border border-brand-200">
            <UserCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
            {doctor.experienceYears} năm KN
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-neutral-900 font-heading leading-tight">
            {doctor.name}
          </h3>
          <p className="text-xs font-semibold text-brand-600 mt-0.5">
            {doctor.title}
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-neutral-600">
          <p className="flex items-start gap-1.5">
            <Award className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
            <span>{doctor.education}</span>
          </p>
          <p className="flex items-start gap-1.5">
            <Building className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span>{doctor.hospitalAffiliation}</span>
          </p>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
          {doctor.bio}
        </p>
      </div>

      <div className="pt-3 border-t border-neutral-100 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Lịch khám: {doctor.availableDays.join(', ')}</span>
        </div>

        <Link
          href={`/dat-lich?bacsi=${doctor.id}`}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-100 hover:bg-brand-50 text-neutral-800 hover:text-brand-700 text-xs font-semibold rounded-md border border-neutral-200 transition-colors"
        >
          <span>Đặt lịch với bác sĩ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
