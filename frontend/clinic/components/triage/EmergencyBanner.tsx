'use client';

import * as React from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmergencyPayload } from '@/lib/botmedical-api';

export interface EmergencyBannerProps {
  emergency: EmergencyPayload;
  className?: string;
}

export function EmergencyBanner({ emergency, className }: EmergencyBannerProps) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className={cn(
        'w-full bg-[#971E26] text-white p-5 md:p-6 shadow-md border-b-2 border-red-950 animate-[fadeIn_200ms_ease-out]',
        className
      )}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-red-950/60 rounded-md shrink-0 mt-0.5">
            <AlertTriangle className="w-8 h-8 text-white stroke-[2]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <span className="bg-white text-[#971E26] text-[11px] font-extrabold px-2 py-0.5 rounded tracking-widest uppercase">
              Cảnh báo cấp cứu khẩn cấp
            </span>
            <h2 className="text-lg md:text-xl font-bold font-serif leading-snug">
              Phát hiện dấu hiệu nguy hiểm — Cần hỗ trợ y tế khẩn cấp ngay
            </h2>
            <p className="text-xs md:text-sm text-red-100 font-normal leading-relaxed max-w-3xl">
              {emergency.message || 'Hãy gọi cấp cứu 115 hoặc đến ngay Khoa Cấp cứu của bệnh viện gần nhất.'}
            </p>
            {emergency.red_flag && (
              <p className="text-xs text-red-200 bg-red-950/50 px-2.5 py-1 rounded inline-block mt-1">
                Dấu hiệu cảnh báo: <strong>{emergency.red_flag}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <a
            href="tel:115"
            className="flex items-center justify-center gap-2.5 w-full md:w-auto min-h-[56px] px-8 bg-white text-[#971E26] hover:bg-neutral-100 font-extrabold text-base rounded-md shadow-md transition-transform duration-120 active:translate-y-[1px] focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
            aria-label="Gọi cấp cứu 115 ngay lập tức"
          >
            <PhoneCall className="w-5 h-5 stroke-[2.4]" aria-hidden="true" />
            <span>GỌI 115 NGAY</span>
          </a>
        </div>
      </div>
    </section>
  );
}
