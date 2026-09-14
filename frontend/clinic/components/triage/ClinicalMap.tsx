'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, RotateCcw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CandidateResult, EmergencyPayload } from '@/lib/botmedical-api';
import { DiseaseCandidate } from './DiseaseCandidate';

export interface ClinicalMapProps {
  symptoms: string[];
  onRemoveSymptom: (symptom: string) => void;
  onResetSession: () => void;
  candidates: CandidateResult[];
  emergency: EmergencyPayload | null;
  className?: string;
}

export function ClinicalMap({
  symptoms,
  onRemoveSymptom,
  onResetSession,
  candidates,
  emergency,
  className,
}: ClinicalMapProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-hidden border-l border-[#d8e4df] bg-[#f0f7f4]',
        className
      )}
      aria-label="Tóm tắt định hướng lâm sàng"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#d8e4df] p-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mineral" />
          <span className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#405954]">
            Tóm tắt phiên
          </span>
        </div>
        <span className="rounded-lg border border-[#bce6d6] bg-white px-2 py-0.5 text-[10px] font-bold text-[#087f73]">
          Trực tiếp
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Extracted Symptoms */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Triệu chứng đã ghi nhận ({symptoms.length}):
          </span>
          {symptoms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map((sym, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-paper-raised text-ink px-2.5 py-1 rounded-md border border-line flex items-center gap-1.5"
                >
                  <span>{sym}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSymptom(sym)}
                    className="text-ink-muted hover:text-emergency font-bold text-xs"
                    aria-label={`Xóa triệu chứng ${sym}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted italic">
              Chưa có triệu chứng nào được ghi nhận. Vui lòng nhập mô tả ở khung bên trái.
            </p>
          )}
        </div>

        {/* Candidate Diseases */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Mục bệnh lý có thể liên quan ({candidates.length}):
          </span>

          {candidates.length > 0 ? (
            <div className="space-y-3">
              {candidates.map((cand, idx) => (
                <DiseaseCandidate key={cand.disease_id || idx} candidate={cand} rank={idx + 1} />
              ))}
            </div>
          ) : (
            <div className="p-5 bg-paper-raised rounded-lg border border-line text-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-mineral mx-auto" />
              <p className="text-xs text-ink-muted">
                Kết quả định hướng và chuyên khoa gợi ý sẽ hiển thị tại đây sau khi bạn mô tả triệu chứng.
              </p>
            </div>
          )}
        </div>

        {/* Booking CTA if results available */}
        {candidates.length > 0 && !emergency && (
          <div className="p-4 bg-sage rounded-lg border border-line space-y-2 text-center">
            <p className="text-xs font-bold text-ink">
              Cần bác sĩ thăm khám và chẩn đoán trực tiếp?
            </p>
            <Link
              href="/dat-lich"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-mineral hover:bg-mineral-hover text-white text-xs font-bold rounded-md shadow-xs transition-colors"
            >
              <span>Đặt lịch khám chuyên khoa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
