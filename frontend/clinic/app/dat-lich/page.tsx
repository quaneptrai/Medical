'use client';

import * as React from 'react';
import { BookingGate } from '@/components/clinic/BookingGate';
import { Calendar, PhoneCall, Clock } from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';

export default function BookingPage() {
  return (
    <div className="clinic-page space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block">
          Tiếp nhận trực tuyến
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 font-heading tracking-tight">
          Đăng ký lịch khám chữa bệnh
        </h1>
        <p className="text-sm md:text-base text-neutral-600">
          Chủ động chọn chuyên khoa, bác sĩ và khung giờ thuận tiện. Lịch được gắn với hồ sơ tài khoản của bạn nên chỉ cần khai thông tin cá nhân một lần.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-500 pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Giờ khám: Sáng 08:00–12:00 · Chiều 13:00–19:00</span>
          </span>
          <span className="flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
            <span>Hotline hỗ trợ: {CLINIC_INFO.hotline}</span>
          </span>
        </div>
      </div>

      <React.Suspense
        fallback={
          <div className="max-w-3xl mx-auto p-12 text-center text-sm text-neutral-500">
            Đang nạp biểu mẫu đặt lịch...
          </div>
        }
      >
        <BookingGate />
      </React.Suspense>
    </div>
  );
}
