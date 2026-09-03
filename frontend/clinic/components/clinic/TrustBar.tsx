import * as React from 'react';
import { CLINIC_INFO } from '@/lib/clinic-data';
import { cn } from '@/lib/utils';

export function TrustBar({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'w-full py-10 bg-neutral-50/80 border-y border-neutral-200 transition-colors',
        className
      )}
      aria-label="Các chỉ số uy tín của phòng khám"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {CLINIC_INFO.stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center md:items-start text-center md:text-left space-y-1 p-2"
            >
              <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-700 tracking-tight font-heading">
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm font-bold text-neutral-800">
                {stat.label}
              </span>
              <span className="text-[11px] sm:text-xs text-neutral-500 font-normal">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
