'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { TriageDesk } from '@/components/triage/TriageDesk';
import { BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react';

function TriageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  return (
    <div className="relative mx-auto flex h-[calc(100vh-68px)] max-w-[1440px] flex-col space-y-4 px-3 py-4 sm:px-6 md:py-6 lg:px-10">
      <div className="app-grid pointer-events-none absolute inset-0 -z-10" />
      {/* Header bar for the triage consultation desk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/10 shadow-[0_0_25px_rgba(139,92,246,.14)]">
            <BrainCircuit className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-white md:text-lg">
              Trợ lý sức khỏe AI
            </h1>
            <p className="text-[11px] text-zinc-500">
              Mô tả tự nhiên · định hướng bước chăm sóc tiếp theo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Phiên trò chuyện riêng tư</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] font-medium text-violet-300">
            <Sparkles className="h-3 w-3" /> AI đang sẵn sàng
          </span>
        </div>
      </div>

      {/* Main interactive triage desk */}
      <div className="flex-1 min-h-0">
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
