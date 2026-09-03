'use client';

import * as React from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SymptomChipProps {
  label: string;
  onRemove?: () => void;
  isNew?: boolean;
  className?: string;
}

export function SymptomChip({ label, onRemove, isNew = false, className }: SymptomChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300',
        isNew
          ? 'bg-brand-100 text-brand-800 border-brand-300 scale-100 animate-[pulseOnce_600ms_ease-out]'
          : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:border-neutral-300',
        className
      )}
    >
      <Check className="w-3 h-3 text-brand-600 shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[160px]">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-200/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          aria-label={`Xóa triệu chứng ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
