import Link from 'next/link';
import { AlertTriangle, BookOpen, MessageSquareText, ShieldCheck } from 'lucide-react';
import {
  BODY_SYSTEMS, SYSTEM_BY_CATEGORY, countDiseasesBySystem, getDiseaseLibrary, initialLetter,
} from '@/lib/disease-library';
import { DiseaseDirectory, DiseaseIndexEntry } from '@/components/clinic/DiseaseDirectory';

export const metadata = {
  title: 'Thư viện bệnh · Phòng khám Đa khoa Quốc tế Quang Thanh',
  description: 'Tra cứu triệu chứng thường gặp, dấu hiệu cần đi khám ngay và hướng xử trí ban đầu của các bệnh lý phổ biến.',
};
export const dynamic = 'force-dynamic';

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export default function DiseaseLibraryPage() {
  const library = getDiseaseLibrary();
  const counts = countDiseasesBySystem();

  const entries: DiseaseIndexEntry[] = library.map((disease) => {
    const system = SYSTEM_BY_CATEGORY.get(disease.category);
    return {
      slug: disease.slug,
      name: disease.name,
      system: system ? system.slug : 'noi-tiet-toan-than',
      systemName: system ? system.name : 'Nội tiết & Toàn thân',
      urgency: disease.urgency,
      letter: initialLetter(disease.name),
      keywords: plain([disease.name, ...disease.aliases, ...disease.symptoms.common.slice(0, 8)].join(' ')),
    };
  });

  const systems = BODY_SYSTEMS.map((system) => ({ slug: system.slug, name: system.name }));
  // Những bệnh người dân hay tra cứu nhất; nếu thiếu mục nào thì bù bằng bệnh có dữ liệu đầy đủ.
  const featuredSlugs = [
    'tang-huyet-ap', 'dai-thao-duong', 'trao-nguoc-da-day-thuc-quan',
    'roi-loan-tien-dinh', 'sot-xuat-huyet', 'viem-xoang',
  ];
  const highlighted = featuredSlugs
    .map((slug) => library.find((disease) => disease.slug === slug))
    .filter((disease): disease is NonNullable<typeof disease> => Boolean(disease));

  return (
    <div className="clinic-page space-y-9">
      <section className="grid grid-cols-[1.2fr_.8fr] items-end gap-10 rounded-[28px] border border-[#cfe1db] bg-[#eaf6f1] px-10 py-9">
        <div>
          <span className="clinic-kicker">Cẩm nang sức khỏe</span>
          <h1 className="mt-3 text-[46px] leading-[1.06]">Thư viện bệnh: đọc để biết khi nào cần đi khám</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#526a65]">
            {library.length} mục bệnh lý được chuẩn hóa trong hệ thống chuyên môn của phòng khám — cùng kho tri thức mà trợ lý
            sức khỏe đang dùng để định hướng chuyên khoa. Mỗi mục trình bày triệu chứng thường gặp, dấu hiệu cần khám ngay
            và những câu hỏi bác sĩ sẽ đặt ra cho bạn.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/tro-ly" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-bold text-white"><MessageSquareText className="h-4 w-4" /> Mô tả triệu chứng của bạn</Link>
            <Link href="/co-the-nguoi" className="inline-flex min-h-12 items-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Tra cứu theo cơ quan</Link>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-2xl bg-white p-5">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#087f73]" />
            <span><strong className="block text-2xl leading-tight">{library.length}</strong><span className="text-xs text-[#60736f]">mục bệnh lý · {BODY_SYSTEMS.length} hệ cơ quan</span></span>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#087f73]" />
            <span className="text-xs leading-6 text-[#60736f]">Nội dung do phòng khám biên tập cho mục đích tra cứu, không dùng để tự chẩn đoán hay tự dùng thuốc.</span>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-[#eecfc8] bg-[#fff3ef] px-6 py-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#a4262c]" />
        <p className="text-sm leading-6 text-[#7b3a34]">
          Nếu bạn đang đau ngực dữ dội, khó thở, yếu liệt nửa người, nói khó, co giật, chảy máu không cầm hoặc lơ mơ —
          hãy <a href="tel:115" className="font-extrabold underline">gọi 115</a> ngay thay vì tra cứu.
        </p>
      </div>

      {highlighted.length ? (
        <section>
          <h2 className="mb-3 text-2xl">Được tra cứu nhiều</h2>
          <div className="grid grid-cols-3 gap-3">
            {highlighted.map((disease) => (
              <Link key={disease.slug} href={`/benh/${disease.slug}`} className="rounded-2xl border border-[#d8e4df] bg-white p-5 hover:border-[#8fc7b9]">
                <strong className="block text-base">{disease.name}</strong>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#60736f]">{disease.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <DiseaseDirectory entries={entries} systems={systems.filter((system) => (counts[system.slug] || 0) > 0)} />
    </div>
  );
}
