'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Calendar, Clock, User, Phone, Mail, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { SPECIALTIES, DOCTORS, CLINIC_INFO } from '@/lib/clinic-data';
import { cn } from '@/lib/utils';
import { MedicalDisclaimer } from '@/components/triage/MedicalDisclaimer';

export function AppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = parseInt(searchParams.get('buoc') || '1', 10);
  const currentStep = stepParam >= 1 && stepParam <= 3 ? stepParam : 1;

  const initialSpecialty = searchParams.get('khoa') || SPECIALTIES[0].id;
  const initialDoctor = searchParams.get('bacsi') || '';

  const [specialtyId, setSpecialtyId] = React.useState(initialSpecialty);
  const [doctorId, setDoctorId] = React.useState(initialDoctor);
  const [selectedDate, setSelectedDate] = React.useState('2026-09-02');
  const [selectedTime, setSelectedTime] = React.useState('09:00');
  const [patientName, setPatientName] = React.useState('');
  const [patientPhone, setPatientPhone] = React.useState('');
  const [patientEmail, setPatientEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);

  const setStep = (step: number) => {
    router.push(`/dat-lich?buoc=${step}`);
  };

  const filteredDoctors = DOCTORS.filter((d) => d.specialtyId === specialtyId);

  const timeSlots = [
    { time: '08:00', available: true },
    { time: '08:30', available: true },
    { time: '09:00', available: true },
    { time: '09:30', available: false },
    { time: '10:00', available: true },
    { time: '10:30', available: true },
    { time: '14:00', available: true },
    { time: '14:30', available: true },
    { time: '15:00', available: false },
    { time: '15:30', available: true },
    { time: '16:00', available: true },
    { time: '16:30', available: true },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone) {
      alert('Vui lòng điền đầy đủ họ tên và số điện thoại.');
      return;
    }
    setIsSuccess(true);
  };

  const selectedSpecObj = SPECIALTIES.find((s) => s.id === specialtyId) || SPECIALTIES[0];
  const selectedDocObj = DOCTORS.find((d) => d.id === doctorId) || filteredDoctors[0];

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-8 bg-neutral-0 rounded-2xl border border-neutral-200 shadow-sm text-center space-y-6 animate-[fadeIn_200ms_ease-out]">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900 font-heading">
            Đăng ký lịch khám thành công!
          </h2>
          <p className="text-sm text-neutral-600">
            Mã tiếp nhận của bạn là: <strong className="text-brand-700 font-mono text-base">AL-{Math.floor(100000 + Math.random() * 900000)}</strong>
          </p>
        </div>

        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-left text-xs sm:text-sm space-y-2 text-neutral-700">
          <p><strong>Người bệnh:</strong> {patientName}</p>
          <p><strong>Số điện thoại:</strong> {patientPhone}</p>
          <p><strong>Chuyên khoa:</strong> {selectedSpecObj.name}</p>
          <p><strong>Bác sĩ phụ trách:</strong> {selectedDocObj?.name || 'Bác sĩ trực khoa'}</p>
          <p><strong>Thời gian hẹn:</strong> {selectedTime}, Ngày {selectedDate}</p>
          <p><strong>Địa điểm:</strong> {CLINIC_INFO.address}</p>
        </div>

        <p className="text-xs text-neutral-500">
          Nhân viên tư vấn của Phòng khám YG sẽ gọi điện xác nhận trong vòng 15 phút.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              setStep(1);
            }}
            className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-sm font-semibold rounded-md transition-colors"
          >
            Đặt lịch hẹn khác
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-neutral-0 rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-8">
      {/* 3-Step Progress Indicator */}
      <div className="flex items-center justify-between relative" aria-label="Tiến trình đặt lịch">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-neutral-200 -z-0" />
        {[
          { step: 1, label: '1. Chọn chuyên khoa' },
          { step: 2, label: '2. Chọn ngày & giờ' },
          { step: 3, label: '3. Xác nhận thông tin' },
        ].map((item) => {
          const isDone = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          return (
            <div key={item.step} className="flex flex-col items-center gap-1.5 relative z-10 bg-neutral-0 px-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors',
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-neutral-200 text-neutral-600'
                )}
              >
                {isDone ? '✓' : item.step}
              </div>
              <span
                className={cn(
                  'text-[11px] sm:text-xs font-semibold',
                  isCurrent ? 'text-brand-700' : 'text-neutral-500'
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Specialty & Doctor */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-[fadeIn_150ms_ease-out]">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-900 font-heading">
              Bước 1: Chọn chuyên khoa và bác sĩ phụ trách
            </h3>
            <p className="text-xs text-neutral-500">
              Chọn chuyên khoa cần khám hoặc bác sĩ chuyên gia bạn mong muốn.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                Chuyên khoa:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SPECIALTIES.map((spec) => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => {
                      setSpecialtyId(spec.id);
                      setDoctorId('');
                    }}
                    className={cn(
                      'p-3 rounded-lg border text-left text-xs transition-all',
                      specialtyId === spec.id
                        ? 'border-brand-600 bg-brand-50 font-bold text-brand-800 shadow-2xs'
                        : 'border-neutral-200 bg-neutral-0 hover:bg-neutral-50 text-neutral-700'
                    )}
                  >
                    <p className="font-semibold text-sm">{spec.name}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{spec.shortDesc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                Bác sĩ phụ trách:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDoctorId('')}
                  className={cn(
                    'p-3 rounded-lg border text-left text-xs transition-all',
                    doctorId === ''
                      ? 'border-brand-600 bg-brand-50 font-bold text-brand-800'
                      : 'border-neutral-200 bg-neutral-0 hover:bg-neutral-50 text-neutral-700'
                  )}
                >
                  <p className="font-semibold text-sm">Bác sĩ trực chuyên khoa (Tự động)</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Phòng khám sắp xếp bác sĩ phù hợp nhất</p>
                </button>

                {filteredDoctors.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setDoctorId(doc.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left text-xs transition-all',
                      doctorId === doc.id
                        ? 'border-brand-600 bg-brand-50 font-bold text-brand-800'
                        : 'border-neutral-200 bg-neutral-0 hover:bg-neutral-50 text-neutral-700'
                    )}
                  >
                    <p className="font-semibold text-sm">{doc.name}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{doc.title} · {doc.experienceYears} năm KN</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              <span>Tiếp tục chọn ngày & giờ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Date & Time */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-[fadeIn_150ms_ease-out]">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-900 font-heading">
              Bước 2: Chọn ngày và khung giờ khám
            </h3>
            <p className="text-xs text-neutral-500">
              Phòng khám mở cửa từ 07:30 đến 20:00 tất cả các ngày trong tuần.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="appointment-date" className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                Ngày khám dự kiến:
              </label>
              <input
                id="appointment-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-md border border-neutral-300 bg-neutral-0 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                Khung giờ trống:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {timeSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={cn(
                      'py-2 px-3 rounded-md text-xs font-semibold border transition-all text-center min-h-[44px]',
                      !slot.available
                        ? 'opacity-40 line-through bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                        : selectedTime === slot.time
                        ? 'bg-brand-600 text-white border-brand-600 shadow-2xs font-bold'
                        : 'bg-brand-50/60 hover:bg-brand-100 text-brand-800 border-brand-200'
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              <span>Tiếp tục điền thông tin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Patient Information & Confirmation */}
      {currentStep === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-[fadeIn_150ms_ease-out]">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-900 font-heading">
              Bước 3: Thông tin người bệnh & Xác nhận lịch
            </h3>
            <p className="text-xs text-neutral-500">
              Vui lòng cung cấp số điện thoại chính xác để nhân viên xác nhận lịch khám.
            </p>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-brand-50/70 border border-brand-200 rounded-xl text-xs space-y-1.5 text-brand-900">
            <p className="font-bold text-sm text-brand-800 mb-1">Tóm tắt lịch khám:</p>
            <p>• <strong>Chuyên khoa:</strong> {selectedSpecObj.name}</p>
            <p>• <strong>Bác sĩ:</strong> {selectedDocObj?.name || 'Bác sĩ trực khoa'}</p>
            <p>• <strong>Thời gian:</strong> {selectedTime}, Ngày {selectedDate}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="patient-name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1">
                Họ và tên người bệnh *
              </label>
              <input
                id="patient-name"
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 rounded-md border border-neutral-300 bg-neutral-0 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient-phone" className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Số điện thoại liên hệ *
                </label>
                <input
                  id="patient-phone"
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2.5 rounded-md border border-neutral-300 bg-neutral-0 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="patient-email" className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Email nhận xác nhận (tùy chọn)
                </label>
                <input
                  id="patient-email"
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-md border border-neutral-300 bg-neutral-0 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="patient-notes" className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1">
                Ghi chú triệu chứng hoặc yêu cầu đặc biệt
              </label>
              <textarea
                id="patient-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mô tả sơ lược triệu chứng bạn đang gặp phải..."
                className="w-full px-3.5 py-2.5 rounded-md border border-neutral-300 bg-neutral-0 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          <MedicalDisclaimer variant="subtle" />

          <div className="pt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-md shadow-sm transition-colors min-h-[48px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác nhận & Hoàn tất đặt lịch</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
