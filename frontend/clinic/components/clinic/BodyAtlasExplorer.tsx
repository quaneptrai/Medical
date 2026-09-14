'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, RotateCcw, Search, Sparkles } from 'lucide-react';

export type AtlasSystem = {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  organs: string[];
  count: number;
};

const REGION_ORDER = ['Tất cả', 'Đầu & giác quan', 'Lồng ngực', 'Ổ bụng & tiết niệu', 'Vận động & da', 'Sinh sản', 'Toàn thân'];

const REGION_MARKERS: Array<{ region: string; label: string; top: string; left: string }> = [
  { region: 'Đầu & giác quan', label: 'Đầu', top: '10%', left: '55%' },
  { region: 'Lồng ngực', label: 'Ngực', top: '45%', left: '53%' },
  { region: 'Ổ bụng & tiết niệu', label: 'Bụng', top: '72%', left: '49%' },
];

const plain = (value: string) => value
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase();

export function BodyAtlasExplorer({ systems }: { systems: AtlasSystem[] }) {
  const [region, setRegion] = React.useState('Tất cả');
  const [query, setQuery] = React.useState('');

  const visible = React.useMemo(() => {
    const needle = plain(query.trim());
    return systems.filter((system) => {
      if (region !== 'Tất cả' && system.region !== region) return false;
      if (!needle) return true;
      return plain([system.name, system.tagline, ...system.organs].join(' ')).includes(needle);
    });
  }, [query, region, systems]);

  const selectRegion = (nextRegion: string) => {
    setRegion(nextRegion);
    window.requestAnimationFrame(() => document.getElementById('atlas-results')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const reset = () => {
    setRegion('Tất cả');
    setQuery('');
  };

  return (
    <section aria-labelledby="body-atlas-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-5">
        <div>
          <span className="clinic-kicker">Bản đồ cơ thể</span>
          <h2 id="body-atlas-heading" className="mt-2 text-3xl">Chọn vùng hoặc tìm một cơ quan</h2>
          <p className="mt-2 text-sm text-[#60736f]">Ví dụ: dạ dày, tuyến giáp, mắt, cột sống…</p>
        </div>
        {(region !== 'Tất cả' || query) ? (
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-[#d8e4df] bg-white px-4 py-2.5 text-xs font-bold text-[#526a65] hover:border-[#8fc7b9]">
            <RotateCcw className="h-3.5 w-3.5" /> Xóa lựa chọn
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-[380px_minmax(0,1fr)] gap-6">
        <div className="rounded-[26px] border border-[#cfe1db] bg-[linear-gradient(160deg,#eaf6f1,#f8fcfa)] p-5">
          <div className="relative mx-auto aspect-[2/3] max-w-[380px] overflow-hidden rounded-2xl" aria-label="Sơ đồ các vùng cơ thể">
            <Image src="/images/human-anatomy-model-v2.png" alt="Mô hình giải phẫu minh họa đầu và thân người với não, tim, phổi, gan, dạ dày và ruột" fill sizes="(max-width: 820px) 90vw, 360px" className="object-contain" />

            {REGION_MARKERS.map((marker) => {
              const active = region === marker.region;
              return (
                <button
                  key={marker.region}
                  type="button"
                  onClick={() => selectRegion(marker.region)}
                  aria-pressed={active}
                  aria-label={`Xem ${marker.region}`}
                  title={marker.region}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_5px_15px_rgba(24,49,45,.18)] transition-transform hover:scale-110 focus-visible:scale-110 ${active ? 'h-11 w-11 border-white bg-[#ff8168]/90 ring-4 ring-[#ff8168]/20' : 'h-11 w-11 border-white bg-[#087f73]/85'}`}
                  style={{ top: marker.top, left: marker.left }}
                >
                  <span className="text-[10px] font-bold text-white">{marker.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 rounded-xl bg-white/80 px-4 py-3 text-center text-xs leading-5 text-[#60736f]">
            Mô hình giải phẫu minh họa bằng AI. Chạm vào đầu, ngực hoặc bụng để tra cứu; các nhóm khác nằm trong bộ lọc.
          </p>
        </div>

        <div className="min-w-0">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#d8e4df] bg-white px-4 shadow-[0_8px_24px_rgba(27,78,69,.05)]">
            <Search className="h-4 w-4 shrink-0 text-[#087f73]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm hệ cơ quan hoặc bộ phận…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#93a5a1]"
              aria-label="Tìm hệ cơ quan hoặc bộ phận"
            />
            {query ? <button type="button" onClick={() => setQuery('')} className="text-xs font-bold text-[#60736f]">Xóa</button> : null}
          </label>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Lọc theo vùng cơ thể">
            {REGION_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => selectRegion(item)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${region === item ? 'border-[#087f73] bg-[#087f73] text-white' : 'border-[#d8e4df] bg-white text-[#526a65] hover:border-[#8fc7b9]'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div id="atlas-results" className="mt-4 grid grid-cols-2 gap-3" aria-live="polite">
            {visible.map((system) => (
              <Link
                key={system.slug}
                href={`/co-the-nguoi/${system.slug}`}
                className="group flex min-h-[190px] flex-col rounded-[20px] border border-[#d8e4df] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#8fc7b9] hover:shadow-[0_14px_34px_rgba(27,78,69,.09)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-[#eaf6f1] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.06em] text-[#075f59]">{system.region}</span>
                  <span className="text-[11px] font-bold text-[#879995]">{system.count} bệnh</span>
                </div>
                <h3 className="mt-4 font-sans text-base font-bold leading-snug group-hover:text-[#087f73]">{system.name}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#60736f]">{system.tagline}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <span className="truncate text-[11px] text-[#879995]">{system.organs.slice(0, 3).join(' · ')}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#087f73] transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          {!visible.length ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-[#c7ded7] bg-white p-8 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[#087f73]" />
              <p className="mt-3 text-sm font-bold">Chưa tìm thấy bộ phận phù hợp</p>
              <p className="mt-1 text-xs text-[#60736f]">Thử tên gọi khác hoặc mô tả triệu chứng cho trợ lý sức khỏe.</p>
              <Link href="/tro-ly" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#075f59]">Mở trợ lý <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
