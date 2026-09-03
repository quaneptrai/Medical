'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/tai-khoan';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.require_verification) {
          router.push(`/xac-minh-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        throw new Error(data.detail || 'Đăng nhập không thành công.');
      }

      router.push(returnUrl.startsWith('/') ? returnUrl : '/tai-khoan');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="login">
      <div className="space-y-7">
      <div className="space-y-2 border-b border-line pb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-300">
          Welcome back
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white">
          Đăng nhập Phòng khám YG
        </h1>
        <p className="text-sm text-zinc-500">
          Tiếp tục không gian sức khỏe và quản lý lịch hẹn của bạn.
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
          <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-email"
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
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-ink">
              Mật khẩu
            </label>
            <Link
              href="/quen-mat-khau"
              className="text-xs text-mineral hover:underline font-medium"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white hover:bg-violet-100 text-black font-semibold text-sm rounded-xl transition-all disabled:opacity-50 min-h-[48px]"
        >
          <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
        <p>Chưa có tài khoản?</p>
        <Link
          href="/dang-ky"
          className="font-bold text-mineral hover:underline"
        >
          Đăng ký tài khoản mới
        </Link>
      </div>

      <div className="p-3.5 bg-white/[0.025] rounded-xl border border-white/[0.08] text-[11px] text-zinc-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-mineral shrink-0" />
        <span>Bảo mật phiên bằng HttpOnly Cookie và mã hóa Argon2id chuẩn OWASP.</span>
      </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="max-w-xl mx-auto p-12 text-center text-sm text-ink-muted">Đang nạp...</div>}>
      <LoginContent />
    </React.Suspense>
  );
}
