'use client';

import * as React from 'react';
import Link from 'next/link';
import { Stethoscope, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CandidateResult } from '@/lib/botmedical-api';

export interface DiseaseCandidateProps {
  candidate: CandidateResult;
  rank: number;
  className?: string;
}

export function DiseaseCandidate({ candidate, rank, className }: DiseaseCandidateProps) {
  const getFitBadge = (score: number) => {
    if (score >= 0.7) {
      return { text: 'Rất phù hợp', bg: 'bg-sage text-mineral border-mineral' };
    }
    if (score >= 0.5) {
      return { text: 'Phù hợp', bg: 'bg-paper text-ink border-line' };
    }
    return { text: 'Có thể', bg: 'bg-paper text-ink-muted border-line' };
  };

  const fit = getFitBadge(candidate.score);

  return (
    <article
      className={cn(
        'p-4 bg-paper-raised rounded-lg border border-line space-y-3 shadow-2xs hover:border-mineral transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-ink-muted">0{rank}.</span>
            <h4 className="text-sm font-serif font-bold text-ink">
              {candidate.name}
            </h4>
          </div>
          <span className="text-[11px] font-mono text-mineral uppercase tracking-wider block">
            Khoa: {candidate.category.toUpperCase()}
          </span>
        </div>

        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', fit.bg)}>
          {fit.text}
        </span>
      </div>

      <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">
        {candidate.description}
      </p>

      {candidate.symptoms && candidate.symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {candidate.symptoms.slice(0, 3).map((sym, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-paper text-ink-muted px-2 py-0.5 rounded border border-line"
            >
              {sym}
            </span>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
        <span className="text-[11px] text-ink-muted">
          {candidate.urgency === 'high' ? 'Khuyên khám sớm' : 'Theo dõi hoặc khám định kỳ'}
        </span>
        <Link
          href={`/dat-lich?khoa=${encodeURIComponent(candidate.category)}`}
          className="text-xs font-bold text-mineral hover:underline inline-flex items-center gap-1"
        >
          <span>Khám khoa này</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </article>
  );
}
