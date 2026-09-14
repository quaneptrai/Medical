'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle, ArrowUpRight, Calendar, CalendarDays, Clock, LayoutDashboard, LogOut, MapPin,
  MessageSquareText, ShieldCheck, User, UserCheck,
} from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';
import { PatientProfile, ProfileForm, emptyProfile, missingLabels } from '@/components/clinic/ProfileForm';

const GENDER_TEXT: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

function AccountDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<'appointments' | 'profile' | 'security'>(
    searchParams.get('tab') === 'ho-so' ? 'profile' : 'appointments',
  );
  const [loading, setLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<any>(null);
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [profile, setProfile] = React.useState<PatientProfile>(emptyProfile);
  const [missing, setMissing] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) { router.push('/dang-nhap?returnUrl=/tai-khoan'); return; }
        const data = await response.json();
        setUserData(data.user);
        setAppointments(data.appointments || []);
        setProfile({ ...emptyProfile, ...(data.user?.profile || {}) });
        setMissing(data.profileMissing || []);
      })
      .catch(() => router.push('/dang-nhap'))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dang-nhap');
    router.refresh();
  };

  if (loading) return <div className="clinic-page text-sm text-[#60736f]">Đang tải hồ sơ...</div>;

  const isStaff = userData?.roles?.includes('super_admin') || userData?.roles?.includes('clinic_admin');
  const incomplete = missing.length > 0;
  const greeting = profile.fullName || userData?.display_name;

  return (
    <div className="clinic-page space-y-6">
      <section className="flex items-end justify-between rounded-[28px] border border-[#cfe1db] bg-[#eaf6f1] p-9">
        <div>
          <span className="clinic-kicker">Không gian tài khoản</span>
          <h1 className="mt-3 text-[44px]">{greeting ? `Xin chào, ${greeting}` : 'Hồ sơ người bệnh'}</h1>
          <p className="mt-2 text-sm text-[#60736f]">
            {userData?.username ? <>{userData.username} · </> : null}{userData?.email} · <strong className="text-[#087f73]">Đã xác minh</strong>
          </p>
        </div>
        <div className="flex gap-2">
          {isStaff ? (
            <Link href="/quan-tri" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffdd79] px-5 text-xs font-extrabold text-[#18312d]"><LayoutDashboard className="h-4 w-4" /> Mở bảng điều hành</Link>
          ) : (
            <Link href="/tro-ly" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#087f73] px-5 text-xs font-bold text-white"><MessageSquareText className="h-4 w-4" /> Hỏi trợ lý <ArrowUpRight className="h-4 w-4" /></Link>
          )}
          <button type="button" onClick={logout} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c7ded7] bg-white px-5 text-xs font-bold text-[#526a65]"><LogOut className="h-4 w-4" /> Đăng xuất</button>
        </div>
      </section>

      {incomplete ? (
        <div className="flex items-center justify-between gap-6 rounded-2xl border border-[#eadcae] bg-[#fff8df] px-6 py-4">
          <p className="flex items-start gap-2.5 text-sm leading-6 text-[#70550a]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Hồ sơ của bạn còn thiếu: <strong>{missingLabels(missing)}</strong>. Cần khai đủ những mục này thì mới đặt được lịch khám.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="shrink-0 rounded-xl bg-[#18312d] px-5 py-2.5 text-xs font-extrabold text-white"
          >
            Hoàn thiện ngay
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#d8e4df] bg-white p-5"><Calendar className="mb-4 h-5 w-5 text-[#087f73]" /><p className="text-3xl font-bold">{appointments.length}</p><p className="text-xs text-[#60736f]">Lịch hẹn trong tài khoản</p></div>
        <div className="rounded-2xl border border-[#d8e4df] bg-white p-5"><UserCheck className="mb-4 h-5 w-5 text-[#087f73]" /><p className="text-sm font-bold">{incomplete ? `Còn thiếu ${missing.length} mục` : 'Đã đầy đủ'}</p><p className="mt-1 text-xs text-[#60736f]">Hồ sơ người bệnh</p></div>
        <div className="rounded-2xl border border-[#d8e4df] bg-white p-5"><Clock className="mb-4 h-5 w-5 text-[#087f73]" /><p className="text-sm font-bold">08:00–12:00 · 13:00–19:00</p><p className="mt-1 text-xs text-[#60736f]">Giờ tiếp nhận hằng ngày</p></div>
      </div>

      <div className="flex gap-2 rounded-2xl border border-[#d8e4df] bg-white p-1.5 text-xs font-bold">
        {([
          ['appointments', `Lịch hẹn (${appointments.length})`],
          ['profile', incomplete ? 'Thông tin cá nhân ·  cần bổ sung' : 'Thông tin cá nhân'],
          ['security', 'Bảo mật tài khoản'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`rounded-xl px-5 py-2.5 ${activeTab === key ? 'bg-[#eaf6f1] text-[#075f59]' : 'text-[#60736f]'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'appointments' && (
        <section className="rounded-2xl border border-[#d8e4df] bg-white p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold">Lịch khám đã đăng ký</h2>
            <Link href="/dat-lich" className="text-xs font-bold text-[#087f73]">+ Đặt lịch mới</Link>
          </div>
          {appointments.length ? (
            <div className="space-y-3">
              {appointments.map((item) => (
                <article key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 rounded-xl border border-[#e0e9e5] bg-[#f7fbf9] p-5">
                  <div><strong className="block text-sm">{item.patient_name}</strong><span className="text-xs text-[#60736f]">Khoa {item.specialty_id}</span></div>
                  <div className="text-xs">
                    <p>{item.appointment_date} · {item.appointment_time}</p>
                    <p className="mt-1 flex items-center gap-1 text-[#60736f]"><MapPin className="h-3.5 w-3.5" /> {CLINIC_INFO.address}</p>
                  </div>
                  <span className="rounded-lg bg-[#dff5e9] px-3 py-1 text-xs font-bold text-[#075f59]">{item.status}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#c7ded7] bg-[#f7fbf9] p-9 text-center">
              <Calendar className="mx-auto mb-3 h-7 w-7 text-[#87a19b]" />
              <p className="text-sm text-[#60736f]">Chưa có lịch hẹn nào.</p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'profile' && (
        <section className="grid grid-cols-[1.15fr_.85fr] gap-6">
          <div className="rounded-2xl border border-[#d8e4df] bg-white p-7">
            <h2 className="mb-1 font-sans text-lg font-bold">Thông tin cá nhân</h2>
            <p className="mb-6 text-xs leading-6 text-[#879995]">
              Đây là thông tin sẽ được dùng để lập hồ sơ khám bệnh. Bạn cần điền đủ các mục có dấu * trước khi đặt lịch.
            </p>
            <ProfileForm
              initialProfile={profile}
              email={userData?.email}
              username={userData?.username}
              onSaved={(next) => { setProfile(next); setMissing([]); }}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#d8e4df] bg-white p-7">
              <h3 className="mb-4 font-sans text-sm font-bold uppercase tracking-[.08em] text-[#60736f]">Hồ sơ hiện tại</h3>
              <dl className="space-y-3 text-sm">
                <Row label="Họ và tên" value={profile.fullName} />
                <Row label="Số điện thoại" value={profile.phone} />
                <Row label="Ngày sinh" value={profile.dateOfBirth} />
                <Row label="Giới tính" value={profile.gender ? GENDER_TEXT[profile.gender] : ''} />
                <Row label="Địa chỉ" value={profile.address} />
              </dl>
            </div>
            <div className="rounded-2xl border border-[#d8e4df] bg-[#f7fbf9] p-6">
              <p className="flex items-start gap-2.5 text-xs leading-6 text-[#60736f]">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#087f73]" />
                Khi hồ sơ đã đầy đủ, biểu mẫu đặt lịch sẽ tự điền họ tên và số điện thoại — bạn chỉ cần chọn khoa, bác sĩ và giờ khám.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'security' && (
        <section className="max-w-2xl rounded-2xl border border-[#d8e4df] bg-white p-7">
          <h2 className="mb-5 font-sans text-lg font-bold">Bảo mật & quyền riêng tư của bạn</h2>
          <div className="space-y-4 text-sm text-[#60736f]">
            <p className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#087f73]" /><span><strong className="block text-[#18312d]">Mật khẩu Argon2id</strong>Mật khẩu chỉ được lưu dưới dạng giá trị băm có tăng cường bộ nhớ.</span></p>
            <p className="flex gap-3"><User className="h-5 w-5 shrink-0 text-[#087f73]" /><span><strong className="block text-[#18312d]">Phiên HttpOnly</strong>Cookie phiên không thể được đọc bởi JavaScript trên trình duyệt.</span></p>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#f0f5f3] pb-2.5 last:border-0">
      <dt className="shrink-0 text-xs text-[#879995]">{label}</dt>
      <dd className={`text-right ${value ? 'font-semibold text-[#18312d]' : 'text-[#c0ccc8]'}`}>{value || 'Chưa cập nhật'}</dd>
    </div>
  );
}

export default function AccountPage() {
  return (
    <React.Suspense fallback={<div className="clinic-page text-sm text-[#60736f]">Đang tải hồ sơ...</div>}>
      <AccountDashboard />
    </React.Suspense>
  );
}
