'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Calendar, Clock, User, Phone, Mail, FileText, ArrowRight, ArrowLeft, BadgeInfo } from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';
import { cn } from '@/lib/utils';
import { MedicalDisclaimer } from '@/components/triage/MedicalDisclaimer';

const GENDER_TEXT: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

export type BookingProfile = { fullName: string; phone: string; dateOfBirth: string; gender: string; address: string };

export function AppointmentForm({ profile }: { profile: BookingProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = parseInt(searchParams.get('buoc') || '1', 10);
  const currentStep = stepParam >= 1 && stepParam <= 3 ? stepParam : 1;

  const initialSpecialty = searchParams.get('khoa') || '';
  const initialDoctor = searchParams.get('bacsi') || '';

  const [specialties, setSpecialties] = React.useState<any[]>([]);
  const [doctors, setDoctors] = React.useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [specialtyId, setSpecialtyId] = React.useState(initialSpecialty);
  const [doctorId, setDoctorId] = React.useState(initialDoctor);
  const [selectedDate, setSelectedDate] = React.useState(() => new Date().toLocaleDateString('en-CA'));
  const [selectedTime, setSelectedTime] = React.useState('09:00');
  const [notes, setNotes] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [bookedInfo, setBookedInfo] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/catalog', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        const nextSpecialties = data.specialties || [];
        const nextDoctors = data.doctors || [];
        setSpecialties(nextSpecialties);
        setDoctors(nextDoctors);
        const requested = initialSpecialty;
        const matched = nextSpecialties.find((item: any) => item.id === requested || item.category === requested);
        const doctor = nextDoctors.find((item: any) => item.id === initialDoctor);
        setSpecialtyId(doctor?.specialtyId || matched?.id || nextSpecialties[0]?.id || '');
        if (doctor) setDoctorId(doctor.id);
      })
      .finally(() => setCatalogLoading(false));
  }, [initialDoctor, initialSpecialty]);

  const setStep = (step: number) => {
    const params = new URLSearchParams({ buoc: String(step) });
    if (specialtyId) params.set('khoa', specialtyId);
    if (doctorId) params.set('bacsi', doctorId);
    router.push(`/dat-lich?${params.toString()}`);
  };

  const filteredDoctors = doctors.filter((d) => d.specialtyId === specialtyId);

  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'].map((time) => ({ time, available: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) {
      alert('Vui lòng chọn bác sĩ trước khi xác nhận.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialtyId,
          doctorId: doctorId || undefined,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookedInfo(data.appointment);
        setIsSuccess(true);
      } else {
        alert(data.detail || 'Không thể tạo lịch khám. Vui lòng thử lại.');
      }
    } catch {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSpecObj = specialties.find((s) => s.id === specialtyId);
  const selectedDocObj = doctors.find((d) => d.id === doctorId);

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
            Số thứ tự khám trong ngày: <strong className="text-brand-700 font-mono text-xl font-bold">STT #{bookedInfo?.queueNumber || 1}</strong>
            {bookedInfo?.id && (
              <span className="block text-xs text-neutral-400 mt-1">Mã hồ sơ: {bookedInfo.id}</span>
            )}
          </p>
        </div>

        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-left text-xs sm:text-sm space-y-2 text-neutral-700">
          <p><strong>Người bệnh:</strong> {profile.fullName}</p>
          <p><strong>Số điện thoại:</strong> {profile.phone}</p>
          <p><strong>Chuyên khoa:</strong> {selectedSpecObj?.name}</p>
          <p><strong>Bác sĩ phụ trách:</strong> {selectedDocObj?.name}</p>
          <p><strong>Thời gian hẹn:</strong> {selectedTime}, Ngày {selectedDate}</p>
          <p><strong>Địa điểm:</strong> {CLINIC_INFO.address}</p>
        </div>

        <p className="text-xs text-neutral-500">
          Nhân viên tư vấn của Phòng khám Quang Thanh sẽ gọi điện xác nhận trong vòng 15 phút.
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
                {catalogLoading ? <p className="col-span-2 rounded-xl border border-dashed border-neutral-200 p-5 text-sm text-neutral-500">Đang tải danh mục chuyên khoa…</p> : specialties.map((spec) => (
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
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      'p-4 rounded-xl border text-left text-xs transition-all',
                      doctorId === doc.id
                        ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm'
                        : 'border-neutral-200 bg-neutral-0 hover:bg-neutral-50 text-neutral-700'
                    )}
                  >
                    <button type="button" onClick={() => setDoctorId(doc.id)} className="w-full text-left">
                      <span className="flex items-center gap-3">
                        {doc.imageUrl ? <img src={doc.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#dff3ed] text-sm font-black text-[#075f59]">{doc.name.split(' ').slice(-2).map((word: string) => word[0]).join('')}</span>}
                        <span><strong className="block text-sm">{doc.name}</strong><span className="mt-1 block text-[11px] text-neutral-500">{doc.title} · {doc.experienceYears} năm kinh nghiệm</span></span>
                      </span>
                      <span className="mt-3 block line-clamp-2 leading-relaxed text-neutral-600">{doc.bio}</span>
                      <span className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3"><strong className="text-[#087f73]">Khám miễn phí 100%</strong><span className="font-bold text-brand-700">{doctorId === doc.id ? 'Đã chọn' : 'Chọn bác sĩ'}</span></span>
                    </button>
                    <Link href={`/bac-si/${doc.id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#526a65]"><BadgeInfo className="h-3.5 w-3.5" /> Xem hồ sơ đầy đủ</Link>
                  </div>
                ))}
                {!catalogLoading && !filteredDoctors.length ? <p className="col-span-2 rounded-xl border border-dashed border-neutral-200 p-5 text-sm text-neutral-500">Chưa có bác sĩ hoạt động trong khoa này.</p> : null}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => doctorId && setStep(2)}
              disabled={!doctorId}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 text-white text-sm font-semibold rounded-md shadow-xs transition-colors"
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
              Giờ khám sáng 08:00–12:00 và chiều 13:00–19:00, từ Thứ Hai đến Chủ nhật.
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
                min={new Date().toLocaleDateString('en-CA')}
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
              Thông tin dưới đây lấy từ hồ sơ tài khoản của bạn. Nhân viên sẽ gọi tới số điện thoại này để xác nhận lịch khám.
            </p>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-brand-50/70 border border-brand-200 rounded-xl text-xs space-y-1.5 text-brand-900">
            <p className="font-bold text-sm text-brand-800 mb-1">Tóm tắt lịch khám:</p>
            <p>• <strong>Chuyên khoa:</strong> {selectedSpecObj?.name}</p>
            <p>• <strong>Bác sĩ:</strong> {selectedDocObj?.name}</p>
            <p>• <strong>Phí khám ban đầu:</strong> Miễn phí 100%</p>
            <p>• <strong>Thời gian:</strong> {selectedTime}, Ngày {selectedDate}</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#d8e4df] bg-[#f7fbf9] p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#60736f]">Hồ sơ người bệnh</p>
                <Link href="/tai-khoan?tab=ho-so" className="text-[11px] font-bold text-[#075f59] underline">Sửa thông tin</Link>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <p><span className="text-xs text-[#879995]">Họ và tên: </span><strong>{profile.fullName}</strong></p>
                <p><span className="text-xs text-[#879995]">Số điện thoại: </span><strong>{profile.phone}</strong></p>
                <p><span className="text-xs text-[#879995]">Ngày sinh: </span><strong>{profile.dateOfBirth}</strong></p>
                <p><span className="text-xs text-[#879995]">Giới tính: </span><strong>{GENDER_TEXT[profile.gender] || '—'}</strong></p>
                <p className="col-span-2"><span className="text-xs text-[#879995]">Địa chỉ: </span><strong>{profile.address}</strong></p>
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
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-bold rounded-md shadow-sm transition-colors min-h-[48px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang ghi nhận lịch...' : 'Xác nhận & Hoàn tất đặt lịch'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
