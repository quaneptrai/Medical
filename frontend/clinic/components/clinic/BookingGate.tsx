'use client';

import * as React from 'react';
import Link from 'next/link';
import { ClipboardList, LogIn, UserPlus } from 'lucide-react';
import { AppointmentForm } from '@/components/clinic/AppointmentForm';
import { PatientProfile, ProfileForm, emptyProfile, missingLabels } from '@/components/clinic/ProfileForm';

type State =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'incomplete'; profile: PatientProfile; missing: string[]; email: string; username: string }
  | { status: 'ready'; profile: PatientProfile };

/**
 * Đặt lịch cần một hồ sơ người bệnh có thật: phải đăng nhập, và phải khai đủ
 * họ tên, số điện thoại, ngày sinh, giới tính, địa chỉ. Máy chủ kiểm tra lại điều này.
 */
export function BookingGate() {
  const [state, setState] = React.useState<State>({ status: 'loading' });

  const load = React.useCallback(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) { setState({ status: 'anonymous' }); return; }
        const data = await response.json();
        const profile: PatientProfile = { ...emptyProfile, ...(data.user?.profile || {}) };
        const missing: string[] = data.profileMissing || [];
        setState(missing.length
          ? { status: 'incomplete', profile, missing, email: data.user?.email || '', username: data.user?.username || '' }
          : { status: 'ready', profile });
      })
      .catch(() => setState({ status: 'anonymous' }));
  }, []);

  React.useEffect(load, [load]);

  if (state.status === 'loading') {
    return <div className="mx-auto max-w-3xl p-12 text-center text-sm text-[#60736f]">Đang kiểm tra hồ sơ của bạn...</div>;
  }

  if (state.status === 'anonymous') {
    return (
      <div className="mx-auto max-w-2xl rounded-[24px] border border-[#d8e4df] bg-white p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf6f1] text-[#087f73]"><LogIn className="h-6 w-6" /></span>
        <h2 className="mt-6 font-sans text-2xl font-bold">Đăng nhập để đặt lịch khám</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#60736f]">
          Lịch khám được gắn với hồ sơ người bệnh để phòng khám chuẩn bị trước và liên hệ xác nhận với bạn.
          Bạn có thể đăng nhập bằng email hoặc tên đăng nhập.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/dang-nhap?returnUrl=/dat-lich" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-extrabold text-white"><LogIn className="h-4 w-4" /> Đăng nhập</Link>
          <Link href="/dang-ky" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]"><UserPlus className="h-4 w-4" /> Tạo tài khoản mới</Link>
        </div>
        <p className="mt-6 text-xs text-[#879995]">
          Cần khám gấp? Gọi tổng đài hoặc tới trực tiếp phòng khám trong giờ làm việc.
        </p>
      </div>
    );
  }

  if (state.status === 'incomplete') {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-[24px] border border-[#eadcae] bg-[#fff8df] px-7 py-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#70550a]"><ClipboardList className="h-5 w-5" /></span>
          <h2 className="mt-5 font-sans text-xl font-bold text-[#70550a]">Hoàn thiện hồ sơ trước khi đặt lịch</h2>
          <p className="mt-2 text-sm leading-6 text-[#70550a]">
            Bạn còn thiếu: <strong>{missingLabels(state.missing)}</strong>. Khai một lần, những lần đặt lịch sau sẽ tự điền.
          </p>
        </div>

        <div className="rounded-[24px] border border-[#d8e4df] bg-white p-8">
          <ProfileForm
            initialProfile={state.profile}
            email={state.email}
            username={state.username}
            submitLabel="Lưu và tiếp tục đặt lịch"
            onSaved={load}
          />
        </div>
      </div>
    );
  }

  return <AppointmentForm profile={state.profile} />;
}
