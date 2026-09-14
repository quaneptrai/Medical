'use client';

import * as React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CatalogDoctor, CatalogSpecialty } from '@/lib/doctor-catalog';
import { DoctorCard } from '@/components/clinic/DoctorCard';

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

type SortKey = 'specialty' | 'experience' | 'name';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'specialty', label: 'Theo chuyên khoa' },
  { key: 'experience', label: 'Nhiều kinh nghiệm nhất' },
  { key: 'name', label: 'Theo tên A–Z' },
];

export function DoctorDirectory({ doctors, specialties }: { doctors: CatalogDoctor[]; specialties: CatalogSpecialty[] }) {
  const [specialty, setSpecialty] = React.useState<string>('all');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('specialty');

  const visible = React.useMemo(() => {
    const needle = plain(query.trim());
    const filtered = doctors.filter((doctor) => {
      if (specialty !== 'all' && doctor.specialtyId !== specialty) return false;
      if (!needle) return true;
      return plain(`${doctor.name} ${doctor.title} ${doctor.specialtyName} ${doctor.education} ${doctor.hospitalAffiliation}`).includes(needle);
    });
    return filtered.sort((a, b) => {
      if (sort === 'experience') return b.experienceYears - a.experienceYears;
      if (sort === 'name') return a.name.localeCompare(b.name, 'vi');
      return a.specialtyName.localeCompare(b.specialtyName, 'vi') || b.experienceYears - a.experienceYears;
    });
  }, [doctors, specialty, query, sort]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-6 rounded-2xl border border-[#d8e4df] bg-white p-3">
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-[#f4f9f7] px-4">
          <Search className="h-4 w-4 text-[#87a19b]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên bác sĩ, học vị hoặc nơi công tác…"
            className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-[#93a5a1]"
            aria-label="Tìm bác sĩ"
          />
        </label>
        <div className="flex items-center gap-2 text-xs font-bold text-[#60736f]">
          <SlidersHorizontal className="h-4 w-4 text-[#87a19b]" />
          {SORTS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSort(item.key)}
              className={`rounded-lg px-3 py-2 transition-colors ${sort === item.key ? 'bg-[#eaf6f1] text-[#075f59]' : 'hover:bg-[#f4f9f7]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSpecialty('all')}
          className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${specialty === 'all' ? 'border-[#087f73] bg-[#087f73] text-white' : 'border-[#d8e4df] bg-white text-[#4e625e] hover:border-[#8fc7b9]'}`}
        >
          Tất cả ({doctors.length})
        </button>
        {specialties.map((item) => {
          const count = doctors.filter((doctor) => doctor.specialtyId === item.id).length;
          if (!count) return null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSpecialty(item.id)}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${specialty === item.id ? 'border-[#087f73] bg-[#087f73] text-white' : 'border-[#d8e4df] bg-white text-[#4e625e] hover:border-[#8fc7b9]'}`}
            >
              {item.name.replace(/^Khoa\s+/, '')} ({count})
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[#60736f]">Đang hiển thị <strong className="text-[#18312d]">{visible.length}</strong> bác sĩ.</p>

      {visible.length ? (
        <div className="grid grid-cols-4 gap-5">
          {visible.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c7ded7] bg-[#f7fbf9] p-12 text-center text-sm text-[#60736f]">
          Không có bác sĩ nào khớp với bộ lọc hiện tại. Hãy thử bỏ từ khóa hoặc chọn chuyên khoa khác.
        </div>
      )}
    </div>
  );
}
