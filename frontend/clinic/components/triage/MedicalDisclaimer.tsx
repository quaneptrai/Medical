import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MedicalDisclaimerProps {
  className?: string;
  variant?: 'subtle' | 'card' | 'inline';
}

export function MedicalDisclaimer({ className, variant = 'subtle' }: MedicalDisclaimerProps) {
  if (variant === 'inline') {
    return (
      <p className={cn('text-xs text-neutral-500 leading-relaxed flex items-center gap-1.5', className)}>
        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
        <span>
          Gợi ý tham khảo ban đầu — <strong>không thay thế thăm khám của bác sĩ</strong>.
        </span>
      </p>
    );
  }

  return (
    <aside
      className={cn(
        'rounded-md bg-neutral-50 border-l-4 border-neutral-300 p-3.5 text-xs text-neutral-600 leading-relaxed flex items-start gap-2.5',
        className
      )}
      aria-label="Giới hạn trách nhiệm y khoa"
    >
      <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-semibold text-neutral-700 mb-0.5">Lưu ý y khoa quan trọng</p>
        <p>
          Trợ lý này cung cấp thông tin tra cứu và định hướng phân loại ban đầu,{' '}
          <strong>không thay thế chẩn đoán hoặc kết luận của bác sĩ chuyên khoa</strong>. Nếu bạn có triệu chứng kéo dài hoặc diễn tiến xấu đi, hãy đến cơ sở y tế để được thăm khám trực tiếp.
        </p>
      </div>
    </aside>
  );
}
