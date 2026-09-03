'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Stethoscope, Compass, Clock, MapPin } from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';
import { MedicalDisclaimer } from '@/components/triage/MedicalDisclaimer';

export function HeroSection({ className }: { className?: string }) {
  const router = useRouter();
  const [symptomText, setSymptomText] = React.useState('');

  const handleStartTriage = (e: React.FormEvent) => {
    e.preventDefault();
    if (symptomText.trim()) {
      // Store in session storage to avoid exposing medical text in URL query string (security constraint)
      sessionStorage.setItem('botmed_initial_intake', symptomText.trim());
      router.push('/tro-ly');
    } else {
      router.push('/tro-ly');
    }
  };

  return (
    <section
      className="py-12 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      aria-labelledby="hero-journal-heading"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Editorial Folio (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Margin annotation */}
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-ink-muted border-b border-line pb-2">
            <span>Folio 01 · Tiếp nhận người bệnh</span>
            <span>—</span>
            <span>Hà Nội & TP.HCM</span>
          </div>

          {/* Main Headline */}
          <h1
            id="hero-journal-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-ink leading-[1.2] tracking-tight"
          >
            Lắng nghe triệu chứng,{' '}
            <span className="text-mineral font-normal italic">
              chỉ dẫn đúng chuyên khoa.
            </span>
          </h1>

          {/* Editorial Paragraph */}
          <p className="text-base text-ink-muted leading-relaxed max-w-prose">
            Phòng khám Đa khoa Quốc tế YG kết hợp quy trình khám chữa bệnh tận tâm và hệ thống tra cứu 652 mục tri thức bệnh lý để hỗ trợ bạn định hướng ban đầu, sàng lọc dấu hiệu cấp cứu trước khi thăm khám trực tiếp cùng bác sĩ.
          </p>

          {/* Compact Intake Form */}
          <form onSubmit={handleStartTriage} className="pt-2 space-y-3">
            <div className="p-4 rounded-lg bg-paper-raised border border-line space-y-3 shadow-2xs">
              <label htmlFor="intake-text" className="block text-xs font-bold uppercase tracking-wider text-ink">
                Mô tả cảm giác khó chịu của bạn:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="intake-text"
                  type="text"
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder="Ví dụ: Đau mỏi vai gáy sau khi làm việc, hoặc sốt nhẹ rát họng..."
                  className="flex-1 px-3.5 py-2.5 rounded-md border border-line bg-paper text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-mineral"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-mineral hover:bg-mineral-hover text-white font-bold text-xs rounded-md transition-colors shadow-2xs shrink-0 min-h-[42px]"
                >
                  <span>Bắt đầu định hướng</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <MedicalDisclaimer variant="inline" />
          </form>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/dat-lich"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 bg-mineral hover:bg-mineral-hover text-white font-bold text-xs rounded-md transition-colors shadow-xs"
            >
              Đặt lịch khám tại phòng khám
            </Link>
            <Link
              href="/chuyen-khoa"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-mineral transition-colors py-2"
            >
              <span>Xem danh mục 6 Chuyên khoa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Documentary Folio Image (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-xl overflow-hidden border border-line bg-paper-raised p-2 shadow-xs">
            <div className="bg-sage/40 rounded-lg p-6 sm:p-8 text-ink space-y-6 border border-line">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-widest text-mineral block">
                  Không gian thăm khám
                </span>
                <h2 className="text-xl font-serif font-bold text-ink">
                  Môi trường y tế vô trùng & trang thiết bị chẩn đoán hiện đại
                </h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Tại Phòng khám YG, mỗi người bệnh đều được lắng nghe toàn diện từ biểu hiện ban đầu đến kế hoạch chăm sóc phục hồi.
                </p>
              </div>

              <div className="pt-4 border-t border-line space-y-2 text-xs text-ink-muted">
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-mineral shrink-0" />
                  <span>Thời gian: {CLINIC_INFO.openingHours}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-mineral shrink-0" />
                  <span>Cơ sở chính: 184 Nguyễn Lương Bằng, Đống Đa, Hà Nội</span>
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-ink-muted font-mono italic text-right">
            Ảnh tư liệu Phòng khám Đa khoa Quốc tế YG
          </p>
        </div>
      </div>
    </section>
  );
}
