import { getDb } from './db';

export type Gender = 'male' | 'female' | 'other';

export type PatientProfile = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | '';
  address: string;
};

export type ProfileField = keyof PatientProfile;

/** Những mục phải khai đủ trước khi được đặt lịch khám. */
export const REQUIRED_PROFILE_FIELDS: ProfileField[] = ['fullName', 'phone', 'dateOfBirth', 'gender', 'address'];

export const PROFILE_LABELS: Record<ProfileField, string> = {
  fullName: 'Họ và tên',
  phone: 'Số điện thoại',
  dateOfBirth: 'Ngày sinh',
  gender: 'Giới tính',
  address: 'Địa chỉ liên hệ',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

export const USERNAME_RULE = 'Tên đăng nhập gồm 3–30 ký tự, bắt đầu bằng chữ cái, chỉ dùng chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.';
const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,29}$/;

export function normaliseUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateUsername(value: string): string | null {
  if (!USERNAME_PATTERN.test(value)) return USERNAME_RULE;
  return null;
}

export function emptyProfile(): PatientProfile {
  return { fullName: '', phone: '', dateOfBirth: '', gender: '', address: '' };
}

export function getProfile(userId: string): PatientProfile {
  const row = getDb()
    .prepare('SELECT full_name, phone, date_of_birth, gender, address FROM users WHERE id = ?')
    .get(userId) as Record<string, string | null> | undefined;
  if (!row) return emptyProfile();
  const gender = (row.gender || '') as Gender | '';
  return {
    fullName: row.full_name || '',
    phone: row.phone || '',
    dateOfBirth: row.date_of_birth || '',
    gender: gender === 'male' || gender === 'female' || gender === 'other' ? gender : '',
    address: row.address || '',
  };
}

export function missingProfileFields(profile: PatientProfile): ProfileField[] {
  return REQUIRED_PROFILE_FIELDS.filter((field) => !String(profile[field] || '').trim());
}

export function isProfileComplete(profile: PatientProfile): boolean {
  return missingProfileFields(profile).length === 0;
}

/** Kiểm tra từng trường; trả về thông báo đầu tiên không hợp lệ, hoặc null nếu đạt. */
export function validateProfile(profile: PatientProfile): string | null {
  const fullName = profile.fullName.trim();
  if (fullName.length < 2 || fullName.length > 100) return 'Họ và tên phải từ 2 đến 100 ký tự.';
  if (/\d/.test(fullName)) return 'Họ và tên không chứa chữ số.';

  const phone = profile.phone.replace(/[\s.-]/g, '');
  if (!/^(0|\+84)\d{8,10}$/.test(phone)) return 'Số điện thoại không hợp lệ (ví dụ: 0912345678).';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth)) return 'Ngày sinh không hợp lệ.';
  const birth = new Date(`${profile.dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return 'Ngày sinh không hợp lệ.';
  const now = Date.now();
  if (birth.getTime() > now) return 'Ngày sinh không thể nằm ở tương lai.';
  if (birth.getUTCFullYear() < 1900) return 'Ngày sinh không hợp lệ.';

  if (!['male', 'female', 'other'].includes(profile.gender)) return 'Vui lòng chọn giới tính.';

  const address = profile.address.trim();
  if (address.length < 5 || address.length > 200) return 'Địa chỉ phải từ 5 đến 200 ký tự.';

  return null;
}

export function saveProfile(userId: string, profile: PatientProfile): void {
  const now = Math.floor(Date.now() / 1000);
  getDb()
    .prepare(`UPDATE users SET full_name = ?, phone = ?, date_of_birth = ?, gender = ?, address = ?,
              display_name = COALESCE(NULLIF(?, ''), display_name), profile_updated_at = ?, updated_at = ? WHERE id = ?`)
    .run(
      profile.fullName.trim(),
      profile.phone.replace(/[\s.-]/g, ''),
      profile.dateOfBirth,
      profile.gender,
      profile.address.trim(),
      profile.fullName.trim(),
      now,
      now,
      userId,
    );
}

/** Tuổi tính theo năm, dùng để hiển thị trên hồ sơ và phiếu khám. */
export function ageFromDateOfBirth(dateOfBirth: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}
