/**
 * Sinh ảnh minh họa chân dung bác sĩ (SVG) và gán vào cột doctors.image_url.
 *
 *   node scripts/generate-doctor-portraits.cjs
 *
 * Ảnh được vẽ tại chỗ, không phụ thuộc dịch vụ ngoài và không dùng hình của người thật —
 * hồ sơ bác sĩ trong bản demo là dữ liệu minh họa nên không gắn khuôn mặt có thể nhận dạng.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const OUT_DIR = path.resolve(process.cwd(), 'public', 'images', 'doctors');
const DB_PATH = path.resolve(process.cwd(), 'data', 'auth.db');

/** Giới tính suy ra từ tên gọi để chân dung khớp với hồ sơ. */
const FEMALE_NAMES = new Set([
  'Phạm Thu Hà', 'Lê Quỳnh Anh', 'Đào Ngọc Mai', 'Lê Thu Hằng', 'Nguyễn Thùy Linh',
  'Phạm Khánh Ly', 'Nguyễn Minh Châu', 'Lê Thu Phương', 'Đỗ Quỳnh Nga', 'Phạm Gia Hân',
  'Nguyễn Hoàng Yến', 'Phạm Minh Thư', 'Trần Mỹ Duyên', 'Nguyễn Mai Hương', 'Đặng Thu Trang',
  'Phạm Ngọc Hà', 'Lê Hải Yến', 'Nguyễn Lan Anh', 'Vũ Minh Anh',
]);

const BACKDROPS = [
  ['#dff0ea', '#bcdfd3'],
  ['#e3eef7', '#c3dcef'],
  ['#f4ecd8', '#e6d6ae'],
  ['#e8ebf6', '#ccd3ea'],
  ['#dff1ee', '#b9dfd9'],
];
const SKIN = [
  { base: '#f4d2b0', shade: '#e3b98f' },
  { base: '#eec49c', shade: '#dbab7e' },
  { base: '#e2b389', shade: '#cb9a6d' },
  { base: '#f7dcc0', shade: '#e6c29f' },
  { base: '#d6a274', shade: '#bd8a5e' },
];
const HAIR = ['#241a13', '#31241a', '#1b1411', '#43301f', '#5a4630'];
const SCRUBS = ['#0d7f74', '#2f5f8a', '#3f7d6b', '#4a5d92', '#166b63'];

/** Băm ổn định để mỗi bác sĩ luôn nhận đúng một chân dung. */
function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

const pick = (list, seed) => list[seed % list.length];

function hairMale(seed, color) {
  const styles = [
    // Cắt ngắn gọn
    `<path d="M118 214c-6-62 30-98 82-98s88 36 82 98c-6-30-18-44-34-50-20 10-58 12-90-2-18 8-32 22-40 52z" fill="${color}"/>`,
    // Rẽ ngôi
    `<path d="M119 208c-4-60 32-96 81-96 52 0 86 38 81 96-8-34-22-50-40-56-14 16-42 24-74 20-24 6-40 16-48 36z" fill="${color}"/>
     <path d="M150 130c26 20 66 26 96 14-14-22-40-34-68-32-12 2-22 8-28 18z" fill="${color}" opacity=".65"/>`,
    // Húi cua
    `<path d="M122 206c-2-56 32-92 78-92s80 36 78 92c-10-34-30-52-78-52s-68 18-78 52z" fill="${color}"/>`,
  ];
  return pick(styles, seed);
}

function hairFemale(seed, color) {
  const styles = [
    // Tóc dài buông vai — vạt tóc ôm hai bên, chừa trán
    `<path d="M108 356C96 200 140 108 200 108s104 92 92 248l-30 6c14-124-2-186-62-186s-76 62-62 186z" fill="${color}"/>`,
    // Tóc ngang vai (bob)
    `<path d="M112 300C104 190 140 112 200 112s96 78 88 188l-26 6c8-74-4-128-62-128s-70 54-62 128z" fill="${color}"/>`,
    // Búi cao
    `<circle cx="200" cy="104" r="30" fill="${color}"/>
     <path d="M120 216c-6-64 32-104 80-104s86 40 80 104c-8-32-22-48-38-54-22 12-62 14-92-2-16 8-24 26-30 56z" fill="${color}"/>`,
    // Đuôi ngựa
    `<path d="M118 224c-8-70 34-114 82-114s90 44 82 114c-8-34-22-52-40-58-24 14-66 16-96 0-14 10-22 26-28 58z" fill="${color}"/>
     <path d="M282 196c22 14 30 48 24 86-4 26-18 42-34 44 12-30 14-62 4-92z" fill="${color}"/>`,
  ];
  return pick(styles, seed);
}

function portrait({ seed, female }) {
  const [bgFrom, bgTo] = pick(BACKDROPS, seed);
  const skin = pick(SKIN, seed >>> 3);
  const hairColor = pick(HAIR, seed >>> 5);
  const scrub = pick(SCRUBS, seed >>> 7);
  const glasses = seed % 5 === 0 || seed % 7 === 0;
  const hair = female ? hairFemale(seed >>> 2, hairColor) : hairMale(seed >>> 2, hairColor);
  const browY = female ? 196 : 194;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bgFrom}"/><stop offset="1" stop-color="${bgTo}"/>
    </linearGradient>
    <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef3f2"/>
    </linearGradient>
  </defs>

  <rect width="400" height="500" fill="url(#bg)"/>
  <circle cx="200" cy="206" r="150" fill="#ffffff" opacity=".34"/>

  <!-- cổ -->
  <path d="M172 288h56v70a28 28 0 0 1-56 0z" fill="${skin.shade}"/>

  <!-- áo blouse và áo trong -->
  <path d="M200 352c74 0 128 44 134 116l2 32H64l2-32c6-72 60-116 134-116z" fill="url(#coat)"/>
  <path d="M200 352l34 14-34 60-34-60z" fill="${scrub}"/>
  <path d="M166 366l34 60-30 74-42-104a132 132 0 0 1 38-30z" fill="#ffffff"/>
  <path d="M234 366l-34 60 30 74 42-104a132 132 0 0 0-38-30z" fill="#ffffff"/>
  <path d="M166 366l34 60-30 74-42-104a132 132 0 0 1 38-30z" fill="none" stroke="#d5e0dd" stroke-width="2"/>
  <path d="M234 366l-34 60 30 74 42-104a132 132 0 0 0-38-30z" fill="none" stroke="#d5e0dd" stroke-width="2"/>

  <!-- ống nghe -->
  <path d="M168 362c-14 44-6 86 22 106" fill="none" stroke="#3a4a55" stroke-width="9" stroke-linecap="round"/>
  <path d="M232 362c14 40 10 74-8 96" fill="none" stroke="#3a4a55" stroke-width="9" stroke-linecap="round"/>
  <circle cx="216" cy="466" r="16" fill="#c9d3d8" stroke="#3a4a55" stroke-width="7"/>

  <!-- tai -->
  <ellipse cx="126" cy="222" rx="14" ry="20" fill="${skin.shade}"/>
  <ellipse cx="274" cy="222" rx="14" ry="20" fill="${skin.shade}"/>

  <!-- khuôn mặt -->
  <ellipse cx="200" cy="208" rx="76" ry="92" fill="${skin.base}"/>
  ${hair}

  <!-- mắt, lông mày, mũi, miệng -->
  <path d="M158 ${browY}q18-12 36-2" fill="none" stroke="${hairColor}" stroke-width="7" stroke-linecap="round"/>
  <path d="M206 ${browY - 2}q18-10 36 2" fill="none" stroke="${hairColor}" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="174" cy="220" rx="8" ry="9" fill="#2c2622"/>
  <ellipse cx="226" cy="220" rx="8" ry="9" fill="#2c2622"/>
  <circle cx="177" cy="217" r="2.6" fill="#ffffff"/>
  <circle cx="229" cy="217" r="2.6" fill="#ffffff"/>
  <path d="M200 226v22l-10 8" fill="none" stroke="${skin.shade}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M180 272q20 16 40 0" fill="none" stroke="#a35e57" stroke-width="7" stroke-linecap="round"/>
  ${glasses ? `<g fill="none" stroke="#33413c" stroke-width="5">
    <rect x="148" y="202" width="52" height="38" rx="14"/>
    <rect x="200" y="202" width="52" height="38" rx="14"/>
    <path d="M124 210h24M252 210h24"/>
  </g>` : ''}
</svg>
`;
}

const slug = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

fs.mkdirSync(OUT_DIR, { recursive: true });
const db = new Database(DB_PATH);
const doctors = db.prepare('SELECT id, name FROM doctors ORDER BY name').all();
const update = db.prepare('UPDATE doctors SET image_url = ? WHERE id = ?');

let written = 0;
const apply = db.transaction(() => {
  for (const doctor of doctors) {
    // Bỏ học hàm/học vị ở đầu tên để tra cứu giới tính: "ThS.BS. Lê Thu Hằng" -> "Lê Thu Hằng".
    const plainName = doctor.name.replace(/^[^.]*\.\s*(BS\.\s*)?/, '').replace(/^(BS|BSCKI|BSCKII|ThS\.BS|TS\.BS|PGS\.TS\.BS)\.?\s*/, '').trim();
    const female = FEMALE_NAMES.has(plainName);
    const file = `${slug(doctor.id)}.svg`;
    fs.writeFileSync(path.join(OUT_DIR, file), portrait({ seed: hash(doctor.id), female }), 'utf8');
    update.run(`/images/doctors/${file}`, doctor.id);
    written += 1;
  }
});
apply();

console.log(`Đã tạo ${written} chân dung minh họa trong public/images/doctors và cập nhật doctors.image_url.`);
