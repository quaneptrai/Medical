'use client';

import * as React from 'react';
import { AppointmentForm } from '@/components/clinic/AppointmentForm';
import { Calendar, PhoneCall, Clock } from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';

export default function BookingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block">
          Tiếp nhận trực tuyến
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 font-heading tracking-tight">
          Đăng ký lịch khám chữa bệnh
        </h1>
        <p className="text-sm md:text-base text-neutral-600">
          Chủ động lựa chọn chuyên khoa, bác sĩ và khung giờ thuận tiện nhất. Xác nhận lịch nhanh chóng trong 15 phút.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-500 pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Giờ làm việc: 07:30 – 20:00</span>
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
        <AppointmentForm />
      </React.Suspense>
    </div>
  );
}
