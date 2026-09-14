const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'data', 'auth.db'));
db.pragma('foreign_keys = ON');
const columns = db.prepare('PRAGMA table_info(doctors)').all();
if (!columns.some((column) => column.name === 'image_url')) db.exec('ALTER TABLE doctors ADD COLUMN image_url TEXT');
if (!columns.some((column) => column.name === 'qualifications')) db.exec('ALTER TABLE doctors ADD COLUMN qualifications TEXT');
if (!columns.some((column) => column.name === 'achievements')) db.exec('ALTER TABLE doctors ADD COLUMN achievements TEXT');

const catalog = {
  'co-xuong-khop': [
    ['BSCKII. Nguyễn Hải Đăng', 'BSCKII', 18, 'BSCKII Chấn thương chỉnh hình', 'Bệnh viện Hữu nghị Việt Đức', 'Chuyên điều trị thoái hóa khớp, đau cột sống và phục hồi vận động.', 350000],
    ['ThS.BS. Trần Minh Khôi', 'ThS.BS', 12, 'Thạc sĩ Y học thể thao', 'Bệnh viện Thể thao Việt Nam', 'Theo dõi chấn thương thể thao và xây dựng kế hoạch phục hồi cá nhân.', 300000],
    ['BSCKI. Phạm Thu Hà', 'BSCKI', 10, 'BSCKI Phục hồi chức năng', 'Bệnh viện Bạch Mai', 'Điều trị đau vai gáy, đau thắt lưng và hạn chế vận động khớp.', 250000],
  ],
  'da-lieu': [
    ['ThS.BS. Đào Ngọc Mai', 'ThS.BS', 14, 'Thạc sĩ Da liễu', 'Bệnh viện Da liễu Trung ương', 'Chuyên điều trị viêm da cơ địa, dị ứng da và mề đay.', 300000],
    ['BSCKI. Vũ Thanh Tùng', 'BSCKI', 9, 'BSCKI Da liễu', 'Bệnh viện Đại học Y Hà Nội', 'Khám và điều trị mụn, nấm da cùng các bệnh da nhiễm khuẩn.', 250000],
    ['BS. Lê Quỳnh Anh', 'Bác sĩ', 8, 'Bác sĩ Đa khoa - định hướng Da liễu', 'Bệnh viện Da liễu Hải Phòng', 'Tư vấn chăm sóc da y khoa và phục hồi hàng rào bảo vệ da.', 220000],
  ],
  'ho-hap': [
    ['BSCKII. Phan Quốc Bảo', 'BSCKII', 19, 'BSCKII Nội Hô hấp', 'Bệnh viện Phổi Trung ương', 'Chuyên sâu hen phế quản, COPD và viêm phổi cộng đồng.', 350000],
    ['ThS.BS. Nguyễn Thùy Linh', 'ThS.BS', 13, 'Thạc sĩ Nội khoa', 'Bệnh viện Bạch Mai', 'Đánh giá ho kéo dài, khó thở và rối loạn hô hấp do dị ứng.', 300000],
    ['BSCKI. Đỗ Mạnh Cường', 'BSCKI', 9, 'BSCKI Hô hấp', 'Bệnh viện Phổi Hải Phòng', 'Điều trị viêm đường hô hấp, viêm phế quản và theo dõi chức năng phổi.', 250000],
  ],
  'mat': [
    ['ThS.BS. Nguyễn Minh Châu', 'ThS.BS', 15, 'Thạc sĩ Nhãn khoa', 'Bệnh viện Mắt Trung ương', 'Khám tật khúc xạ, đục thủy tinh thể và bệnh lý đáy mắt.', 320000],
    ['BSCKI. Trần Hoài Nam', 'BSCKI', 11, 'BSCKI Nhãn khoa', 'Bệnh viện Mắt Hải Phòng', 'Điều trị viêm kết mạc, khô mắt và theo dõi tăng nhãn áp.', 260000],
    ['BS. Phạm Khánh Ly', 'Bác sĩ', 8, 'Bác sĩ Nhãn khoa', 'Bệnh viện Đại học Y Hà Nội', 'Khám mắt trẻ em, thị lực học đường và tư vấn kính phù hợp.', 230000],
  ],
  'nhi-khoa': [
    ['BSCKII. Nguyễn Đức Long', 'BSCKII', 18, 'BSCKII Nhi khoa', 'Bệnh viện Nhi Trung ương', 'Chuyên bệnh hô hấp, tiêu hóa và dinh dưỡng ở trẻ em.', 350000],
    ['ThS.BS. Lê Thu Phương', 'ThS.BS', 12, 'Thạc sĩ Nhi khoa', 'Bệnh viện Trẻ em Hải Phòng', 'Theo dõi sức khỏe trẻ nhỏ, tư vấn dinh dưỡng và tiêm chủng.', 300000],
    ['BSCKI. Vũ Minh Anh', 'BSCKI', 10, 'BSCKI Nhi khoa', 'Bệnh viện Vinmec Hải Phòng', 'Khám sốt, ho, rối loạn tiêu hóa và bệnh thường gặp ở trẻ.', 260000],
  ],
  'san-phu-khoa': [
    ['BSCKII. Nguyễn Hoàng Yến', 'BSCKII', 20, 'BSCKII Sản phụ khoa', 'Bệnh viện Phụ sản Trung ương', 'Quản lý thai kỳ nguy cơ và chăm sóc sức khỏe phụ nữ toàn diện.', 380000],
    ['ThS.BS. Trần Mỹ Duyên', 'ThS.BS', 13, 'Thạc sĩ Sản phụ khoa', 'Bệnh viện Phụ sản Hải Phòng', 'Khám phụ khoa, tư vấn tiền hôn nhân và kế hoạch thai kỳ.', 320000],
    ['BSCKI. Phạm Gia Hân', 'BSCKI', 10, 'BSCKI Sản phụ khoa', 'Bệnh viện Đại học Y Hải Phòng', 'Theo dõi thai định kỳ và điều trị các bệnh phụ khoa thường gặp.', 280000],
  ],
  'tai-mui-hong': [
    ['ThS.BS. Hoàng Tuấn Kiệt', 'ThS.BS', 15, 'Thạc sĩ Tai Mũi Họng', 'Bệnh viện Tai Mũi Họng Trung ương', 'Nội soi và điều trị viêm xoang, viêm họng cùng rối loạn giọng nói.', 320000],
    ['BSCKI. Nguyễn Mai Hương', 'BSCKI', 11, 'BSCKI Tai Mũi Họng', 'Bệnh viện Việt Tiệp', 'Khám tai mũi họng người lớn, xử trí ù tai và viêm tai giữa.', 260000],
    ['BS. Đỗ Anh Tú', 'Bác sĩ', 8, 'Bác sĩ Tai Mũi Họng', 'Bệnh viện Đại học Y Hải Phòng', 'Khám viêm amidan, viêm mũi dị ứng và bệnh tai mũi họng trẻ em.', 230000],
  ],
  'than-kinh': [
    ['TS.BS. Nguyễn Thanh Sơn', 'TS.BS', 21, 'Tiến sĩ Thần kinh học', 'Bệnh viện Bạch Mai', 'Chuyên đau đầu, rối loạn tiền đình và bệnh mạch máu não.', 400000],
    ['ThS.BS. Phạm Ngọc Hà', 'ThS.BS', 14, 'Thạc sĩ Nội thần kinh', 'Bệnh viện 108', 'Khám mất ngủ, đau thần kinh và suy giảm trí nhớ.', 320000],
    ['BSCKI. Trần Quốc Huy', 'BSCKI', 10, 'BSCKI Nội thần kinh', 'Bệnh viện Việt Tiệp', 'Điều trị đau nửa đầu, chóng mặt và tê bì tay chân.', 270000],
  ],
  'tim-mach': [
    ['PGS.TS.BS. Trần Văn Hải', 'PGS.TS.BS', 24, 'Tiến sĩ Tim mạch', 'Viện Tim mạch Việt Nam', 'Chuyên tăng huyết áp, bệnh mạch vành và suy tim.', 450000],
    ['ThS.BS. Nguyễn Lan Anh', 'ThS.BS', 14, 'Thạc sĩ Tim mạch', 'Bệnh viện Tim Hà Nội', 'Tầm soát nguy cơ tim mạch và theo dõi rối loạn nhịp.', 330000],
    ['BSCKI. Lê Minh Đức', 'BSCKI', 11, 'BSCKI Nội tim mạch', 'Bệnh viện Việt Tiệp', 'Khám đau ngực, hồi hộp và quản lý huyết áp lâu dài.', 280000],
  ],
  'tieu-hoa': [
    ['TS.BS. Nguyễn Thành Công', 'TS.BS', 21, 'Tiến sĩ Tiêu hóa', 'Bệnh viện Bạch Mai', 'Chuyên bệnh dạ dày, đại tràng và gan mật mạn tính.', 420000],
    ['ThS.BS. Lê Hải Yến', 'ThS.BS', 13, 'Thạc sĩ Nội tiêu hóa', 'Bệnh viện Đại học Y Hà Nội', 'Khám trào ngược, rối loạn tiêu hóa và hội chứng ruột kích thích.', 320000],
    ['BSCKI. Vũ Quang Hưng', 'BSCKI', 10, 'BSCKI Tiêu hóa', 'Bệnh viện Việt Tiệp', 'Điều trị viêm loét dạ dày và tư vấn tầm soát tiêu hóa.', 270000],
  ],
};

const insert = db.prepare(`INSERT OR IGNORE INTO doctors
  (id, tenant_id, user_id, name, title, specialty_id, experience_years, education, hospital_affiliation, bio,
   available_days, consultation_fee, is_active, created_at, image_url)
  VALUES (?, 'yg-clinic-hn', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL)`);
const slug = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const days = JSON.stringify(['Thứ Hai', 'Thứ Tư', 'Thứ Sáu', 'Chủ nhật']);
const now = Math.floor(Date.now() / 1000);
const seed = db.transaction(() => {
  for (const [specialtyId, doctors] of Object.entries(catalog)) {
    for (const [name, title, years, education, affiliation, bio, fee] of doctors) {
      insert.run(`doc-${slug(name)}`, name, title, specialtyId, years, education, affiliation, bio, days, fee, now);
    }
  }
});
seed();
db.prepare('UPDATE doctors SET consultation_fee = 0').run();

const specialtyLabels = Object.fromEntries(db.prepare('SELECT id, name FROM specialties').all().map((row) => [row.id, row.name]));
const updateProfile = db.prepare('UPDATE doctors SET qualifications = COALESCE(NULLIF(qualifications, ?), ?), achievements = COALESCE(NULLIF(achievements, ?), ?) WHERE id = ?');
for (const doctor of db.prepare('SELECT id, title, specialty_id, education, hospital_affiliation, experience_years FROM doctors').all()) {
  const qualifications = JSON.stringify([
    doctor.education || `${doctor.title} chuyên ngành ${specialtyLabels[doctor.specialty_id]}`,
    `Đào tạo liên tục về chẩn đoán và điều trị tại ${specialtyLabels[doctor.specialty_id]}`,
    'Chứng chỉ hành nghề khám bệnh, chữa bệnh theo phạm vi chuyên môn',
  ]);
  const achievements = JSON.stringify([
    `${doctor.experience_years} năm kinh nghiệm khám và theo dõi người bệnh`,
    `Tham gia hội chẩn và cập nhật phác đồ tại ${doctor.hospital_affiliation || 'cơ sở y tế chuyên khoa'}`,
    'Tham gia hoạt động đào tạo liên tục và tư vấn giáo dục sức khỏe cộng đồng',
  ]);
  updateProfile.run('', qualifications, '', achievements, doctor.id);
}

const counts = db.prepare('SELECT specialty_id, COUNT(*) AS total FROM doctors WHERE is_active = 1 GROUP BY specialty_id ORDER BY specialty_id').all();
console.log(JSON.stringify(counts, null, 2));
db.close();
