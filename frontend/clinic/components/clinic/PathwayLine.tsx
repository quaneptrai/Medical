import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PathwayLineProps {
  className?: string;
  variant?: 'vertical' | 'curved' | 'horizontal';
  nodeCount?: number;
}

export function PathwayLine({ className, variant = 'vertical' }: PathwayLineProps) {
  if (variant === 'horizontal') {
    return (
      <div className={cn('w-full flex items-center justify-center my-6', className)} aria-hidden="true">
        <svg
          className="w-full max-w-4xl h-8 text-brand-300"
          viewBox="0 0 800 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 16H800"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="stroke-brand-200"
          />
          <circle cx="100" cy="16" r="4" className="fill-brand-600" />
          <circle cx="300" cy="16" r="4" className="fill-brand-600" />
          <circle cx="500" cy="16" r="4" className="fill-brand-600" />
          <circle cx="700" cy="16" r="4" className="fill-brand-600" />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center py-4', className)} aria-hidden="true">
      <div className="w-2.5 h-2.5 rounded-full bg-brand-600 shadow-xs" />
      <div className="w-[1.5px] h-16 bg-gradient-to-b from-brand-600 via-brand-300 to-brand-100" />
      <div className="w-1.5 h-1.5 rounded-full bg-brand-300" />
    </div>
  );
}
