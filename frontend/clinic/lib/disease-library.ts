import fs from 'fs';
import path from 'path';

export type DiseaseUrgency =
  | 'low'
  | 'moderate'
  | 'medium'
  | 'moderate_to_high'
  | 'high'
  | 'emergency'
  | 'critical'
  | 'unknown';

export type LibraryDisease = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  aliases: string[];
  category: string;
  system: string;
  tier: number;
  urgency: DiseaseUrgency;
  summary: string;
  symptoms: { common: string[]; occasional: string[]; rare: string[] };
  riskFactors: string[];
  redFlags: string[];
  emergencySigns: string[];
  questions: string[];
  differentials: string[];
  phrasings: string[];
  source: string;
};

export type BodySystem = {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  organs: string[];
  watchFor: string[];
  specialtyId?: string;
  category: string;
};

/**
 * Trục giải phẫu của thư viện: mỗi hệ cơ quan gom đúng một nhóm bệnh trong kho tri thức,
 * nhờ vậy trang "Cơ thể người" và trang "Thư viện bệnh" luôn nói cùng một con số.
 */
export const BODY_SYSTEMS: BodySystem[] = [
  {
    slug: 'than-kinh-nao-bo', category: 'neurology', specialtyId: 'than-kinh', region: 'Đầu & giác quan',
    name: 'Não bộ & Hệ thần kinh', tagline: 'Đau đầu, chóng mặt, mất ngủ, tê bì',
    description: 'Não, tủy sống và mạng lưới dây thần kinh điều khiển vận động, cảm giác, giấc ngủ và trí nhớ. Rối loạn ở đây thường biểu hiện bằng đau đầu kéo dài, chóng mặt, tê yếu tay chân hoặc thay đổi giấc ngủ.',
    organs: ['Não bộ', 'Tủy sống', 'Dây thần kinh ngoại biên', 'Hệ tiền đình'],
    watchFor: ['Đau đầu dữ dội đột ngột', 'Yếu hoặc liệt nửa người', 'Nói khó, méo miệng', 'Co giật'],
  },
  {
    slug: 'mat', category: 'ophthalmology', specialtyId: 'mat', region: 'Đầu & giác quan',
    name: 'Mắt & Thị giác', tagline: 'Mờ mắt, đỏ mắt, nhức mỏi mắt',
    description: 'Giác mạc, thủy tinh thể, võng mạc và dây thần kinh thị giác quyết định chất lượng thị lực. Nhiều bệnh toàn thân như đái tháo đường hay tăng huyết áp cũng để lại dấu vết đầu tiên ở đáy mắt.',
    organs: ['Giác mạc', 'Kết mạc', 'Thủy tinh thể', 'Võng mạc', 'Thần kinh thị giác'],
    watchFor: ['Mất thị lực đột ngột', 'Đau nhức mắt dữ dội kèm nôn', 'Nhìn thấy chớp sáng hoặc ruồi bay tăng nhanh'],
  },
  {
    slug: 'tai-mui-hong', category: 'ent', specialtyId: 'tai-mui-hong', region: 'Đầu & giác quan',
    name: 'Tai – Mũi – Họng', tagline: 'Nghẹt mũi, đau họng, ù tai',
    description: 'Đường thở trên và cơ quan thính giác là nơi cơ thể tiếp xúc trực tiếp với không khí, bụi và vi sinh vật, nên cũng là nơi khởi phát phần lớn các đợt viêm nhiễm theo mùa.',
    organs: ['Tai ngoài – tai giữa', 'Hốc mũi & xoang', 'Họng – amidan', 'Thanh quản'],
    watchFor: ['Khó thở thanh quản', 'Chảy máu mũi không cầm', 'Nghe kém đột ngột một bên'],
  },
  {
    slug: 'tim-mach-mau', category: 'cardiology', specialtyId: 'tim-mach', region: 'Lồng ngực',
    name: 'Tim & Mạch máu', tagline: 'Đau ngực, hồi hộp, huyết áp bất thường',
    description: 'Tim và hệ mạch đưa máu giàu oxy tới toàn bộ cơ quan. Bệnh lý tim mạch thường tiến triển âm thầm nhiều năm trước khi có triệu chứng, vì vậy tầm soát định kỳ quan trọng hơn là chờ dấu hiệu.',
    organs: ['Cơ tim', 'Van tim', 'Động mạch vành', 'Động mạch – tĩnh mạch ngoại biên'],
    watchFor: ['Đau thắt ngực lan tay trái hoặc hàm', 'Khó thở khi nằm', 'Ngất', 'Tim đập rất nhanh hoặc rất chậm'],
  },
  {
    slug: 'phoi-duong-tho', category: 'respiratory', specialtyId: 'ho-hap', region: 'Lồng ngực',
    name: 'Phổi & Đường hô hấp', tagline: 'Ho kéo dài, khó thở, khò khè',
    description: 'Khí quản, phế quản và hai lá phổi thực hiện trao đổi khí. Ho kéo dài trên ba tuần, khó thở tăng dần hoặc khò khè tái đi tái lại đều là lý do nên đo chức năng hô hấp.',
    organs: ['Khí quản', 'Phế quản', 'Phế nang', 'Màng phổi'],
    watchFor: ['Khó thở tăng nhanh', 'Ho ra máu', 'Môi tím', 'Đau ngực khi hít sâu'],
  },
  {
    slug: 'tieu-hoa-gan-mat', category: 'digestive', specialtyId: 'tieu-hoa', region: 'Ổ bụng & tiết niệu',
    name: 'Tiêu hóa – Gan mật', tagline: 'Đau bụng, ợ chua, rối loạn đại tiện',
    description: 'Từ thực quản tới đại tràng cùng gan, mật và tụy — hệ tiêu hóa vừa hấp thu dinh dưỡng vừa khử độc. Đây cũng là nhóm bệnh được tra cứu nhiều nhất trong thư viện của phòng khám.',
    organs: ['Thực quản', 'Dạ dày', 'Ruột non – đại tràng', 'Gan', 'Túi mật', 'Tụy'],
    watchFor: ['Nôn ra máu', 'Đi ngoài phân đen', 'Đau bụng dữ dội kèm sốt', 'Vàng da, vàng mắt'],
  },
  {
    slug: 'than-tiet-nieu', category: 'urology', region: 'Ổ bụng & tiết niệu',
    name: 'Thận & Tiết niệu', tagline: 'Tiểu buốt, tiểu nhiều, đau thắt lưng',
    description: 'Thận lọc máu và cân bằng nước – điện giải; niệu quản, bàng quang, niệu đạo dẫn nước tiểu ra ngoài. Thay đổi số lần đi tiểu, màu nước tiểu hoặc đau hông lưng là tín hiệu nên kiểm tra sớm.',
    organs: ['Thận', 'Niệu quản', 'Bàng quang', 'Niệu đạo', 'Tuyến tiền liệt'],
    watchFor: ['Tiểu ra máu', 'Bí tiểu hoàn toàn', 'Đau quặn thận kèm sốt rét run', 'Phù toàn thân'],
  },
  {
    slug: 'co-xuong-khop', category: 'musculoskeletal', specialtyId: 'co-xuong-khop', region: 'Vận động & da',
    name: 'Cơ – Xương – Khớp', tagline: 'Đau lưng, đau vai gáy, cứng khớp',
    description: 'Bộ khung nâng đỡ cơ thể gồm xương, khớp, gân, cơ và dây chằng. Đau kéo dài kèm hạn chế vận động thường liên quan tới tư thế, thoái hóa hoặc viêm và đáp ứng tốt khi can thiệp sớm.',
    organs: ['Cột sống', 'Khớp gối – háng – vai', 'Gân và dây chằng', 'Hệ cơ'],
    watchFor: ['Yếu liệt chi sau chấn thương', 'Khớp sưng nóng đỏ kèm sốt', 'Đau lưng kèm rối loạn đại tiểu tiện'],
  },
  {
    slug: 'da-toc-mong', category: 'dermatology', specialtyId: 'da-lieu', region: 'Vận động & da',
    name: 'Da – Tóc – Móng', tagline: 'Ngứa, nổi mẩn, rụng tóc, mụn',
    description: 'Da là cơ quan lớn nhất và là hàng rào đầu tiên của cơ thể. Tổn thương da đôi khi chỉ là phản ứng tại chỗ, nhưng cũng có thể là biểu hiện của bệnh toàn thân hoặc dị ứng thuốc.',
    organs: ['Thượng bì – trung bì', 'Nang lông và tóc', 'Móng', 'Tuyến mồ hôi – tuyến bã'],
    watchFor: ['Ban đỏ lan nhanh kèm sốt', 'Bong da diện rộng', 'Nốt ruồi đổi màu hoặc loét không lành'],
  },
  {
    slug: 'san-phu-khoa', category: 'obstetrics_gynecology', specialtyId: 'san-phu-khoa', region: 'Sinh sản',
    name: 'Sản – Phụ khoa', tagline: 'Rối loạn kinh nguyệt, thai kỳ, khí hư',
    description: 'Sức khỏe sinh sản nữ giới trải dài từ tuổi dậy thì, thai kỳ tới giai đoạn mãn kinh. Khám định kỳ giúp phát hiện sớm bất thường cổ tử cung, buồng trứng và theo dõi thai an toàn.',
    organs: ['Tử cung', 'Cổ tử cung', 'Buồng trứng', 'Vòi trứng', 'Tuyến vú'],
    watchFor: ['Ra máu bất thường khi mang thai', 'Đau bụng dưới dữ dội', 'Sốt sau sinh', 'Thai máy giảm'],
  },
  {
    slug: 'nam-khoa', category: 'andrology', region: 'Sinh sản',
    name: 'Nam khoa', tagline: 'Sức khỏe sinh sản và tiết niệu nam giới',
    description: 'Nhóm bệnh lý liên quan tới cơ quan sinh dục nam, nội tiết tố và khả năng sinh sản — thường bị trì hoãn thăm khám vì tâm lý e ngại, dù phần lớn điều trị được khi phát hiện sớm.',
    organs: ['Tinh hoàn', 'Mào tinh', 'Tuyến tiền liệt', 'Dương vật'],
    watchFor: ['Đau tinh hoàn đột ngột dữ dội', 'Sưng bìu kèm sốt', 'Tiểu máu'],
  },
  {
    slug: 'noi-tiet-toan-than', category: 'general', region: 'Toàn thân',
    name: 'Nội tiết & Toàn thân', tagline: 'Mệt mỏi, sụt cân, đường huyết, tuyến giáp',
    description: 'Các tuyến nội tiết và rối loạn chuyển hóa ảnh hưởng tới toàn bộ cơ thể: đái tháo đường, bệnh tuyến giáp, rối loạn mỡ máu, thiếu máu cùng những triệu chứng chung như sốt, sụt cân, mệt mỏi kéo dài.',
    organs: ['Tuyến giáp', 'Tuyến tụy nội tiết', 'Tuyến thượng thận', 'Hệ miễn dịch – máu'],
    watchFor: ['Sụt cân nhanh không rõ lý do', 'Sốt kéo dài trên một tuần', 'Lơ mơ, rối loạn ý thức'],
  },
  {
    slug: 'truyen-nhiem', category: 'infectious', region: 'Toàn thân',
    name: 'Bệnh truyền nhiễm', tagline: 'Sốt, phát ban, bệnh lây theo mùa',
    description: 'Các bệnh do vi khuẩn, virus hoặc ký sinh trùng lây qua đường hô hấp, tiêu hóa, máu và côn trùng trung gian. Nhận biết sớm giúp cách ly đúng cách và hạn chế lây lan trong gia đình.',
    organs: ['Đường hô hấp', 'Đường tiêu hóa', 'Máu và bạch huyết', 'Da – niêm mạc'],
    watchFor: ['Sốt cao liên tục kèm li bì', 'Xuất huyết dưới da', 'Cứng gáy', 'Mất nước nặng'],
  },
  {
    slug: 'ung-buou', category: 'oncology', region: 'Toàn thân',
    name: 'Ung bướu & Khối u', tagline: 'Khối bất thường, tầm soát sớm',
    description: 'Nhóm bệnh lý khối u lành tính và ác tính theo từng cơ quan. Thư viện này phục vụ mục đích tra cứu và tầm soát; mọi chẩn đoán đều cần mô bệnh học và hội chẩn chuyên khoa.',
    organs: ['Theo từng cơ quan', 'Hạch bạch huyết', 'Tuyến vú', 'Tuyến giáp'],
    watchFor: ['Khối u to nhanh', 'Hạch cứng không đau', 'Sụt cân kèm chán ăn kéo dài', 'Chảy máu bất thường'],
  },
];

export const SYSTEM_BY_SLUG = new Map(BODY_SYSTEMS.map((system) => [system.slug, system]));
export const SYSTEM_BY_CATEGORY = new Map(BODY_SYSTEMS.map((system) => [system.category, system]));

export const URGENCY_LABEL: Record<string, { label: string; tone: 'calm' | 'warn' | 'alert' }> = {
  low: { label: 'Theo dõi tại nhà được', tone: 'calm' },
  moderate: { label: 'Nên khám sớm', tone: 'warn' },
  medium: { label: 'Nên khám sớm', tone: 'warn' },
  moderate_to_high: { label: 'Cần được khám sớm', tone: 'warn' },
  high: { label: 'Cần khám ngay', tone: 'alert' },
  emergency: { label: 'Cần cấp cứu', tone: 'alert' },
  critical: { label: 'Nguy cấp', tone: 'alert' },
  unknown: { label: 'Cần bác sĩ đánh giá', tone: 'calm' },
};

let cache: LibraryDisease[] | null = null;

export function getDiseaseLibrary(): LibraryDisease[] {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), 'data', 'disease-library.json');
  if (!fs.existsSync(file)) {
    cache = [];
    return cache;
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { diseases: LibraryDisease[] };
  cache = Array.isArray(parsed.diseases) ? parsed.diseases : [];
  return cache;
}

export function getDisease(slug: string): LibraryDisease | null {
  return getDiseaseLibrary().find((disease) => disease.slug === slug) || null;
}

export function getDiseasesBySystem(systemSlug: string): LibraryDisease[] {
  const system = SYSTEM_BY_SLUG.get(systemSlug);
  if (!system) return [];
  return getDiseaseLibrary().filter((disease) => disease.category === system.category);
}

export function countDiseasesBySystem(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const disease of getDiseaseLibrary()) {
    const system = SYSTEM_BY_CATEGORY.get(disease.category);
    if (system) counts[system.slug] = (counts[system.slug] || 0) + 1;
  }
  return counts;
}

/** Chữ cái đầu không dấu, dùng cho thanh tra cứu A–Z. */
export function initialLetter(name: string): string {
  const plain = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').trim();
  const letter = plain.charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

/** Bệnh liên quan: ưu tiên chẩn đoán phân biệt đã ghi nhận, sau đó tới cùng hệ cơ quan. */
export function getRelatedDiseases(disease: LibraryDisease, limit = 6): LibraryDisease[] {
  const library = getDiseaseLibrary();
  const normalise = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const wanted = new Set(disease.differentials.map(normalise));
  const related = library.filter((item) => item.slug !== disease.slug && wanted.has(normalise(item.name)));
  if (related.length >= limit) return related.slice(0, limit);
  const chosen = new Set(related.map((item) => item.slug));
  const sameSystem = library.filter(
    (item) => item.category === disease.category && item.slug !== disease.slug && !chosen.has(item.slug),
  );
  return [...related, ...sameSystem].slice(0, limit);
}
