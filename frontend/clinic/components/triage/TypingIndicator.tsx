import * as React from 'react';
import { cn } from '@/lib/utils';

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-4 py-3 bg-neutral-100 rounded-lg rounded-bl-none text-neutral-500 border border-neutral-200 shadow-sm',
        className
      )}
      aria-label="Trợ lý đang phân tích..."
      role="status"
    >
      <span className="text-xs font-medium mr-1 text-neutral-400">Đang đối chiếu 652 mục bệnh</span>
      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
    </div>
  );
}
