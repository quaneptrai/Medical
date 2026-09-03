'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, UserCheck, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPECIALTIES } from '@/lib/clinic-data';

export function SpecialtyNavigator({ className }: { className?: string }) {
  const [selectedId, setSelectedId] = React.useState<string>(SPECIALTIES[0].id);
  const selectedSpecialty = SPECIALTIES.find((s) => s.id === selectedId) || SPECIALTIES[0];

  return (
    <section
      className={cn('py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10', className)}
      aria-labelledby="specialties-journal-heading"
    >
      <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-ink-muted border-b border-line pb-2">
        <span>Folio 02 · Danh mục chuyên môn</span>
        <span>—</span>
        <span>6 Chuyên khoa trọng điểm</span>
      </div>

      <div className="space-y-2">
        <h2
          id="specialties-journal-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink tracking-tight"
        >
          Khám & Điều trị theo chuyên khoa
        </h2>
        <p className="text-sm text-ink-muted max-w-2xl">
          Mỗi chuyên khoa đảm nhiệm thăm khám sâu từng hệ cơ quan, đối chiếu với 652 mục kiến thức bệnh lý lâm sàng.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Numbered Index (5 cols) */}
        <div
          className="lg:col-span-5 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-line pr-0 lg:pr-6"
          role="tablist"
          aria-label="Danh mục chuyên khoa"
        >
          {SPECIALTIES.map((spec, idx) => {
            const isSelected = spec.id === selectedId;
            return (
              <button
                key={spec.id}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`panel-${spec.id}`}
                id={`tab-${spec.id}`}
                onClick={() => setSelectedId(spec.id)}
                onFocus={() => setSelectedId(spec.id)}
                className={cn(
                  'flex items-center justify-between p-3.5 rounded-md text-left transition-colors shrink-0 lg:shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mineral',
                  isSelected
                    ? 'bg-sage text-mineral font-bold border-l-4 border-mineral'
                    : 'text-ink hover:bg-paper-raised text-ink-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-ink-muted font-normal">
                    0{idx + 1}.
                  </span>
                  <span className="text-sm leading-tight">{spec.name}</span>
                </div>
                <span className="text-xs font-mono text-ink-muted hidden sm:inline">
                  {spec.diseasesCovered} mục
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Detail Folio (7 cols) */}
        <div
          id={`panel-${selectedSpecialty.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${selectedSpecialty.id}`}
          className="lg:col-span-7 bg-paper-raised border border-line rounded-xl p-6 sm:p-8 space-y-6 shadow-2xs animate-[fadeIn_150ms_ease-out]"
        >
          <div className="space-y-1 border-b border-line pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-mineral">
              Chuyên khoa 0{SPECIALTIES.findIndex((s) => s.id === selectedSpecialty.id) + 1}
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink">
              {selectedSpecialty.name}
            </h3>
          </div>

          <p className="text-sm text-ink leading-relaxed">
            {selectedSpecialty.fullDesc}
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Biểu hiện & triệu chứng thường gặp cần khám:
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedSpecialty.commonSymptoms.map((sym, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-paper text-ink px-2.5 py-1 rounded border border-line"
                >
                  • {sym}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-ink">
              <UserCheck className="w-4 h-4 text-mineral shrink-0" />
              <span>Phụ trách: <strong>{selectedSpecialty.chiefDoctor}</strong></span>
            </div>
            <Link
              href={`/dat-lich?khoa=${selectedSpecialty.id}`}
              className="text-xs font-bold text-mineral hover:underline inline-flex items-center gap-1"
            >
              <span>Đặt lịch khám khoa này</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
