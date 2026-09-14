import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle, BookOpenCheck, ChevronLeft, CircleAlert, ClipboardList, HelpCircle, Info, ListChecks, PhoneCall, ShieldAlert, Stethoscope,
} from 'lucide-react';
import { SYSTEM_BY_CATEGORY, URGENCY_LABEL, getDisease, getRelatedDiseases } from '@/lib/disease-library';
import { getCatalogDoctors, getCatalogSpecialties } from '@/lib/doctor-catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const disease = getDisease(slug);
  if (!disease) return { title: 'Không tìm thấy mục bệnh · Phòng khám Quang Thanh' };
  return {
    title: `${disease.name} · Cẩm nang sức khỏe Quang Thanh`,
    description: disease.summary.slice(0, 180),
  };
}

const TONE = {
  calm: 'border-[#cfe1db] bg-[#eaf6f1] text-[#075f59]',
  warn: 'border-[#eadcae] bg-[#fff8df] text-[#70550a]',
  alert: 'border-[#eecfc8] bg-[#fff3ef] text-[#a4262c]',
};

export default async function DiseaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const disease = getDisease(slug);
  if (!disease) notFound();

  const system = SYSTEM_BY_CATEGORY.get(disease.category);
  const related = getRelatedDiseases(disease, 6);
  const urgency = URGENCY_LABEL[disease.urgency] || URGENCY_LABEL.unknown;
  const specialty = system?.specialtyId ? getCatalogSpecialties().find((item) => item.id === system.specialtyId) : undefined;
  const doctors = specialty ? getCatalogDoctors().filter((doctor) => doctor.specialtyId === specialty.id).slice(0, 3) : [];
  const ownWarnings = Array.from(new Set([...disease.redFlags, ...disease.emergencySigns]));
  const warnings = ownWarnings.length ? ownWarnings : (system?.watchFor || []);
  const isExpandedProfile = Boolean(disease.riskFactors.length || disease.questions.length || ownWarnings.length);

  return (
    <div className="clinic-page space-y-7">
      <nav className="flex items-center gap-2 text-xs text-[#879995]">
        <Link href="/benh" className="inline-flex items-center gap-1.5 font-bold text-[#526a65]"><ChevronLeft className="h-4 w-4" /> Thư viện bệnh</Link>
        {system ? <><span>·</span><Link href={`/co-the-nguoi/${system.slug}`} className="font-bold text-[#526a65]">{system.name}</Link></> : null}
      </nav>

      <section className="rounded-[28px] border border-[#cfe1db] bg-white p-9 shadow-[0_20px_60px_rgba(27,78,69,.07)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${TONE[urgency.tone]}`}>{urgency.label}</span>
          {system ? <Link href={`/co-the-nguoi/${system.slug}`} className="rounded-full border border-[#d8e4df] bg-[#f7fbf9] px-3 py-1 text-[11px] font-bold text-[#4e625e]">{system.name}</Link> : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8e4df] bg-white px-3 py-1 text-[11px] font-bold text-[#60736f]"><BookOpenCheck className="h-3 w-3 text-[#087f73]" /> {isExpandedProfile ? 'Hồ sơ triệu chứng mở rộng' : 'Thông tin tổng quan'}</span>
          {disease.nameEn ? <span className="text-[11px] text-[#879995]">Tên tiếng Anh: {disease.nameEn}</span> : null}
        </div>
        <h1 className="mt-4 text-[44px] leading-tight">{disease.name}</h1>
        {disease.aliases.length ? <p className="mt-2 text-xs text-[#879995]">Còn gọi là: {disease.aliases.join(' · ')}</p> : null}
        <p className="mt-5 max-w-4xl text-sm leading-7 text-[#526a65]">{disease.summary}</p>

        <div className="mt-7 flex gap-3">
          <Link href={specialty ? `/dat-lich?khoa=${specialty.id}` : '/dat-lich'} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#087f73] px-6 text-sm font-extrabold text-white">
            <Stethoscope className="h-4 w-4" /> Đặt lịch khám {specialty ? specialty.name.replace(/^Khoa\s+/, '') : ''}
          </Link>
          <Link href="/tro-ly" className="inline-flex min-h-12 items-center rounded-xl border border-[#9ec7bd] bg-white px-6 text-sm font-bold text-[#075f59]">Mô tả triệu chứng cho trợ lý</Link>
        </div>
      </section>

      {warnings.length ? (
        <section className="rounded-[24px] border border-[#eecfc8] bg-[#fff3ef] p-7">
          <div className="mb-4 flex items-center gap-3 text-[#a4262c]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white"><ShieldAlert className="h-5 w-5" /></span>
            <div>
              <h2 className="font-sans text-lg font-bold">{ownWarnings.length ? 'Dấu hiệu cần tới cơ sở y tế ngay' : `Dấu hiệu khẩn cấp liên quan ${system?.name.toLowerCase() || 'nhóm bệnh này'}`}</h2>
              {!ownWarnings.length ? <p className="mt-1 text-xs font-normal text-[#8b514a]">Đây là cảnh báo chung theo hệ cơ quan, không phải dấu hiệu riêng để kết luận bệnh.</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
            {warnings.map((item, index) => (
              <p key={index} className="flex gap-2.5 text-sm leading-6 text-[#7b3a34]">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />{item}
              </p>
            ))}
          </div>
          <a href="tel:115" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#a4262c] px-5 text-xs font-extrabold text-white"><PhoneCall className="h-4 w-4" /> Gọi cấp cứu 115</a>
        </section>
      ) : null}

      <section className="grid grid-cols-[1.35fr_.65fr] gap-6">
        <div className="space-y-6">
          <Panel icon={<ListChecks />} title="Triệu chứng thường gặp">
            {disease.symptoms.common.length ? (
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                {disease.symptoms.common.map((symptom) => (
                  <li key={symptom} className="flex gap-2 text-sm leading-6 text-[#526a65]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#33a27e]" />{symptom}</li>
                ))}
              </ul>
            ) : <Empty>Chưa ghi nhận danh sách triệu chứng chuẩn hóa cho mục này.</Empty>}

            {disease.symptoms.occasional.length ? (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">Ít gặp hơn</p>
                <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
                  {disease.symptoms.occasional.map((symptom) => (
                    <li key={symptom} className="flex gap-2 text-sm leading-6 text-[#60736f]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c2d3ce]" />{symptom}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {disease.symptoms.rare.length ? (
              <>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[.1em] text-[#879995]">Hiếm gặp</p>
                <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
                  {disease.symptoms.rare.map((symptom) => (
                    <li key={symptom} className="flex gap-2 text-sm leading-6 text-[#879995]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#dbe6e2]" />{symptom}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </Panel>

          {disease.questions.length ? (
            <Panel icon={<HelpCircle />} title="Bác sĩ sẽ hỏi bạn điều gì">
              <p className="mb-4 text-xs text-[#879995]">Chuẩn bị trước câu trả lời giúp buổi khám nhanh và chính xác hơn.</p>
              <div className="space-y-3">
                {disease.questions.map((question, index) => (
                  <p key={index} className="rounded-xl bg-[#f7fbf9] px-4 py-3 text-sm leading-6 text-[#526a65]">{question}</p>
                ))}
              </div>
            </Panel>
          ) : null}

          {disease.phrasings.length ? (
            <Panel icon={<Info />} title="Người bệnh thường mô tả như thế nào">
              <div className="space-y-2.5">
                {disease.phrasings.map((phrase, index) => (
                  <p key={index} className="border-l-2 border-[#cfe1db] pl-4 text-sm italic leading-6 text-[#60736f]">“{phrase}”</p>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          {disease.riskFactors.length ? (
            <Panel icon={<CircleAlert />} title="Yếu tố nguy cơ">
              <ul className="space-y-2">
                {disease.riskFactors.map((factor) => (
                  <li key={factor} className="flex gap-2 text-sm leading-6 text-[#526a65]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e0b63f]" />{factor}</li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {!isExpandedProfile ? (
            <Panel icon={<ClipboardList />} title="Chuẩn bị trước khi đi khám">
              <p className="mb-3 text-xs leading-5 text-[#879995]">Mục này hiện có thông tin tổng quan. Những ghi chú sau sẽ giúp bác sĩ đánh giá trực tiếp đầy đủ hơn.</p>
              <ul className="space-y-2 text-sm leading-6 text-[#526a65]">
                <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#33a27e]" />Triệu chứng bắt đầu khi nào và thay đổi ra sao.</li>
                <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#33a27e]" />Thuốc, thực phẩm chức năng và liều đang sử dụng.</li>
                <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#33a27e]" />Bệnh nền, dị ứng và kết quả xét nghiệm gần đây.</li>
              </ul>
            </Panel>
          ) : null}

          {specialty ? (
            <Panel icon={<Stethoscope />} title="Khám ở khoa nào">
              <p className="text-sm leading-6 text-[#526a65]">{specialty.name} tiếp nhận nhóm bệnh lý này.</p>
              <div className="mt-4 space-y-2">
                {doctors.map((doctor) => (
                  <Link key={doctor.id} href={`/bac-si/${doctor.id}`} className="flex items-center gap-3 rounded-xl border border-[#e0e9e5] bg-[#fbfdfc] p-3 hover:border-[#8fc7b9]">
                    {doctor.imageUrl ? <img src={doctor.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover object-top" /> : null}
                    <span>
                      <strong className="block text-xs">{doctor.name}</strong>
                      <span className="text-[11px] text-[#879995]">{doctor.experienceYears} năm kinh nghiệm</span>
                    </span>
                  </Link>
                ))}
              </div>
              <Link href={`/dat-lich?khoa=${specialty.id}`} className="mt-4 block rounded-xl bg-[#eaf6f1] px-4 py-3 text-center text-xs font-bold text-[#075f59]">Đặt lịch khoa này</Link>
            </Panel>
          ) : null}

          {related.length ? (
            <Panel icon={<ListChecks />} title="Bệnh dễ nhầm lẫn">
              <div className="space-y-2">
                {related.map((item) => (
                  <Link key={item.slug} href={`/benh/${item.slug}`} className="block rounded-xl border border-[#e0e9e5] px-3 py-2 text-xs font-semibold text-[#4e625e] hover:border-[#8fc7b9] hover:text-[#075f59]">
                    {item.name}
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      </section>

      <p className="flex items-start gap-2.5 rounded-xl border border-[#d8e4df] bg-[#f7fbf9] px-5 py-3.5 text-xs leading-6 text-[#60736f]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#087f73]" />
        <span>
          Nội dung mang tính tham khảo, không thay thế chẩn đoán và chỉ định của bác sĩ. Không tự mua thuốc theo mô tả trên trang.
          {!isExpandedProfile ? ' Bài viết này đang ở mức tổng quan từ kho dữ liệu triệu chứng; các yếu tố nguy cơ và cảnh báo riêng cần được bác sĩ xác nhận.' : ''}
          {disease.source ? <> Nguồn dữ liệu chuyên môn: {disease.source}.</> : null}
        </span>
      </p>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[22px] border border-[#d8e4df] bg-white p-7">
      <div className="mb-5 flex items-center gap-3 text-[#075f59]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf6f1]">{icon}</span>
        <h2 className="font-sans text-lg font-bold">{title}</h2>
      </div>
      {children}
    </article>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#c7ded7] bg-[#f7fbf9] px-4 py-5 text-sm text-[#879995]">{children}</p>;
}
