'use client';

import * as React from 'react';
import { useAdminDialog } from './useAdminDialog';
import { ROLE_LABELS, STATUS_LABELS, AUDIT_LABELS } from '@/lib/admin-labels';
import {
  Ban, CalendarCheck, CircleUser, Clock4, History, IdCard, Loader2, ScrollText, ShieldCheck, UserSearch, X,
} from 'lucide-react';

export type AdminUser = {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  status: string;
  is_verified: number;
  created_at: number;
  profile_updated_at: number | null;
  last_session_at: number | null;
  appointment_count: number;
  roles: string;
};

export type AdminRole = { id: string; code: string; name: string; user_count: number; permission_count: number };

type UserDetail = {
  user: AdminUser & { updated_at: number };
  audit: Array<{ id: string; action: string; resource_type: string; resource_id: string; details: string; ip_address: string; created_at: number }>;
  sessions: Array<{ id: string; created_at: number; expires_at: number; user_agent: string; ip_address: string }>;
  appointments: Array<{ id: string; appointment_date: string; appointment_time: string; status: string; queue_number: number; specialty_name: string; doctor_name: string }>;
  activeSessions: number;
};

const GENDER_TEXT: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };

const dateTime = (seconds: number | null) =>
  seconds ? new Date(seconds * 1000).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const dateOnly = (seconds: number | null) =>
  seconds ? new Date(seconds * 1000).toLocaleDateString('vi-VN') : '—';

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Trạng thái tài khoản: đang hoạt động, bị tạm khóa, hay chưa xác minh email. */
function AccountState({ user }: { user: AdminUser }) {
  if (user.status === 'suspended') {
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fdeceb] px-2.5 py-1 text-[11px] font-bold text-[#a4262c]"><Ban className="h-3.5 w-3.5" /> Đang bị chặn</span>;
  }
  if (!user.is_verified) {
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff4d9] px-2.5 py-1 text-[11px] font-bold text-[#70550a]"><Clock4 className="h-3.5 w-3.5" /> Chưa xác minh</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e4f6ee] px-2.5 py-1 text-[11px] font-bold text-[#075f59]"><ShieldCheck className="h-3.5 w-3.5" /> Đang hoạt động</span>;
}

function RoleToggles({ user, roles, onChanged }: { user: AdminUser; roles: AdminRole[]; onChanged: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const current = (user.roles || '').split(',').filter(Boolean);
  const update = async (code: string, enabled: boolean) => {
    setSaving(true); setError('');
    try {
    const next = enabled ? Array.from(new Set([...current, code])) : current.filter((item) => item !== code);
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'user_roles', id: user.id, value: next }),
    });
    if (!response.ok) throw new Error((await response.json()).detail || 'Không thể lưu vai trò.');
    await onChanged();
    } catch (error) { setError(error instanceof Error ? error.message : 'Mất kết nối. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  return (
    <div className="flex flex-wrap gap-1">
      {error && <p role="alert" className="admin-error w-full">{error}</p>}
      {roles.map((role) => {
        const active = current.includes(role.code);
        const locked = role.code === 'super_admin' && active;
        return (
          <label
            key={role.code}
            title={role.name}
            className={`cursor-pointer rounded-md border focus-within:ring-2 focus-within:ring-[#147d70] px-2 py-1 text-[10px] font-bold ${active ? 'border-[#8fc7b9] bg-[#eaf6f1] text-[#075f59]' : 'border-[#d8e4df] text-[#71827e]'}`}
          >
            <input type="checkbox" className="sr-only" checked={active} disabled={locked || saving} onChange={(event) => update(role.code, event.target.checked)} />
            {ROLE_LABELS[role.code] || role.name}
          </label>
        );
      })}
    </div>
  );
}

function BlockControl({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const isProtected = (user.roles || '').split(',').includes('super_admin');
  const suspended = user.status === 'suspended';

  if (isProtected) {
    return <span className="rounded-lg bg-[#fff1bf] px-3 py-2 text-[10px] font-extrabold text-[#70550a]">Quyền cao nhất · không thể chặn</span>;
  }

  const toggle = async () => {
    setSaving(true); setError('');
    try {
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'user_status', id: user.id, value: suspended ? 'active' : 'suspended' }),
    });
    if (!response.ok) throw new Error((await response.json()).detail || 'Không thể cập nhật tài khoản.');
    await onChanged();
    } catch (error) { setError(error instanceof Error ? error.message : 'Mất kết nối. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };

  return (
    <div>{error && <p role="alert" className="admin-error">{error}</p>}<button
      type="button"
      onClick={toggle}
      disabled={saving}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors disabled:opacity-60 ${
        suspended ? 'bg-[#e4f6ee] text-[#075f59] hover:bg-[#d3efe3]' : 'border border-[#e6cdc9] bg-white text-[#a4262c] hover:bg-[#fdeceb]'
      }`}
    >
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
      {suspended ? 'Bỏ chặn' : 'Chặn'}
    </button></div>
  );
}

function DetailDrawer({ userId, roles, onClose, onChanged }: { userId: string; roles: AdminRole[]; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = React.useState<UserDetail | null>(null);
  const [error, setError] = React.useState('');

  const dialogRef = useAdminDialog(true, onClose);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setError('');
    setDetail(null);
    fetch(`/api/admin/users/${userId}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Không tải được hồ sơ.');
        setDetail(data);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [userId, version]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[#0d1f1c]/40">
      <button type="button" aria-label="Đóng" tabIndex={-1} className="flex-1 cursor-default" onClick={onClose} />
      <aside ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Chi tiết người dùng" className="w-full max-w-[620px] overflow-y-auto bg-[#fbfdfc] p-4 sm:p-8 shadow-[-20px_0_60px_rgba(13,31,28,.18)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="clinic-kicker">Hồ sơ người dùng</span>
            <h2 className="mt-1 font-sans text-2xl font-bold">{detail?.user.full_name || detail?.user.display_name || 'Chưa đặt tên'}</h2>
            {detail ? <p className="mt-1 text-xs text-[#60736f]">{detail.user.username ? `${detail.user.username} · ` : ''}{detail.user.email}</p> : null}
          </div>
          <button type="button" aria-label="Đóng chi tiết người dùng" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d8e4df] bg-white text-[#60736f]"><X className="h-4 w-4" /></button>
        </div>

        {error ? <p className="rounded-xl border border-[#eecfc8] bg-[#fff3ef] px-4 py-3 text-xs text-[#a4262c]">{error}</p> : null}
        {!detail && !error ? <p className="text-sm text-[#60736f]">Đang tải hồ sơ...</p> : null}

        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <AccountState user={detail.user} />
              <span className="rounded-lg bg-[#eef4f2] px-2.5 py-1 text-[11px] font-bold text-[#4e625e]">{detail.activeSessions} phiên còn hiệu lực</span>
              <span className="rounded-lg bg-[#eef4f2] px-2.5 py-1 text-[11px] font-bold text-[#4e625e]">{detail.appointments.length} lịch khám</span>
            </div>

            <Card icon={<IdCard className="h-4 w-4" />} title="Thông tin cá nhân">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Họ và tên" value={detail.user.full_name} />
                <Field label="Số điện thoại" value={detail.user.phone} />
                <Field label="Ngày sinh" value={detail.user.date_of_birth} />
                <Field label="Giới tính" value={detail.user.gender ? GENDER_TEXT[detail.user.gender] : ''} />
                <div className="col-span-2"><Field label="Địa chỉ" value={detail.user.address} /></div>
                <Field label="Ngày tạo tài khoản" value={dateTime(detail.user.created_at)} />
                <Field label="Cập nhật hồ sơ" value={dateTime(detail.user.profile_updated_at)} />
              </dl>
            </Card>

            <Card icon={<ShieldCheck className="h-4 w-4" />} title="Vai trò và truy cập">
              <RoleToggles user={detail.user} roles={roles} onChanged={async () => { await onChanged(); setVersion(value => value + 1); }} />
              <div className="mt-4 flex items-center justify-between border-t border-[#eaf1ee] pt-4">
                <span className="text-xs text-[#60736f]">Lần đăng nhập gần nhất: {dateTime(detail.user.last_session_at)}</span>
                <BlockControl user={detail.user} onChanged={() => { onChanged(); onClose(); }} />
              </div>
            </Card>

            <Card icon={<CalendarCheck className="h-4 w-4" />} title={`Lịch khám (${detail.appointments.length})`}>
              {detail.appointments.length ? (
                <div className="space-y-2">
                  {detail.appointments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                      <span><strong>{item.appointment_date}</strong> · {item.appointment_time}</span>
                      <span className="text-[#60736f]">{item.specialty_name || '—'}{item.doctor_name ? ` · ${item.doctor_name}` : ''}</span>
                      <span className="rounded bg-[#eef4f2] px-2 py-0.5 font-bold text-[#4e625e]">{STATUS_LABELS[item.status] || item.status}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty>Chưa có lịch khám nào.</Empty>}
            </Card>

            <Card icon={<History className="h-4 w-4" />} title={`Phiên đăng nhập gần đây (${detail.sessions.length})`}>
              {detail.sessions.length ? (
                <div className="space-y-2">
                  {detail.sessions.map((item) => (
                    <div key={item.id} className="rounded-lg bg-white px-3 py-2 text-xs">
                      <div className="flex justify-between">
                        <strong>{dateTime(item.created_at)}</strong>
                        <span className={item.expires_at * 1000 > Date.now() ? 'font-bold text-[#075f59]' : 'text-[#9fb2ad]'}>
                          {item.expires_at * 1000 > Date.now() ? 'còn hiệu lực' : 'đã hết hạn'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[#879995]">{item.ip_address || 'không rõ IP'} · {item.user_agent || 'không rõ thiết bị'}</p>
                    </div>
                  ))}
                </div>
              ) : <Empty>Chưa có phiên đăng nhập nào được ghi nhận.</Empty>}
            </Card>

            <Card icon={<ScrollText className="h-4 w-4" />} title={`Lịch sử thao tác (${detail.audit.length})`}>
              {detail.audit.length ? (
                <div className="space-y-2">
                  {detail.audit.map((item) => (
                    <div key={item.id} className="rounded-lg bg-white px-3 py-2 text-xs">
                      <div className="flex justify-between gap-3">
                        <strong className="text-[#18312d]">{AUDIT_LABELS[item.action] || item.action}</strong>
                        <span className="shrink-0 text-[#879995]">{dateTime(item.created_at)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#879995]">
                        {item.resource_type}{item.resource_id ? ` · ${item.resource_id}` : ''}{item.ip_address ? ` · ${item.ip_address}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : <Empty>Người dùng này chưa phát sinh thao tác nào được ghi nhật ký.</Empty>}
            </Card>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#d8e4df] bg-[#f6faf8] p-5">
      <div className="mb-4 flex items-center gap-2 text-[#075f59]">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white">{icon}</span>
        <h3 className="font-sans text-sm font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] text-[#879995]">{label}</dt>
      <dd className={value ? 'font-semibold text-[#18312d]' : 'text-[#c0ccc8]'}>{value || 'Chưa cập nhật'}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-[#cfe0da] bg-white px-4 py-5 text-center text-xs text-[#879995]">{children}</p>;
}

export function UserDirectory({ users, roles, onChanged }: { users: AdminUser[]; roles: AdminRole[]; onChanged: () => void }) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'suspended' | 'unverified' | 'staff'>('all');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const visible = React.useMemo(() => {
    const needle = plain(query.trim());
    return users.filter((user) => {
      if (filter === 'suspended' && user.status !== 'suspended') return false;
      if (filter === 'unverified' && user.is_verified) return false;
      if (filter === 'staff' && !(user.roles || '').split(',').some((role) => role && role !== 'patient')) return false;
      if (!needle) return true;
      return plain([user.email, user.username, user.display_name, user.full_name, user.phone, user.roles, (user.roles || '').split(',').map(role => ROLE_LABELS[role] || role).join(' ')].filter(Boolean).join(' ')).includes(needle);
    });
  }, [users, query, filter]);

  const counts = React.useMemo(() => ({
    all: users.length,
    suspended: users.filter((user) => user.status === 'suspended').length,
    unverified: users.filter((user) => !user.is_verified).length,
    staff: users.filter((user) => (user.roles || '').split(',').some((role) => role && role !== 'patient')).length,
  }), [users]);

  const filters: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: `Tất cả (${counts.all})` },
    { key: 'staff', label: `Nhân sự (${counts.staff})` },
    { key: 'unverified', label: `Chưa xác minh (${counts.unverified})` },
    { key: 'suspended', label: `Đang bị chặn (${counts.suspended})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#d8e4df] bg-white px-4">
          <UserSearch className="h-4 w-4 text-[#87a19b]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, email, tên đăng nhập, số điện thoại hoặc vai trò…"
            className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-[#93a5a1]"
            aria-label="Tìm người dùng"
          />
          {query ? <button type="button" onClick={() => setQuery('')} className="text-xs font-bold text-[#87a19b]">Xóa</button> : null}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${filter === item.key ? 'bg-[#087f73] text-white' : 'border border-[#d8e4df] bg-white text-[#4e625e] hover:border-[#8fc7b9]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[1.5fr_1.4fr_.7fr_.8fr_auto] gap-4 px-5 text-[10px] font-bold uppercase tracking-[.08em] text-[#879995]">
        <span>Người dùng</span><span>Vai trò</span><span>Ngày tạo</span><span>Trạng thái</span><span className="text-right">Thao tác</span>
      </div>

      <div className="space-y-2">
        {visible.length ? visible.map((user) => (
          <div key={user.id} className="grid grid-cols-[1.5fr_1.4fr_.7fr_.8fr_auto] items-center gap-4 rounded-xl border border-[#e0e9e5] bg-white px-5 py-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm">{user.full_name || user.display_name || 'Chưa đặt tên'}</strong>
              <span className="block truncate text-xs text-[#60736f]">{user.username ? `${user.username} · ` : ''}{user.email}</span>
            </div>
            <RoleToggles user={user} roles={roles} onChanged={onChanged} />
            <div className="text-xs">
              <p className="font-semibold text-[#18312d]">{dateOnly(user.created_at)}</p>
              <p className="text-[11px] text-[#879995]">Đăng nhập: {dateOnly(user.last_session_at)}</p>
            </div>
            <AccountState user={user} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenId(user.id)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d8e4df] bg-white px-3 text-[11px] font-bold text-[#4e625e] hover:border-[#8fc7b9]"
              >
                <CircleUser className="h-3.5 w-3.5" /> Chi tiết
              </button>
              <BlockControl user={user} onChanged={onChanged} />
            </div>
          </div>
        )) : (
          <Empty>Không có người dùng nào khớp với bộ lọc hiện tại.</Empty>
        )}
      </div>

      {openId ? <DetailDrawer userId={openId} roles={roles} onClose={() => setOpenId(null)} onChanged={onChanged} /> : null}
    </div>
  );
}
