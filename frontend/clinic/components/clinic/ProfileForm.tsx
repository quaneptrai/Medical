'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Loader2, MapPin, Save, User } from 'lucide-react';

export type PatientProfile = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  address: string;
};

export const emptyProfile: PatientProfile = { fullName: '', phone: '', dateOfBirth: '', gender: '', address: '' };

const GENDERS: Array<{ value: PatientProfile['gender']; label: string }> = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
];

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Họ và tên',
  phone: 'Số điện thoại',
  dateOfBirth: 'Ngày sinh',
  gender: 'Giới tính',
  address: 'Địa chỉ liên hệ',
};

export function missingLabels(missing: string[]): string {
  return missing.map((field) => FIELD_LABELS[field] || field).join(', ');
}

const inputClass =
  'w-full min-h-11 rounded-xl border border-[#d8e4df] bg-white px-3.5 text-sm text-[#18312d] outline-none transition-colors focus:border-[#8fc7b9] focus:ring-2 focus:ring-[#087f73]/20';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[.08em] text-[#60736f]';

export function ProfileForm({
  initialProfile,
  email,
  username,
  submitLabel = 'Lưu thông tin',
  onSaved,
}: {
  initialProfile: PatientProfile;
  email?: string;
  username?: string;
  submitLabel?: string;
  onSaved?: (profile: PatientProfile) => void;
}) {
  const [profile, setProfile] = React.useState<PatientProfile>(initialProfile);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  const update = <K extends keyof PatientProfile>(key: K, value: PatientProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không lưu được thông tin.');
      setProfile(data.profile);
      setSaved(true);
      onSaved?.(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin.');
    } finally {
      setSaving(false);
    }
  };

  // Ngày sinh không thể ở tương lai.
  const today = new Date().toLocaleDateString('en-CA');

  return (
    <form onSubmit={submit} className="space-y-5">
      {email || username ? (
        <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-[#f4f9f7] px-4 py-3 text-xs text-[#60736f]">
          {username ? <span>Tên đăng nhập: <strong className="text-[#18312d]">{username}</strong></span> : null}
          {email ? <span>Email: <strong className="text-[#18312d]">{email}</strong></span> : null}
        </div>
      ) : null}

      {error ? (
        <p className="flex items-start gap-2 rounded-xl border border-[#eecfc8] bg-[#fff3ef] px-4 py-3 text-xs leading-6 text-[#a4262c]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </p>
      ) : null}

      {saved ? (
        <p className="flex items-start gap-2 rounded-xl border border-[#bfe0d2] bg-[#eefaf4] px-4 py-3 text-xs leading-6 text-[#075f59]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Đã lưu thông tin cá nhân.
        </p>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="profile-full-name">Họ và tên *</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9fb2ad]" />
          <input
            id="profile-full-name"
            required
            autoComplete="name"
            value={profile.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            placeholder="Nguyễn Văn A"
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="profile-phone">Số điện thoại *</label>
          <input
            id="profile-phone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={profile.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="0912345678"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="profile-dob">Ngày sinh *</label>
          <input
            id="profile-dob"
            required
            type="date"
            max={today}
            min="1900-01-01"
            value={profile.dateOfBirth}
            onChange={(event) => update('dateOfBirth', event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Giới tính *</legend>
        <div className="flex gap-2">
          {GENDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update('gender', option.value)}
              aria-pressed={profile.gender === option.value}
              className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-bold transition-colors ${
                profile.gender === option.value
                  ? 'border-[#087f73] bg-[#087f73] text-white'
                  : 'border-[#d8e4df] bg-white text-[#4e625e] hover:border-[#8fc7b9]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="profile-address">Địa chỉ liên hệ *</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-[#9fb2ad]" />
          <textarea
            id="profile-address"
            required
            rows={2}
            autoComplete="street-address"
            value={profile.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder="Số nhà, thôn/xóm, xã/phường, quận/huyện, tỉnh/thành phố"
            className={`${inputClass} resize-none py-3 pl-10`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-extrabold text-white transition-colors hover:bg-[#075f59] disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Đang lưu...' : submitLabel}
      </button>

      <p className="text-[11px] leading-5 text-[#879995]">
        Thông tin này dùng để lập hồ sơ khám bệnh và liên hệ xác nhận lịch hẹn. Phòng khám không chia sẻ cho bên thứ ba.
      </p>
    </form>
  );
}
