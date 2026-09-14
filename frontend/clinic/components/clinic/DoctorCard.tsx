import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, GraduationCap } from 'lucide-react';
import { CatalogDoctor } from '@/lib/doctor-catalog';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name.split(' ').slice(-2).map((word) => word[0]).join('');
}

export function DoctorCard({ doctor, className }: { doctor: CatalogDoctor; className?: string }) {
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-[22px] border border-[#dde8e4] bg-white transition-all duration-200 hover:border-[#8fc7b9] hover:shadow-[0_18px_44px_rgba(27,78,69,.12)]',
        className,
      )}
    >
      <Link href={`/bac-si/${doctor.id}`} className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#d9efe8] to-[#f4e5bd]">
        {doctor.imageUrl ? (
          <img src={doctor.imageUrl} alt={`Chân dung ${doctor.name}`} className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="grid h-full place-items-center text-4xl font-black text-[#075f59]">{initials(doctor.name)}</span>
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#075f59] shadow-sm">
          {doctor.specialtyName}
        </span>
        <span className="absolute bottom-0 left-0 right-0 bg-[linear-gradient(to_top,rgba(8,33,30,.93),rgba(8,33,30,.55)_58%,transparent)] px-4 pb-3 pt-12">
          <strong className="block text-[15px] leading-snug text-white">{doctor.name}</strong>
          <span className="mt-0.5 block text-[11px] font-semibold text-[#bfe8dd]">{doctor.title} · {doctor.experienceYears} năm kinh nghiệm</span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5 text-xs text-[#60736f]">
          <p className="flex items-start gap-2"><GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087f73]" /><span>{doctor.education}</span></p>
          <p className="flex items-start gap-2"><Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9fb2ad]" /><span>{doctor.hospitalAffiliation}</span></p>
          <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9fb2ad]" /><span>{doctor.availableDays.length ? doctor.availableDays.join(' · ') : 'Liên hệ tổng đài để biết lịch khám'}</span></p>
        </div>

        <p className="line-clamp-2 text-xs leading-5 text-[#7b8c88]">{doctor.bio}</p>

        <div className="mt-auto flex items-center justify-between border-t border-[#edf3f1] pt-3">
          <span className="text-[11px] font-bold text-[#075f59]">Khám ban đầu miễn phí</span>
          <div className="flex gap-2">
            <Link href={`/bac-si/${doctor.id}`} className="rounded-lg border border-[#dbe6e2] px-3 py-1.5 text-[11px] font-bold text-[#4e625e] hover:border-[#8fc7b9]">Hồ sơ</Link>
            <Link href={`/dat-lich?bacsi=${doctor.id}`} className="flex items-center gap-1 rounded-lg bg-[#087f73] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#075f59]">Đặt lịch <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </div>
      </div>
    </article>
  );
}
