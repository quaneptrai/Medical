'use client';

import * as React from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQS } from '@/lib/clinic-data';
import { cn } from '@/lib/utils';

export function FAQAccordion({ className }: { className?: string }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      className={cn('py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8', className)}
      aria-labelledby="faq-heading"
    >
      <div className="text-center mb-10 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block">
          Giải đáp thắc mắc
        </span>
        <h2
          id="faq-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight font-heading"
        >
          Câu hỏi thường gặp
        </h2>
        <p className="text-sm md:text-base text-neutral-600">
          Những thông tin quan trọng về quy trình khám, bảo hiểm và trợ lý phân loại Phòng khám YG.
        </p>
      </div>

      <div className="space-y-3" role="region" aria-label="Danh sách câu hỏi thường gặp">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-lg border border-neutral-200 bg-neutral-0 overflow-hidden shadow-2xs transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleIndex(idx)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
                id={`faq-question-${idx}`}
                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left font-semibold text-neutral-800 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
              >
                <span className="text-sm sm:text-base">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180 text-brand-600'
                  )}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                  className="px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 mt-1 animate-[fadeIn_150ms_ease-out]"
                >
                  <p className="pt-3">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
