/**
 * Sinh thư viện bệnh cho giao diện từ tri thức nội bộ của BotMedical
 * (data/diseases_expanded + data/diseases) -> frontend/clinic/data/disease-library.json
 *
 * Chạy lại mỗi khi kho tri thức thay đổi:  node scripts/build-disease-library.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.cwd(), '..', '..');
const SOURCES = [path.join(ROOT, 'data', 'diseases'), path.join(ROOT, 'data', 'diseases_expanded')];
const OUT = path.resolve(process.cwd(), 'data', 'disease-library.json');

const BODY_SYSTEMS = {
  neurology: 'than-kinh-nao-bo',
  ophthalmology: 'mat',
  ent: 'tai-mui-hong',
  cardiology: 'tim-mach-mau',
  respiratory: 'phoi-duong-tho',
  digestive: 'tieu-hoa-gan-mat',
  urology: 'than-tiet-nieu',
  musculoskeletal: 'co-xuong-khop',
  dermatology: 'da-toc-mong',
  obstetrics_gynecology: 'san-phu-khoa',
  andrology: 'nam-khoa',
  oncology: 'ung-buou',
  infectious: 'truyen-nhiem',
  general: 'noi-tiet-toan-than',
};

const slugify = (value) => String(value)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const names = (list) => (Array.isArray(list) ? list : [])
  .map((item) => (typeof item === 'string' ? item : item && item.name_vi))
  .map((item) => (item || '').trim())
  .filter(Boolean);

/** So sánh bỏ dấu, dùng để loại các bản sao không dấu của chính tên bệnh. */
const deaccent = (value) => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Kho tier-2 sinh từ log hội thoại nên lẫn cả câu hỏi của người dùng vào danh sách triệu chứng
 * ("muốn tìm hiểu về các loại thuốc điều trị…"). Những mục này không phải dấu hiệu lâm sàng.
 */
const INTENT_PATTERNS = [/^muon\b/, /tim hieu/, /tu van/, /co so y te/, /benh vien nao/, /bac si nao/, /^toi muon/];

/** Một danh từ chỉ bộ phận cơ thể đứng trơ trọi không phải là triệu chứng. */
const BODY_PART_ONLY = new Set([
  'bung', 'hong', 'nguc', 'chan', 'tay', 'khop', 'luoi', 'moi', 'mieng', 'mat', 'dau', 'lung', 'co', 'vai',
  'goi', 'da', 'toc', 'mong', 'tai', 'mui', 'hong hong', 'rang', 'mong dit', 'hang', 'biu', 'gan', 'than',
  'phoi', 'tim', 'ruot', 'khuyu tay', 'ban chan', 'ban tay', 'co hong', 'gay',
]);

const isSymptom = (value) => {
  const plain = deaccent(value);
  if (!plain || plain.length > 90) return false;
  if (BODY_PART_ONLY.has(plain)) return false;
  // Một từ không dấu đứng riêng là tên thuốc hoặc tác nhân (Methotrexate, Klebsiella), không phải triệu chứng.
  // Phải kiểm tra trên chuỗi gốc: bản bỏ dấu của "Sưng" cũng là chữ Latin thuần.
  const raw = String(value).trim();
  if (!/\s/.test(raw) && !/[^\x00-\x7F]/.test(raw)) return false;
  return !INTENT_PATTERNS.some((pattern) => pattern.test(plain));
};

const capitalise = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

/** Kho gốc ghi triệu chứng ở ngôi thứ nhất ("Con tôi bú kém"); đưa về dạng danh mục. */
const LEAD_INS = [
  /^hiện (tôi )?đang có (các )?(triệu chứng|dấu hiệu)( như)?\s+/i,
  /^có (các )?(triệu chứng|dấu hiệu)( như)?\s+/i,
  /^tôi (hiện |thường |hay |đang )*(bị|có|thấy|cảm thấy)\s+/i,
  /^con tôi (hay |thường |bị )*/i,
  /^(tôi|con tôi)\s+/i,
];

function tidySymptom(value) {
  const source = String(value).trim();
  let text = source.replace(/\s+của (con tôi|tôi)\b/gi, '');
  // "Bụng của tôi" rút gọn còn mỗi "Bụng" — mảnh vụn, không phải triệu chứng.
  if (text !== source && text.split(/\s+/).length < 2) return '';
  for (const pattern of LEAD_INS) {
    const next = text.replace(pattern, '');
    if (next !== text) { text = next.trim(); break; }
  }
  return capitalise(text.replace(/\s+/g, ' ').trim());
}

const unique = (list) => Array.from(new Set(list));

/** Danh từ riêng và viết tắt phải giữ nguyên chữ hoa khi chuẩn hóa tên bệnh. */
const PROPER_NOUNS = new Set([
  'alzheimer', 'addison', 'aids', 'bartholin', 'basedow', 'behcet', 'bell', 'buerger', 'candida', 'chlamydia',
  'cooper', 'copd', 'covid', 'crohn', 'cushing', 'dengue', 'down', 'duchenne', 'ebola', 'fallot', 'graves',
  'guillain', 'hashimoto', 'helicobacter', 'herpes', 'hirschsprung', 'hiv', 'hodgkin', 'horner', 'kawasaki',
  'klinefelter', 'lyme', 'marfan', 'meniere', 'paget', 'parkinson', 'pylori', 'raynaud', 'rubella', 'salmonella',
  'sjogren', 'streptococcus', 'turner', 'whitmore', 'wilson', 'zika',
]);

/**
 * Kho tier-2 lưu tên bệnh viết hoa từng chữ ("Áp Xe Hậu Môn"). Tiếng Việt viết thường
 * từ thứ hai trở đi, trừ danh từ riêng và chữ viết tắt.
 */
function normaliseName(value) {
  const words = String(value).trim().split(/\s+/);
  if (words.length < 2) return words.join(' ');
  return words
    .map((word, index) => {
      if (index === 0) return word;
      const bare = word.replace(/[^\p{L}\p{N}]/gu, '');
      if (!bare) return word;
      if (PROPER_NOUNS.has(bare.toLowerCase())) return word;
      if (bare === bare.toUpperCase()) return word; // viết tắt: HIV, COPD, B, II…
      if (/\d/.test(bare)) return word;
      return word.charAt(0).toLowerCase() + word.slice(1);
    })
    .join(' ');
}

/** Mô tả tự sinh của kho tier-2 chỉ là "<Tên bệnh> (Chuyên khoa: x)" — viết lại cho người đọc. */
function buildSummary(record, symptoms) {
  const displayName = normaliseName(record.name_vi);
  const raw = (record.description || '').trim();
  const isPlaceholder = !raw || /\(Chuyên khoa:/i.test(raw) || raw === record.name_vi;
  if (!isPlaceholder) return raw;
  const top = symptoms.common.slice(0, 4).map((item) => item.charAt(0).toLowerCase() + item.slice(1));
  if (!top.length) return `${displayName} là một bệnh lý được theo dõi trong thư viện chuyên môn của phòng khám. Hãy mô tả triệu chứng của bạn để được định hướng chuyên khoa phù hợp.`;
  return `${displayName} thường được người bệnh mô tả qua các dấu hiệu như ${top.join(', ')}. Mức độ biểu hiện khác nhau ở từng người, vì vậy cần bác sĩ thăm khám trực tiếp để xác định nguyên nhân.`;
}

const records = [];
for (const dir of SOURCES) {
  if (!fs.existsSync(dir)) continue;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (parsed && parsed.name_vi) records.push(parsed);
        } catch { /* bỏ qua tệp hỏng */ }
      }
    }
  };
  walk(dir);
}

const bySlug = new Map();
for (const record of records) {
  const symptomList = (list) => unique(names(list).filter(isSymptom).map(tidySymptom).filter(Boolean));
  const symptoms = {
    common: symptomList(record.symptoms && record.symptoms.common),
    occasional: symptomList(record.symptoms && record.symptoms.occasional),
    rare: symptomList(record.symptoms && record.symptoms.rare),
  };
  const category = BODY_SYSTEMS[record.category] ? record.category : 'general';
  let slug = slugify(record.name_vi);
  if (!slug) slug = slugify(record.disease_id);
  if (bySlug.has(slug)) {
    const existing = bySlug.get(slug);
    // Giữ bản có nhiều dữ liệu hơn (tier 1 được biên tập tay).
    const score = (item) => (item.tier === 1 ? 100 : 0) + item.symptoms.common.length + item.redFlags.length;
    const candidate = { tier: record.tier, symptoms, redFlags: names(record.red_flags) };
    if (score(candidate) <= score(existing)) continue;
  }

  bySlug.set(slug, {
    id: record.disease_id,
    slug,
    name: normaliseName(record.name_vi),
    // Kho tier-2 để name_en là bản không dấu của tên tiếng Việt — không phải tên tiếng Anh thật.
    nameEn: deaccent(record.name_en || '') === deaccent(record.name_vi) ? '' : (record.name_en || '').trim(),
    aliases: unique(names(record.aliases).filter((alias) => deaccent(alias) !== deaccent(record.name_vi))),
    category,
    system: BODY_SYSTEMS[category],
    tier: Number(record.tier) || 2,
    urgency: record.urgency || 'unknown',
    summary: buildSummary(record, symptoms),
    symptoms,
    riskFactors: unique(names(record.risk_factors).map(capitalise)),
    redFlags: unique(names(record.red_flags).map(capitalise)),
    emergencySigns: unique(names(record.when_to_seek_emergency).map(capitalise)),
    questions: unique(names(record.questions_to_ask)),
    differentials: unique(names(record.differential_diagnoses)),
    phrasings: unique(names(record.user_language_variants)).slice(0, 4),
    source: (record.provenance && record.provenance.source_document) || '',
  });
}

const diseases = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: diseases.length, diseases }), 'utf8');

const perCategory = diseases.reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {});
console.log(`Đã ghi ${diseases.length} bệnh vào ${path.relative(process.cwd(), OUT)}`);
console.log(perCategory);
