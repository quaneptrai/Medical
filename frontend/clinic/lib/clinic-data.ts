export interface Specialty {
  id: string;
  name: string;
  category: string;
  shortDesc: string;
  fullDesc: string;
  commonSymptoms: string[];
  chiefDoctor: string;
  iconName: string;
  diseasesCovered: number;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialtyId: string;
  specialtyName: string;
  experienceYears: number;
  education: string;
  hospitalAffiliation: string;
  bio: string;
  availableDays: string[];
  consultationFee?: number;
  imageUrl?: string;
  qualifications?: string[];
  achievements?: string[];
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'triage' | 'booking' | 'insurance';
}

export const CLINIC_INFO = {
  name: "Phòng khám Đa khoa Quốc tế Quang Thanh",
  brandName: "Phòng khám Quang Thanh",
  slogan: "Thấu hiểu triệu chứng — Định hướng y khoa chuẩn xác",
  license: "Giấy phép hoạt động số 0892/SYT-GPHĐ do Sở Y Tế cấp",
  hotline: "0222 444 56687",
  emergencyPhone: "115",
  address: "Quang Trung, An Lão, Hải Phòng",
  branchHcm: "Chưa triển khai chi nhánh khác",
  email: "tuvan@phongkhamyg.vn",
  openingHours: "Sáng 08:00–12:00 · Chiều 13:00–19:00 (Thứ Hai–Chủ nhật)",
  stats: [
    { label: "Năm phục vụ sức khỏe", value: "18+", sub: "Từ năm 2008" },
    { label: "Lượt người bệnh đồng hành", value: "120.000+", sub: "Hài lòng và tin cậy" },
    { label: "Bác sĩ chuyên khoa sâu", value: "45+", sub: "CKI, CKII, Thạc sĩ, Tiến sĩ" },
    { label: "Mục bệnh lý tra cứu", value: "652", sub: "Chuẩn hóa trong hệ thống AI" },
  ],
};

export const SPECIALTIES: Specialty[] = [
  {
    id: "ho-hap",
    name: "Khoa Hô Hấp & Phổi",
    category: "respiratory",
    shortDesc: "Khám, chẩn đoán và điều trị các bệnh lý đường hô hấp trên và dưới, viêm phế quản, hen suyễn, cảm cúm.",
    fullDesc: "Khoa Hô hấp trang bị máy đo chức năng thông khí phổi hiện đại, hệ thống nội soi phế quản ống mềm, điều trị hiệu quả các bệnh lý từ cảm lạnh, ho khan, ho có đờm, viêm phế quản cấp/mạn, hen phế quản đến viêm phổi cộng đồng.",
    commonSymptoms: ["Ho khan kéo dài", "Ho khạc đờm đặc", "Khó thở khi gắng sức", "Rát họng", "Nghẹt mũi, sổ mũi"],
    chiefDoctor: "ThS.BS. Lê Thu Hằng",
    iconName: "Wind",
    diseasesCovered: 84,
  },
  {
    id: "tieu-hoa",
    name: "Khoa Tiêu Hóa & Gan Mật",
    category: "digestive",
    shortDesc: "Thăm khám chuyên sâu các bệnh lý dạ dày, đại tràng, gan mật, trào ngược thực quản và rối loạn tiêu hóa.",
    fullDesc: "Khoa Tiêu hóa sở hữu trung tâm nội soi tiêu hóa không đau với công nghệ phóng đại dải tần hẹp NBI giúp tầm soát sớm tổn thương tiền ung thư, điều trị trào ngược dạ dày (GERD), viêm loét dạ dày tá tràng, hội chứng ruột kích thích.",
    commonSymptoms: ["Ợ chua, ợ nóng", "Đầy bụng khó tiêu", "Đau thượng vị", "Táo bón, tiêu chảy", "Nhiệt miệng dai dẳng"],
    chiefDoctor: "BSCKII. Trần Văn Minh",
    iconName: "Activity",
    diseasesCovered: 96,
  },
  {
    id: "da-lieu",
    name: "Khoa Da Liễu & Thẩm Mỹ Da",
    category: "dermatology",
    shortDesc: "Điều trị toàn diện các bệnh da nhiễm trùng, nấm da, viêm da dị ứng, mề đay, mụn trứng cá và phục hồi da.",
    fullDesc: "Chẩn đoán và điều trị dứt điểm các bệnh ngoài da thường gặp như hắc lào, lang ben, viêm da tiết bã, mề đay dị ứng, zona thần kinh, rôm sảy, vảy nến, áp dụng phác đồ chuẩn y khoa quốc tế kết hợp dưỡng phục hồi rào cản da.",
    commonSymptoms: ["Nổi mẩn đỏ ngứa", "Bong tróc vảy da, gàu", "Mụn nước, lác đồng tiền", "Nứt nẻ môi và gót chân", "Cháy nắng, rôm sảy"],
    chiefDoctor: "BSCKI. Nguyễn Hoàng Anh",
    iconName: "Sparkles",
    diseasesCovered: 78,
  },
  {
    id: "co-xuong-khop",
    name: "Khoa Cơ Xương Khớp & PHCN",
    category: "musculoskeletal",
    shortDesc: "Thăm khám và điều trị đau vai gáy, đau lưng cơ năng, thoái hóa khớp, bong gân, chấn thương mô mềm.",
    fullDesc: "Kết hợp giữa chẩn đoán hình ảnh kỹ thuật số (X-quang, Siêu âm khớp màu) và vật lý trị liệu phục hồi chức năng, giúp người bệnh thoát khỏi các cơn đau cơ mạc, căng cơ thắt lưng, đau gót chân cân gan chân và chuột rút.",
    commonSymptoms: ["Đau mỏi vai gáy", "Đau lưng khi cúi bê vác", "Bong gân mắt cá chân", "Thốn gót chân buổi sáng", "Chuột rút bắp chân"],
    chiefDoctor: "ThS.BS. Vũ Đức Cường",
    iconName: "Shield",
    diseasesCovered: 62,
  },
  {
    id: "tai-mui-hong",
    name: "Khoa Tai Mũi Họng",
    category: "ent",
    shortDesc: "Khám nội soi tầm soát viêm mũi xoang, viêm amidan, khản tiếng cơ năng, ù tai và bệnh lý ống tai.",
    fullDesc: "Trang bị dàn nội soi tai mũi họng vi thể HD, điều trị các bệnh lý họng hạt, viêm amidan hốc mủ, viêm mũi dị ứng thời tiết, khàn tiếng do nói nhiều, nút ráy tai bít tắc và xử trí chảy máu cam nhẹ.",
    commonSymptoms: ["Ù tai tiếng ve kêu", "Khàn tiếng mất giọng", "Nước vào tai đọng lùng bùng", "Nút ráy tai bít kín", "Chảy máu cam nhẹ"],
    chiefDoctor: "BSCKII. Phạm Thị Mai Lan",
    iconName: "Ear",
    diseasesCovered: 72,
  },
  {
    id: "than-kinh-tong-quat",
    name: "Khoa Thần Kinh & Nội Tổng Quát",
    category: "neurology",
    shortDesc: "Định hướng điều trị đau đầu căng thẳng, suy nhược cơ thể, mất ngủ, chóng mặt và kiểm tra sức khỏe tổng quát.",
    fullDesc: "Khám và sàng lọc các rối loạn thần kinh thực vật, đau đầu căng cơ do áp lực công việc, mệt mỏi suy nhược kéo dài, hỗ trợ phân loại và hướng dẫn tầm soát sớm nguy cơ tim mạch - chuyển hóa.",
    commonSymptoms: ["Đau đầu như có vòng siết", "Suy nhược mệt mỏi triền miên", "Căng thẳng bồn chồn khó ngủ", "Say nắng choáng váng", "Sốt phát ban sau sốt"],
    chiefDoctor: "TS.BS. Hoàng Quốc Dũng",
    iconName: "Brain",
    diseasesCovered: 110,
  },
];

export const DOCTORS: Doctor[] = [
  {
    id: "bs-tran-van-minh",
    name: "BSCKII. Trần Văn Minh",
    title: "Trưởng khoa Nội Tiêu Hóa",
    specialtyId: "tieu-hoa",
    specialtyName: "Nội Tiêu Hóa & Gan Mật",
    experienceYears: 22,
    education: "Bác sĩ Chuyên khoa II - Đại học Y Hà Nội",
    hospitalAffiliation: "Nguyên Phó Trưởng khoa Tiêu hóa - Bệnh viện Bạch Mai",
    bio: "Hơn 22 năm kinh nghiệm trong chẩn đoán và điều trị bệnh lý đường tiêu hóa trên/dưới, chuyên gia nội soi can thiệp và điều trị GERD khó trị.",
    availableDays: ["Thứ Hai", "Thứ Ba", "Thứ Năm", "Thứ Bảy"],
  },
  {
    id: "bs-le-thu-hang",
    name: "ThS.BS. Lê Thu Hằng",
    title: "Bác sĩ Chuyên khoa Hô Hấp",
    specialtyId: "ho-hap",
    specialtyName: "Hô Hấp & Dị Ứng Lâm Sàng",
    experienceYears: 15,
    education: "Thạc sĩ Y khoa - Đại học Y Dược TP.HCM",
    hospitalAffiliation: "Từng công tác tại Bệnh viện Phổi Trung Ương",
    bio: "Chuyên sâu về hen phế quản, viêm phế quản mạn tính, các hội chứng ho kéo dài và bệnh lý viêm đường hô hấp trên tự giới hạn.",
    availableDays: ["Thứ Ba", "Thứ Tư", "Thứ Sáu", "Chủ Nhật"],
  },
  {
    id: "bs-nguyen-hoang-anh",
    name: "BSCKI. Nguyễn Hoàng Anh",
    title: "Bác sĩ Da Liễu",
    specialtyId: "da-lieu",
    specialtyName: "Da Liễu & Miễn Dịch Da",
    experienceYears: 12,
    education: "Bác sĩ Chuyên khoa I Da Liễu - Đại học Y Hà Nội",
    hospitalAffiliation: "Bác sĩ điều trị Bệnh viện Da liễu Quốc gia",
    bio: "Kinh nghiệm dày dặn trong điều trị các bệnh nấm da (hắc lào, lang ben), viêm da tiết bã, mề đay dị ứng và phục hồi thương tổn da.",
    availableDays: ["Thứ Hai", "Thứ Tư", "Thứ Năm", "Thứ Bảy"],
  },
  {
    id: "bs-vu-duc-cuong",
    name: "ThS.BS. Vũ Đức Cường",
    title: "Bác sĩ Cơ Xương Khớp",
    specialtyId: "co-xuong-khop",
    specialtyName: "Cơ Xương Khớp & Y Học Thể Thao",
    experienceYears: 16,
    education: "Thạc sĩ Chấn thương Chỉnh hình & Cơ Xương Khớp",
    hospitalAffiliation: "Bác sĩ Cố vấn Phục hồi chức năng - Bệnh viện Việt Đức",
    bio: "Chuyên điều trị hội chứng đau vai gáy văn phòng, đau thắt lưng cơ năng, chấn thương dây chằng do thể thao và viêm cân gan bàn chân.",
    availableDays: ["Thứ Ba", "Thứ Năm", "Thứ Sáu", "Chủ Nhật"],
  },
  {
    id: "bs-pham-thi-mai-lan",
    name: "BSCKII. Phạm Thị Mai Lan",
    title: "Bác sĩ Tai Mũi Họng",
    specialtyId: "tai-mui-hong",
    specialtyName: "Tai Mũi Họng & Thính Học",
    experienceYears: 18,
    education: "Bác sĩ Chuyên khoa II Tai Mũi Họng",
    hospitalAffiliation: "Bác sĩ CKI/II Bệnh viện Tai Mũi Họng Trung Ương",
    bio: "Chuyên gia nội soi tai mũi họng trẻ em và người lớn, điều trị viêm mũi dị ứng, khàn tiếng cơ năng, ù tai và xử trí dị vật ống tai an toàn.",
    availableDays: ["Thứ Hai", "Thứ Ba", "Thứ Sáu", "Thứ Bảy"],
  },
  {
    id: "bs-hoang-quoc-dung",
    name: "TS.BS. Hoàng Quốc Dũng",
    title: "Bác sĩ Nội Thần Kinh",
    specialtyId: "than-kinh-tong-quat",
    specialtyName: "Nội Thần Kinh & Đa Khoa",
    experienceYears: 20,
    education: "Tiến sĩ Y khoa - Đại học Y Hà Nội",
    hospitalAffiliation: "Giảng viên kiêm nhiệm Bộ môn Thần kinh",
    bio: "Chuyên sâu về đau đầu căng thẳng, rối loạn giấc ngủ, suy nhược thần kinh cơ thể và tầm soát bệnh lý mạch máu não sớm.",
    availableDays: ["Thứ Hai", "Thứ Tư", "Thứ Năm", "Chủ Nhật"],
  },
];

export const FAQS: FAQItem[] = [
  {
    category: "triage",
    question: "Trợ lý triệu chứng Quang Thanh có thay thế bác sĩ khám bệnh không?",
    answer: "Tuyệt đối KHÔNG. Trợ lý AI chỉ giúp bạn tra cứu các thông tin y khoa liên quan và gợi ý mức độ khẩn cấp để bạn biết khi nào nên đi khám hoặc cần đến bệnh viện ngay. Mọi kết luận chính xác đều phải do bác sĩ khám lâm sàng trực tiếp.",
  },
  {
    category: "triage",
    question: "Nếu tôi gặp dấu hiệu cấp cứu nguy hiểm thì hệ thống xử lý như thế nào?",
    answer: "Hệ thống tích hợp bộ quy tắc an toàn cấp cứu khóa cứng (Deterministic Red-flag Guardrails). Ngay khi phát hiện triệu chứng nguy hiểm (như đau ngực dữ dội lan tay, khó thở cấp, nghi đột quỵ, sốt co giật...), hệ thống lập tức ngắt hội thoại và hiển thị nút gọi cấp cứu 115 khẩn cấp.",
  },
  {
    category: "booking",
    question: "Tôi có thể đặt lịch hẹn khám trước qua website không?",
    answer: "Có. Bạn có thể dễ dàng chọn chuyên khoa, bác sĩ và khung giờ phù hợp tại mục 'Đặt lịch khám'. Sau khi đăng ký, nhân viên y tế của phòng khám sẽ gọi điện xác nhận trong vòng 15 phút.",
  },
  {
    category: "insurance",
    question: "Phòng khám có áp dụng Bảo hiểm Y tế và Bảo hiểm Bảo lãnh không?",
    answer: "Phòng khám tiếp nhận thanh toán BHYT đúng tuyến/thông tuyến theo quy định hiện hành và liên kết bảo lãnh viện phí trực tiếp với hơn 25 công ty bảo hiểm tư nhân (Bảo Việt, Prudential, Manulife, PVI, Insmart...).",
  },
  {
    category: "general",
    question: "Dữ liệu mô tả triệu chứng của tôi có bị lưu lại hay chia sẻ không?",
    answer: "Không. Toàn bộ phiên đánh giá triệu chứng chỉ tồn tại trong bộ nhớ phiên làm việc trên trình duyệt của bạn và không lưu thông tin nhận dạng cá nhân nào vào cơ sở dữ liệu công khai.",
  },
  {
    category: "general",
    question: "Giờ làm việc của phòng khám như thế nào?",
    answer: "Phòng khám tiếp nhận buổi sáng từ 08:00 đến 12:00 và buổi chiều từ 13:00 đến 19:00, từ Thứ Hai đến Chủ nhật.",
  },
];

export const CARE_PATHWAY_STEPS = [
  {
    stepNumber: "01",
    title: "Mô tả triệu chứng",
    desc: "Nhập cảm giác khó chịu hoặc bất thường của bạn bằng ngôn ngữ tự nhiên hàng ngày.",
  },
  {
    stepNumber: "02",
    title: "Định hướng phân loại",
    desc: "AI phân tích trong 652 danh mục bệnh lý và nhận diện dấu hiệu báo động đỏ (nếu có).",
  },
  {
    stepNumber: "03",
    title: "Chọn chuyên khoa",
    desc: "Xem các bệnh cảnh gợi ý liên quan và lựa chọn chuyên khoa phù hợp cần thăm khám.",
  },
  {
    stepNumber: "04",
    title: "Khám trực tiếp",
    desc: "Đặt hẹn với bác sĩ chuyên khoa để được chẩn đoán hình ảnh, xét nghiệm và điều trị chuẩn y khoa.",
  },
];
