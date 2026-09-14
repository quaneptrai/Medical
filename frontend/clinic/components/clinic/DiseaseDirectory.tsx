'use client';

import * as React from 'react';
import Link from 'next/link';
import { RotateCcw, Search, ShieldAlert, Sparkles } from 'lucide-react';

export type DiseaseIndexEntry = {
  slug: string;
  name: string;
  system: string;
  systemName: string;
  urgency: string;
  letter: string;
  keywords: string;
};

const ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVXY'.split('');
const QUICK_SEARCHES = ['Đau đầu', 'Khó thở', 'Đau ngực', 'Đau bụng', 'Sốt', 'Phát ban'];
const URGENCY_CHIP: Record<string, { label: string; className: string }> = {
  moderate: { label: 'Nên khám sớm', className: 'bg-[#fff8df] text-[#70550a]' },
  medium: { label: 'Nên khám sớm', className: 'bg-[#fff8df] text-[#70550a]' },
  moderate_to_high: { label: 'Khám sớm', className: 'bg-[#fff0cf] text-[#70550a]' },
  high: { label: 'Khám ngay', className: 'bg-[#fff3ef] text-[#a4262c]' },
  emergency: { label: 'Cấp cứu', className: 'bg-[#a4262c] text-white' },
  critical: { label: 'Nguy cấp', className: 'bg-[#a4262c] text-white' },
};

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function DiseaseDirectory({
  entries,
  systems,
}: {
  entries: DiseaseIndexEntry[];
  systems: Array<{ slug: string; name: string }>;
}) {
  const [query, setQuery] = React.useState('');
  const [system, setSystem] = React.useState('all');
  const [letter, setLetter] = React.useState('all');
  const [sort, setSort] = React.useState<'name' | 'system'>('name');

  const visible = React.useMemo(() => {
    const needle = plain(query.trim());
    const matches = entries.filter((entry) => {
      if (system !== 'all' && entry.system !== system) return false;
      if (letter !== 'all' && entry.letter !== letter) return false;
      if (!needle) return true;
      return entry.keywords.includes(needle);
    });
    return [...matches].sort((a, b) => {
      if (sort === 'system') {
        const bySystem = a.systemName.localeCompare(b.systemName, 'vi');
        if (bySystem) return bySystem;
      }
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [entries, query, system, letter, sort]);

  const grouped = React.useMemo(() => {
    const buckets = new Map<string, DiseaseIndexEntry[]>();
    for (const entry of visible) {
      const list = buckets.get(entry.letter) || [];
      list.push(entry);
      buckets.set(entry.letter, list);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const availableLetters = React.useMemo(() => new Set(entries.map((entry) => entry.letter)), [entries]);
  const hasFilters = Boolean(query || system !== 'all' || letter !== 'all');

  const reset = () => {
    setQuery('');
    setSystem('all');
    setLetter('all');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-[#d8e4df] bg-white p-3 shadow-[0_10px_28px_rgba(27,78,69,.05)]">
        <label className="flex items-center gap-2 rounded-xl bg-[#f4f9f7] px-4">
          <Search className="h-4 w-4 text-[#87a19b]" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setLetter('all'); }}
            placeholder="Nhập tên bệnh hoặc một triệu chứng bạn đang gặp…"
            className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#93a5a1]"
            aria-label="Tìm bệnh trong cẩm nang"
          />
          {query ? <button type="button" onClick={() => setQuery('')} className="text-xs font-bold text-[#87a19b]">Xóa</button> : null}
        </label>
        <div className="flex flex-wrap items-center gap-2 px-1 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[.08em] text-[#879995]">Tìm nhanh theo triệu chứng</span>
          {QUICK_SEARCHES.map((item) => (
            <button key={item} type="button" onClick={() => { setQuery(item); setLetter('all'); }} className="rounded-full border border-[#d8e4df] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#526a65] hover:border-[#8fc7b9] hover:text-[#075f59]">
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={system === 'all'} onClick={() => setSystem('all')}>Tất cả hệ cơ quan</FilterChip>
        {systems.map((item) => (
          <FilterChip key={item.slug} active={system === item.slug} onClick={() => setSystem(item.slug)}>{item.name}</FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[#d8e4df] bg-white px-3 py-2">
        <span className="mr-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">A–Z</span>
        <button
          type="button"
          onClick={() => setLetter('all')}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${letter === 'all' ? 'bg-[#087f73] text-white' : 'text-[#4e625e] hover:bg-[#eaf6f1]'}`}
        >
          Tất cả
        </button>
        {ALPHABET.map((item) => {
          const enabled = availableLetters.has(item);
          return (
            <button
              key={item}
              type="button"
              disabled={!enabled}
              onClick={() => setLetter(item)}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                letter === item ? 'bg-[#087f73] text-white' : enabled ? 'text-[#4e625e] hover:bg-[#eaf6f1]' : 'cursor-default text-[#cbd7d3]'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-[#60736f]">
          Đang hiển thị <strong className="text-[#18312d]">{visible.length}</strong> / {entries.length} mục bệnh lý.
        </p>
        <div className="flex items-center gap-2">
          {hasFilters ? (
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075f59]"><RotateCcw className="h-3.5 w-3.5" /> Xóa bộ lọc</button>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-[#60736f]">
            <span>Sắp xếp</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as 'name' | 'system')} className="rounded-lg border border-[#d8e4df] bg-white px-2.5 py-1.5 font-bold text-[#18312d] outline-none">
              <option value="name">Tên A–Z</option>
              <option value="system">Hệ cơ quan</option>
            </select>
          </label>
        </div>
      </div>

      {grouped.length ? (
        <div className="space-y-6">
          {grouped.map(([group, items]) => (
            <section key={group}>
              <h2 className="mb-3 flex items-center gap-3 text-2xl text-[#087f73]">
                {group}
                <span className="h-px flex-1 bg-[#e3ece9]" />
                <span className="text-xs font-bold text-[#879995]">{items.length} mục</span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {items.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/benh/${entry.slug}`}
                    className="group rounded-xl border border-[#e0e9e5] bg-white px-4 py-3 transition-colors hover:border-[#8fc7b9] hover:bg-[#fbfdfc]"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <strong className="block text-sm leading-snug text-[#18312d] group-hover:text-[#087f73]">{entry.name}</strong>
                      {URGENCY_CHIP[entry.urgency] ? (
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-extrabold ${URGENCY_CHIP[entry.urgency].className}`}>{URGENCY_CHIP[entry.urgency].label}</span>
                      ) : null}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[11px] text-[#879995]">
                      {['high', 'emergency', 'critical'].includes(entry.urgency) ? <ShieldAlert className="h-3 w-3 text-[#a4262c]" /> : null}
                      {entry.systemName}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c7ded7] bg-[#f7fbf9] p-12 text-center text-sm text-[#60736f]">
          <Sparkles className="mx-auto mb-3 h-5 w-5 text-[#087f73]" />
          <strong className="block text-[#18312d]">Chưa có mục nào khớp với từ khóa và bộ lọc.</strong>
          <span className="mt-1 block">Hãy xóa bớt bộ lọc hoặc{' '}
          <Link href="/tro-ly" className="font-bold text-[#075f59] underline">mô tả triệu chứng cho trợ lý sức khỏe</Link>.</span>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
        active ? 'border-[#087f73] bg-[#087f73] text-white' : 'border-[#d8e4df] bg-white text-[#4e625e] hover:border-[#8fc7b9]'
      }`}
    >
      {children}
    </button>
  );
}
