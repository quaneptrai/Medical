'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { TriageDesk } from '@/components/triage/TriageDesk';
import { HeartPulse, ShieldCheck } from 'lucide-react';

function TriageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  return (
    <div className="relative mx-auto flex h-[calc(100vh-110px)] max-w-[1640px] flex-col space-y-4 px-0 py-6">
      <div className="app-grid pointer-events-none absolute inset-0 -z-10" />
      {/* Header bar for the triage consultation desk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#bce6d6] bg-[#dff5e9]">
            <HeartPulse className="h-5 w-5 text-[#087f73]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-[#18312d]">
              Bàn hướng dẫn sức khỏe
            </h1>
            <p className="text-[11px] text-[#60736f]">
              Mô tả tự nhiên · định hướng bước chăm sóc tiếp theo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#60736f]">
          <span className="hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-[#087f73]" />
            <span>Phiên trò chuyện riêng tư</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-[#bce6d6] bg-[#edf8f4] px-2.5 py-1 text-[10px] font-bold text-[#075f59]">
            <i className="h-1.5 w-1.5 rounded-full bg-[#23a36d]" /> Sẵn sàng tiếp nhận
          </span>
        </div>
      </div>

      {/* Main interactive triage desk */}
      <div className="triage-light flex-1 min-h-0">
        <TriageDesk initialQuery={initialQuery} />
      </div>
    </div>
  );
}

export default function TriagePage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-neutral-500">
          Đang nạp bàn tư vấn phân loại triệu chứng...
        </div>
      }
    >
      <TriageContent />
    </React.Suspense>
  );
}
