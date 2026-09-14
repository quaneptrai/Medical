'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, AtSign, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản dịch vụ và chính sách bảo mật.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, displayName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Đăng ký không thành công.');
      }

      router.push(`/xac-minh-email?email=${encodeURIComponent(data.email || email)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="register">
      <div className="space-y-7">
      <div className="space-y-2 border-b border-line pb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#087f73]">
          Bắt đầu hồ sơ chăm sóc
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white">
          Tạo tài khoản Quang Thanh
        </h1>
        <p className="text-sm text-zinc-500">
          Quản lý lịch hẹn và hồ sơ cá nhân trong một không gian riêng tư.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-emergency-soft border border-emergency text-emergency text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Họ và tên
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-username" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Tên đăng nhập *
          </label>
          <div className="relative">
            <AtSign className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="nguyenvana"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-ink-muted">
            3–30 ký tự, bắt đầu bằng chữ cái, chỉ dùng chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.
            Bạn có thể đăng nhập bằng tên này hoặc bằng email.
          </p>
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Địa chỉ Email *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nguyen.van.a@gmail.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Mật khẩu khởi tạo * (Tối thiểu 8 ký tự, gồm chữ và số)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="terms"
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-line text-mineral focus:ring-mineral"
          />
          <label htmlFor="terms" className="text-xs text-ink-muted leading-relaxed">
            Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo vệ dữ liệu y tế cá nhân tại Phòng khám Quang Thanh.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-mineral hover:bg-mineral-hover text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 min-h-[48px]"
        >
          <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký & Nhận mã xác minh'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
        <p>Đã có tài khoản?</p>
        <Link
          href="/dang-nhap"
          className="font-bold text-mineral hover:underline"
        >
          Đăng nhập ngay
        </Link>
      </div>
      </div>
    </AuthShell>
  );
}
