'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(initialEmail);
  const [code, setCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Đặt lại mật khẩu không thành công.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dang-nhap');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 md:py-20 space-y-8 animate-[fadeIn_200ms_ease-out]">
      <div className="space-y-2 border-b border-line pb-6 text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">
          Sổ tay người bệnh · Cập nhật
        </span>
        <h1 className="text-2xl font-serif font-bold text-ink">
          Đặt lại mật khẩu mới
        </h1>
        <p className="text-xs text-ink-muted">
          Nhập mã xác thực đã nhận và thiết lập mật khẩu mới.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-emergency-soft border border-emergency text-emergency text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-md bg-sage border border-mineral text-mineral text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Mật khẩu đã đổi thành công! Đang chuyển đến Đăng nhập...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Email tài khoản
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
          />
        </div>

        <div>
          <label htmlFor="reset-code" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Mã khôi phục (6 chữ số)
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reset-code"
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm font-mono text-ink tracking-widest focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reset-new-password" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Mật khẩu mới (Tối thiểu 8 ký tự, gồm chữ và số)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reset-new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full flex items-center justify-center gap-2 py-3 bg-mineral hover:bg-mineral-hover text-white font-bold text-sm rounded-md transition-colors shadow-xs disabled:opacity-50 min-h-[46px]"
        >
          <span>{loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="max-w-md mx-auto p-12 text-center text-sm text-ink-muted">Đang nạp...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
