'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Calendar, ShieldCheck, LogOut, Clock, MapPin, MessageSquareText, Sparkles, ArrowUpRight } from 'lucide-react';
import { CLINIC_INFO } from '@/lib/clinic-data';

export default function AccountDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'appointments' | 'profile' | 'security'>('appointments');
  const [loading, setLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<any>(null);
  const [appointments, setAppointments] = React.useState<any[]>([]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/dang-nhap?returnUrl=/tai-khoan');
        return;
      }
      const data = await res.json();
      setUserData(data.user);
      setAppointments(data.appointments || []);
    } catch {
      router.push('/dang-nhap');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dang-nhap');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-ink-muted">
        Đang nạp hồ sơ người bệnh...
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="app-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px]" />
      {/* Account top header */}
      <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-600/30 via-[#121126] to-cyan-400/[0.06] p-6 sm:flex-row sm:items-end md:p-8">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-violet-500/25 blur-[80px]" />
        <div className="space-y-1">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> Personal health dashboard
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            {userData?.display_name ? `Chào mừng, ${userData.display_name}` : 'Tài khoản người bệnh'}
          </h1>
          <p className="text-xs text-zinc-400">
            {userData?.email} · <span className="font-semibold text-emerald-300">Tài khoản đã xác minh</span>
          </p>
        </div>

        <div className="relative flex flex-wrap gap-2"><Link href="/tro-ly" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-violet-100"><MessageSquareText className="h-3.5 w-3.5" /> Hỏi trợ lý <ArrowUpRight className="h-3.5 w-3.5" /></Link><button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-4 text-xs font-medium text-zinc-300 transition hover:bg-black/30 hover:text-white"><LogOut className="h-3.5 w-3.5" /><span>Đăng xuất</span></button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3"><div className="glass-panel rounded-2xl p-5"><Calendar className="mb-4 h-5 w-5 text-violet-300" /><p className="text-2xl font-semibold text-white">{appointments.length}</p><p className="text-xs text-zinc-500">Lịch hẹn trong tài khoản</p></div><div className="glass-panel rounded-2xl p-5"><ShieldCheck className="mb-4 h-5 w-5 text-emerald-300" /><p className="text-sm font-semibold text-white">Đã xác minh</p><p className="mt-1 text-xs text-zinc-500">Trạng thái bảo mật email</p></div><Link href="/tro-ly" className="glass-panel group rounded-2xl p-5 transition hover:border-violet-400/30"><MessageSquareText className="mb-4 h-5 w-5 text-cyan-300" /><p className="flex items-center justify-between text-sm font-semibold text-white">Phiên AI mới <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-white" /></p><p className="mt-1 text-xs text-zinc-500">Mô tả triệu chứng ngay</p></Link></div>

      {/* Navigation tabs */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1.5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`whitespace-nowrap rounded-xl px-4 py-2.5 transition-colors ${
            activeTab === 'appointments' ? 'bg-white/[0.09] text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Lịch hẹn khám ({appointments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`whitespace-nowrap rounded-xl px-4 py-2.5 transition-colors ${
            activeTab === 'profile' ? 'bg-white/[0.09] text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Thông tin cá nhân
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`whitespace-nowrap rounded-xl px-4 py-2.5 transition-colors ${
            activeTab === 'security' ? 'bg-white/[0.09] text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Bảo mật & Quyền riêng tư
        </button>
      </div>

      {/* Tab 1: Appointments List */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-ink">
              Lịch khám đã đăng ký
            </h2>
            <Link
              href="/dat-lich"
              className="text-xs font-bold text-mineral hover:underline"
            >
              + Đăng ký khám mới
            </Link>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <article
                  key={apt.id}
                  className="p-5 bg-paper-raised rounded-xl border border-line space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-mineral bg-sage px-2.5 py-0.5 rounded">
                      Khoa {apt.specialty_id.toUpperCase()}
                    </span>
                    <span className="text-xs text-ink-muted font-mono">
                      Mã: {apt.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-mineral" />
                      <span>Ngày: <strong>{apt.appointment_date}</strong> (Giờ: {apt.appointment_time})</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-mineral" />
                      <span>Người khám: <strong>{apt.patient_name}</strong> ({apt.patient_phone})</span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-line text-[11px] text-ink-muted flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Địa điểm: {CLINIC_INFO.address}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-paper-raised rounded-xl border border-line text-center space-y-3">
              <Calendar className="w-8 h-8 mx-auto text-ink-muted" />
              <p className="text-sm text-ink-muted">Bạn chưa có lịch hẹn khám nào.</p>
              <Link
                href="/dat-lich"
                className="inline-block px-5 py-2 bg-mineral hover:bg-mineral-hover text-white text-xs font-bold rounded-md"
              >
                Đăng ký lịch khám ngay
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profile */}
      {activeTab === 'profile' && (
        <div className="max-w-xl space-y-5 bg-paper-raised p-6 rounded-xl border border-line">
          <h2 className="text-lg font-serif font-bold text-ink">Thông tin cá nhân</h2>
          <div className="space-y-3 text-xs text-ink">
            <div>
              <span className="text-ink-muted block text-[11px] uppercase tracking-wider">Họ và tên</span>
              <p className="font-semibold text-sm">{userData?.display_name || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px] uppercase tracking-wider">Email</span>
              <p className="font-semibold text-sm">{userData?.email}</p>
            </div>
            <div>
              <span className="text-ink-muted block text-[11px] uppercase tracking-wider">Trạng thái hồ sơ</span>
              <p className="font-semibold text-mineral">Đã kích hoạt xác thực email</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security */}
      {activeTab === 'security' && (
        <div className="max-w-xl space-y-5 bg-paper-raised p-6 rounded-xl border border-line">
          <h2 className="text-lg font-serif font-bold text-ink">Bảo mật & Quyền riêng tư</h2>
          <div className="space-y-4 text-xs text-ink-muted">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-mineral shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Mã hóa mật khẩu Argon2id</p>
                <p>Mật khẩu của bạn được băm và bảo vệ bằng tiêu chuẩn bộ nhớ cứng an toàn nhất.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-mineral shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Phiên làm việc HttpOnly</p>
                <p>Cookie phiên được bảo vệ hoàn toàn khỏi các kịch bản JavaScript độc hại (XSS).</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
