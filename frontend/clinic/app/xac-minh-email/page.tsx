'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(initialEmail);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Xác minh không thành công.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/tai-khoan');
        router.refresh();
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
          Sổ tay người bệnh · Kích hoạt
        </span>
        <h1 className="text-2xl font-serif font-bold text-ink">
          Xác minh tài khoản
        </h1>
        <p className="text-xs text-ink-muted">
          Nhập mã xác thực 6 chữ số để hoàn tất kích hoạt.
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
          <span>Xác minh thành công! Đang chuyển hướng vào tài khoản...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="verify-email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Email tài khoản
          </label>
          <input
            id="verify-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nguyen.van.a@gmail.com"
            className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
          />
        </div>

        <div>
          <label htmlFor="verify-code" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
            Mã xác minh (6 chữ số)
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="verify-code"
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-base font-mono text-ink tracking-widest focus:outline-none focus:ring-2 focus:ring-mineral"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full flex items-center justify-center gap-2 py-3 bg-mineral hover:bg-mineral-hover text-white font-bold text-sm rounded-md transition-colors shadow-xs disabled:opacity-50 min-h-[46px]"
        >
          <span>{loading ? 'Đang kích hoạt...' : 'Kích hoạt tài khoản'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="max-w-md mx-auto p-12 text-center text-sm text-ink-muted">Đang nạp...</div>}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
