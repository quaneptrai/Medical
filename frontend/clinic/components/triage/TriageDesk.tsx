'use client';

import * as React from 'react';
import { ArrowRight, RotateCcw, AlertCircle, Phone, FileText, CheckCircle2, User, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchSymptoms, CandidateResult, EmergencyPayload } from '@/lib/botmedical-api';
import { EmergencyBanner } from './EmergencyBanner';
import { ClinicalMap } from './ClinicalMap';
import { MedicalDisclaimer } from './MedicalDisclaimer';

export interface ConsultationEntry {
  id: string;
  type: 'patient_input' | 'clinical_summary' | 'emergency_alert';
  text: string;
  timestamp: string;
}

export interface TriageDeskProps {
  initialQuery?: string;
  className?: string;
}

export function TriageDesk({ initialQuery, className }: TriageDeskProps) {
  const [entries, setEntries] = React.useState<ConsultationEntry[]>([
    {
      id: 'entry-intro',
      type: 'clinical_summary',
      text: 'Chào mừng bạn đến với Bàn tiếp nhận & Định hướng triệu chứng ban đầu. Vui lòng mô tả các biểu hiện bất thường hoặc khó chịu bạn đang gặp phải.',
      timestamp: 'Khởi tạo phiên',
    },
  ]);

  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [symptoms, setSymptoms] = React.useState<string[]>([]);
  const [candidates, setCandidates] = React.useState<CandidateResult[]>([]);
  const [emergency, setEmergency] = React.useState<EmergencyPayload | null>(null);

  const entriesScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Read session intake if user typed from home page hero, or initialQuery prop
    const sessionIntake = sessionStorage.getItem('botmed_initial_intake');
    const startText = initialQuery || sessionIntake;
    if (startText) {
      sessionStorage.removeItem('botmed_initial_intake');
      handleSend(startText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  React.useEffect(() => {
    const log = entriesScrollRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [entries, loading]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || loading || emergency) return;

    const newPatientEntry: ConsultationEntry = {
      id: `pat-${Date.now()}`,
      type: 'patient_input',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setEntries((prev) => [...prev, newPatientEntry]);
    setInput('');
    setLoading(true);

    try {
      const resp = await searchSymptoms(text, 3, 'auto');

      if (resp.emergency && resp.emergency.is_emergency) {
        setEmergency(resp.emergency);
        const alertEntry: ConsultationEntry = {
          id: `em-${Date.now()}`,
          type: 'emergency_alert',
          text: `CẢNH BÁO NGUY HIỂM: ${resp.emergency.message} (Dấu hiệu: ${resp.emergency.red_flag || 'Cấp cứu y tế'}). Vui lòng gọi 115 hoặc đến cơ sở y tế gần nhất ngay lập tức.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setEntries((prev) => [...prev, alertEntry]);
      } else {
        setCandidates(resp.candidates);
        const newExtracted = resp.candidates.flatMap((c) => c.symptoms.slice(0, 2));
        setSymptoms((prev) => Array.from(new Set([...prev, text.slice(0, 40), ...newExtracted])).slice(0, 6));

        const top = resp.candidates[0];
        let summaryText = `Đã ghi nhận triệu chứng và đối chiếu danh mục bệnh lý.\n\n`;
        if (top) {
          summaryText += `• Nhóm bệnh cảnh có biểu hiện tương đồng: ${top.name} (Chuyên khoa: ${top.category.toUpperCase()}).\n`;
          summaryText += `• Tóm tắt biểu hiện: ${top.description}\n`;
          summaryText += `• Mức độ đề xuất: ${top.urgency === 'high' ? 'Cần thăm khám sớm trong 1-2 ngày' : 'Theo dõi hoặc khám thường quy'}.`;
        } else {
          summaryText += `Không tìm thấy nhóm bệnh tương đồng rõ rệt. Bạn có thể bổ sung thêm triệu chứng chi tiết.`;
        }

        const summaryEntry: ConsultationEntry = {
          id: `sum-${Date.now()}`,
          type: 'clinical_summary',
          text: summaryText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setEntries((prev) => [...prev, summaryEntry]);
      }
    } catch (err: any) {
      setEntries((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'clinical_summary',
          text: `Không thể hoàn tất tra cứu lúc này (${err.message}). Nếu bạn có dấu hiệu nguy hiểm, hãy gọi cấp cứu 115 ngay.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEntries([
      {
        id: 'entry-intro-reset',
        type: 'clinical_summary',
        text: 'Phiên tham vấn đã được làm mới. Vui lòng mô tả triệu chứng bất thường của bạn.',
        timestamp: 'Vừa xong',
      },
    ]);
    setInput('');
    setSymptoms([]);
    setCandidates([]);
    setEmergency(null);
  };

  return (
    <div className={cn('glass-panel flex h-full flex-col overflow-hidden rounded-2xl', className)}>
      {emergency && <EmergencyBanner emergency={emergency} />}

      <div className={cn('flex flex-1 overflow-hidden relative', emergency ? 'opacity-85' : '')}>
        {/* Left 65%: Structured Consultation Record */}
        <section
          className="flex h-full flex-1 flex-col overflow-hidden bg-transparent"
          aria-label="Sổ ghi tham vấn triệu chứng"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.025] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-mineral" />
              <span className="text-[10px] font-semibold uppercase tracking-[.15em] text-zinc-300 sm:text-xs">
                Cuộc trò chuyện của bạn
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              title="Làm mới sổ ghi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Consultation Record Entries Stream */}
          <div
            ref={entriesScrollRef}
            role="log"
            aria-live="polite"
            className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-5 md:p-8"
          >
            {entries.map((entry) => {
              if (entry.type === 'patient_input') {
                return (
                  <div key={entry.id} className="ml-auto max-w-[88%] space-y-1 rounded-2xl rounded-tr-sm bg-violet-600 p-4 shadow-[0_12px_30px_rgba(124,58,237,.2)]">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-violet-100/70">
                      <User className="w-3.5 h-3.5" />
                      <span>Người bệnh mô tả ({entry.timestamp})</span>
                    </div>
                    <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-white sm:text-base">
                      "{entry.text}"
                    </p>
                  </div>
                );
              }

              if (entry.type === 'emergency_alert') {
                return (
                  <div key={entry.id} className="p-4 bg-emergency-soft border border-emergency text-emergency rounded-md text-xs sm:text-sm font-semibold space-y-1">
                    <p className="whitespace-pre-line">{entry.text}</p>
                  </div>
                );
              }

              return (
                <div key={entry.id} className="max-w-[92%] space-y-2 rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.04] p-4 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                    <Stethoscope className="w-3.5 h-3.5 text-mineral" />
                    <span>Ghi nhận hệ thống ({entry.timestamp})</span>
                  </div>
                  <p className="whitespace-pre-line">{entry.text}</p>
                </div>
              );
            })}

            {loading && (
              <div className="max-w-[92%] animate-pulse rounded-2xl rounded-tl-sm border border-violet-300/10 bg-violet-400/[0.05] p-4 text-xs text-violet-200/70">
                AI đang đối chiếu mô tả của bạn...
              </div>
            )}
          </div>

          {/* Sticky Composer */}
          <div className="border-t border-white/[0.08] bg-black/20 p-3 sm:p-4">
            {emergency ? (
              <div className="p-3.5 bg-emergency-soft border border-emergency rounded-md text-center space-y-2">
                <p className="text-xs font-bold text-emergency uppercase tracking-wider">
                  Trợ lý tạm dừng tiếp nhận do phát hiện dấu hiệu cấp cứu
                </p>
                <a
                  href="tel:115"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emergency text-white font-bold rounded-md hover:brightness-110 shadow-xs text-sm min-h-[44px]"
                >
                  <Phone className="w-4 h-4" />
                  <span>Gọi cấp cứu 115 ngay</span>
                </a>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="space-y-2"
              >
                <div className="flex gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] p-1.5 focus-within:border-violet-400/50">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mô tả triệu chứng tiếp theo hoặc bổ sung chi tiết..."
                    disabled={loading}
                    className="min-h-[44px] min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="min-h-[44px] shrink-0 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-violet-100 disabled:opacity-50"
                  >
                    <span>Gửi</span>
                  </button>
                </div>
                <MedicalDisclaimer variant="inline" />
              </form>
            )}
          </div>
        </section>

        {/* Right 35%: Clinical Map Panel */}
        <div className="hidden lg:block w-[360px] xl:w-[400px] shrink-0 h-full">
          <ClinicalMap
            symptoms={symptoms}
            onRemoveSymptom={(sym) => setSymptoms((prev) => prev.filter((s) => s !== sym))}
            onResetSession={handleReset}
            candidates={candidates}
            emergency={emergency}
          />
        </div>
      </div>
    </div>
  );
}
