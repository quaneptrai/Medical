import * as React from 'react';
import { CARE_PATHWAY_STEPS } from '@/lib/clinic-data';
import { cn } from '@/lib/utils';

export function CarePathway({ className }: { className?: string }) {
  return (
    <section
      className={cn('py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 border-t border-line', className)}
      aria-labelledby="pathway-journal-heading"
    >
      <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-ink-muted border-b border-line pb-2">
        <span>Folio 03 · Quy trình phục vụ</span>
        <span>—</span>
        <span>4 Bước chăm sóc chuẩn mực</span>
      </div>

      <div className="space-y-2">
        <h2
          id="pathway-journal-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink tracking-tight"
        >
          Hành trình tiếp đón & Thăm khám
        </h2>
        <p className="text-sm text-ink-muted max-w-2xl">
          Quy trình chuẩn hóa từ lúc bạn ghi nhận triệu chứng ban đầu cho đến khi nhận chẩn đoán và phác đồ điều trị trực tiếp từ bác sĩ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CARE_PATHWAY_STEPS.map((step, idx) => (
          <div
            key={idx}
            className="p-6 bg-paper-raised rounded-xl border border-line space-y-3 shadow-2xs hover:border-mineral transition-colors"
          >
            <span className="text-xs font-mono text-mineral font-bold block">
              Giai đoạn {step.stepNumber}
            </span>
            <h3 className="text-base font-serif font-bold text-ink">
              {step.title}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
