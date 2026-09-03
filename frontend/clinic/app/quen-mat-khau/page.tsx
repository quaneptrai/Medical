'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error('Không thể gửi yêu cầu đặt lại mật khẩu.');
      }

      setSubmitted(true);
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
          Sổ tay người bệnh · Khôi phục
        </span>
        <h1 className="text-2xl font-serif font-bold text-ink">
          Quên mật khẩu
        </h1>
        <p className="text-xs text-ink-muted">
          Nhập email đã đăng ký để nhận mã xác thực đặt lại mật khẩu.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-emergency-soft border border-emergency text-emergency text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-6 text-center">
          <div className="p-4 rounded-md bg-sage border border-mineral text-mineral text-xs flex items-start gap-2 text-left">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Nếu email <strong>{email}</strong> tồn tại trong hệ thống, mã khôi phục đã được tạo. Vui lòng kiểm tra hộp thư.
            </p>
          </div>

          <Link
            href={`/dat-lai-mat-khau?email=${encodeURIComponent(email)}`}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-mineral hover:bg-mineral-hover text-white font-bold text-sm rounded-md shadow-xs transition-colors"
          >
            <span>Tiếp tục nhập mã đặt lại</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nguyen.van.a@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-line bg-paper-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mineral"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-mineral hover:bg-mineral-hover text-white font-bold text-sm rounded-md transition-colors shadow-xs disabled:opacity-50 min-h-[46px]"
          >
            <span>{loading ? 'Đang xử lý...' : 'Gửi mã khôi phục'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="text-center">
        <Link href="/dang-nhap" className="text-xs text-mineral hover:underline font-medium">
          ← Quay lại trang Đăng nhập
        </Link>
      </div>
    </div>
  );
}
