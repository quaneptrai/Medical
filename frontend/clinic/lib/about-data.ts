/**
 * Nội dung trang Giới thiệu / Tầm nhìn – Sứ mệnh / Thành tựu / Sản phẩm – Dịch vụ.
 * Tách riêng khỏi component để đội nội dung sửa chữ mà không phải chạm vào JSX.
 */

export const VISION = {
  intro:
    'Phòng khám Đa khoa Quốc tế Quang Thanh được xây dựng tại An Lão, Hải Phòng với một mong muốn giản dị: người dân trong vùng ' +
    'có thể tiếp cận bác sĩ chuyên khoa mà không phải bắt xe lên tuyến trên ngay từ triệu chứng đầu tiên. Chúng tôi kết hợp ' +
    'đội ngũ bác sĩ nhiều năm kinh nghiệm với một hệ thống định hướng chuyên khoa được chuẩn hóa, để mỗi lần khám bắt đầu ' +
    'đúng chỗ và kết thúc bằng một hướng đi rõ ràng.',
  vision:
    'Trở thành phòng khám đa khoa được người dân Hải Phòng tin cậy chọn đầu tiên khi có vấn đề sức khỏe — nơi mà thông tin ' +
    'y khoa được giải thích đủ rõ để người bệnh tự tin ra quyết định, chứ không chỉ nhận một tờ đơn thuốc.',
  mission: 'Khám đúng người, giải thích đủ hiểu, đồng hành tới khi khỏe lại.',
  missionDetail:
    'Mỗi ca khám tại Quang Thanh đều hướng tới ba việc: xác định đúng chuyên khoa cần xử lý, nói cho người bệnh biết chuyện ' +
    'gì đang xảy ra bằng ngôn ngữ họ hiểu, và giữ liên lạc cho tới khi vấn đề được giải quyết hoặc chuyển tuyến an toàn.',
};

export const CORE_VALUES = [
  {
    key: 'T',
    name: 'Tận tâm',
    en: 'Thoughtful',
    text: 'Dành đủ thời gian cho một người bệnh, kể cả khi phòng chờ còn đông. Không kết luận vội khi thông tin chưa đủ.',
  },
  {
    key: 'Â',
    name: 'Ân cần',
    en: 'Empathetic',
    text: 'Nghe hết câu chuyện trước khi hỏi tới triệu chứng. Tôn trọng nỗi lo của người bệnh kể cả khi kết quả bình thường.',
  },
  {
    key: 'M',
    name: 'Minh bạch',
    en: 'Transparent',
    text: 'Nói rõ chi phí, nói rõ giới hạn của phòng khám và chuyển tuyến ngay khi vượt quá phạm vi chuyên môn.',
  },
  {
    key: 'C',
    name: 'Chuẩn mực',
    en: 'Evidence-based',
    text: 'Phác đồ bám theo hướng dẫn hiện hành của Bộ Y tế và các hội chuyên ngành, cập nhật định kỳ qua sinh hoạt chuyên môn.',
  },
];

export const CAPACITY = [
  { value: '10', label: 'Chuyên khoa' },
  { value: '40', label: 'Bác sĩ tiếp nhận' },
  { value: '669', label: 'Mục bệnh lý chuẩn hóa' },
  { value: '11h', label: 'Giờ mở cửa mỗi ngày' },
  { value: '7/7', label: 'Ngày trong tuần' },
  { value: '0đ', label: 'Phí khám ban đầu' },
];

export const ACCREDITATIONS = [
  {
    code: 'GPHĐ',
    name: 'Giấy phép hoạt động khám bệnh, chữa bệnh',
    issuer: 'Sở Y tế Hải Phòng',
    text: 'Phòng khám hoạt động theo giấy phép số 0892/SYT-GPHĐ, với danh mục kỹ thuật được phê duyệt cho từng chuyên khoa. ' +
      'Toàn bộ bác sĩ tiếp nhận đều có chứng chỉ hành nghề còn hiệu lực đúng phạm vi chuyên môn.',
  },
  {
    code: 'ATTT',
    name: 'Chuẩn an toàn thông tin người bệnh',
    issuer: 'Nội bộ · đối chiếu ISO/IEC 27001',
    text: 'Hồ sơ người bệnh lưu trên hệ thống có phân quyền truy cập, mật khẩu băm bằng Argon2id và phiên đăng nhập HttpOnly. ' +
      'Mọi thao tác trên dữ liệu người bệnh đều được ghi nhật ký phục vụ đối soát.',
  },
  {
    code: 'KSNK',
    name: 'Quy trình kiểm soát nhiễm khuẩn',
    issuer: 'Theo hướng dẫn Bộ Y tế',
    text: 'Tiệt khuẩn dụng cụ, phân luồng người bệnh có triệu chứng hô hấp và vệ sinh buồng khám theo lịch cố định, ' +
      'có bảng kiểm ghi nhận từng ca trực.',
  },
  {
    code: 'CLCM',
    name: 'Sinh hoạt và bình bệnh án chuyên môn',
    issuer: 'Hội đồng chuyên môn phòng khám',
    text: 'Các ca khó được đưa ra hội chẩn hằng tuần; phác đồ dùng chung được rà soát theo quý dựa trên khuyến cáo mới nhất ' +
      'của các hội chuyên ngành trong nước.',
  },
  {
    code: 'AI',
    name: 'Hệ thống định hướng chuyên khoa được thẩm định lâm sàng',
    issuer: 'Hội đồng chuyên môn · đánh giá trên bộ dữ liệu kiểm chứng',
    text: 'Trợ lý sức khỏe của phòng khám chạy trên kho tri thức 669 mục bệnh lý, kèm bộ luật cảnh báo cấp cứu được bác sĩ ' +
      'rà soát. Trợ lý chỉ gợi ý hướng khám, không đưa ra chẩn đoán.',
  },
];

export const MILESTONES = [
  { year: '2026', title: 'Đưa cẩm nang sức khỏe 669 mục bệnh lý lên website', text: 'Người bệnh tra cứu được theo cơ quan hoặc theo tên bệnh trước khi tới khám.' },
  { year: '2025', title: 'Triển khai trợ lý định hướng chuyên khoa', text: 'Mô tả triệu chứng bằng lời nói hoặc bàn phím, hệ thống gợi ý khoa phù hợp và cảnh báo dấu hiệu cấp cứu.' },
  { year: '2024', title: 'Miễn phí 100% phí khám ban đầu', text: 'Bỏ rào cản chi phí ở bước đầu tiên để người bệnh đi khám sớm hơn thay vì chờ triệu chứng nặng lên.' },
  { year: '2023', title: 'Mở rộng lên 10 chuyên khoa', text: 'Bổ sung Nhi, Mắt, Tai Mũi Họng và Cơ xương khớp – Phục hồi chức năng.' },
  { year: '2021', title: 'Đặt lịch trực tuyến và hồ sơ bác sĩ công khai', text: 'Người bệnh xem trước hồ sơ chuyên môn và lịch làm việc của bác sĩ trước khi chọn.' },
  { year: '2018', title: 'Hoàn thiện khối cận lâm sàng', text: 'Xét nghiệm, siêu âm, X-quang và nội soi tiêu hóa thực hiện tại chỗ, trả kết quả trong ngày.' },
  { year: '2008', title: 'Khai trương tại Quang Trung, An Lão, Hải Phòng', text: 'Bắt đầu với phòng khám nội tổng quát và ba bác sĩ cơ hữu.' },
];

export type ServicePackage = {
  slug: string;
  name: string;
  tagline: string;
  audience: string;
  description: string;
  includes: string[];
  note: string;
  specialtyId?: string;
};

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    slug: 'kham-suc-khoe-tong-quat',
    name: 'Dịch vụ sức khỏe tổng quát',
    tagline: 'Phát hiện sớm khi cơ thể chưa kịp lên tiếng',
    audience: 'Người trưởng thành · khám định kỳ 6–12 tháng',
    description:
      'Gói khám rà soát các cơ quan chính bằng xét nghiệm và chẩn đoán hình ảnh cơ bản, kết thúc bằng buổi tư vấn đọc kết quả ' +
      'với bác sĩ nội tổng quát để biết cần theo dõi tiếp điều gì.',
    includes: ['Khám lâm sàng toàn thân', 'Xét nghiệm máu, nước tiểu cơ bản', 'Siêu âm ổ bụng tổng quát', 'X-quang ngực thẳng', 'Điện tim', 'Tư vấn đọc kết quả cùng bác sĩ'],
    note: 'Nhịn ăn 8 tiếng trước giờ hẹn để kết quả xét nghiệm chính xác.',
  },
  {
    slug: 'tam-soat-chuyen-sau',
    name: 'Tầm soát chuyên sâu theo chuyên khoa',
    tagline: 'Đi sâu vào đúng nhóm nguy cơ của bạn',
    audience: 'Người có yếu tố nguy cơ hoặc triệu chứng kéo dài',
    description:
      'Khi khám tổng quát phát hiện bất thường, hoặc khi bạn có tiền sử gia đình, phòng khám xây dựng gói tầm soát riêng theo ' +
      'chuyên khoa: tiêu hóa, tim mạch, hô hấp, nội tiết hoặc phụ khoa.',
    includes: ['Nội soi dạ dày – đại tràng NBI tiền mê', 'Siêu âm tim Doppler màu', 'Đo chức năng hô hấp', 'Xét nghiệm chỉ điểm theo chỉ định', 'Kế hoạch theo dõi từng mốc thời gian'],
    note: 'Danh mục cụ thể do bác sĩ chuyên khoa chỉ định sau buổi khám đầu tiên.',
    specialtyId: 'tieu-hoa',
  },
  {
    slug: 'theo-doi-thai-ky',
    name: 'Theo dõi thai kỳ trọn gói',
    tagline: 'Một bác sĩ đi cùng mẹ suốt thai kỳ',
    audience: 'Thai phụ từ tam cá nguyệt đầu tiên',
    description:
      'Lịch khám thai theo mốc chuẩn, siêu âm hình thái và các xét nghiệm sàng lọc cần thiết, do cùng một bác sĩ sản khoa theo dõi ' +
      'để mẹ không phải kể lại bệnh sử mỗi lần tới.',
    includes: ['Khám thai định kỳ theo mốc tuần', 'Siêu âm thai và siêu âm hình thái', 'Xét nghiệm sàng lọc trước sinh', 'Tư vấn dinh dưỡng thai kỳ', 'Hướng dẫn dấu hiệu cần nhập viện ngay'],
    note: 'Phòng khám không thực hiện đỡ đẻ; sản phụ được chuyển tuyến theo kế hoạch đã thống nhất từ trước.',
    specialtyId: 'san-phu-khoa',
  },
  {
    slug: 'cham-soc-sau-sinh',
    name: 'Chăm sóc mẹ và bé sau sinh',
    tagline: 'Sáu tuần đầu là giai đoạn cần người đồng hành nhất',
    audience: 'Sản phụ sau sinh và trẻ sơ sinh',
    description:
      'Theo dõi phục hồi của mẹ và sự phát triển của bé trong giai đoạn hậu sản: vết mổ, tiết sữa, sàng lọc sơ sinh, cân nặng ' +
      'và các mốc tiêm chủng đầu đời.',
    includes: ['Khám hậu sản cho mẹ', 'Hướng dẫn nuôi con bằng sữa mẹ', 'Khám và cân đo cho bé', 'Tư vấn lịch tiêm chủng', 'Sàng lọc vàng da sơ sinh'],
    note: 'Có thể kết hợp cùng gói theo dõi thai kỳ để giữ nguyên bác sĩ phụ trách.',
    specialtyId: 'nhi-khoa',
  },
  {
    slug: 'cham-soc-nguoi-cao-tuoi',
    name: 'Chăm sóc sức khỏe người cao tuổi',
    tagline: 'Quản lý bệnh mạn tính mà không phải đi lại nhiều lần',
    audience: 'Người từ 60 tuổi hoặc đang dùng thuốc dài hạn',
    description:
      'Gói dành cho người có tăng huyết áp, đái tháo đường, bệnh khớp hoặc nhiều bệnh cùng lúc: một lần tới khám được rà soát ' +
      'toàn bộ đơn thuốc đang dùng, đo các chỉ số cần theo dõi và hẹn lịch tái khám cụ thể.',
    includes: ['Khám nội tổng quát và rà soát đơn thuốc', 'Theo dõi huyết áp, đường huyết, mỡ máu', 'Đánh giá nguy cơ té ngã và vận động', 'Tư vấn dinh dưỡng cho bệnh mạn tính', 'Kênh liên lạc với bác sĩ giữa hai lần khám'],
    note: 'Người nhà nên mang theo toàn bộ thuốc đang dùng khi đi khám.',
    specialtyId: 'tim-mach',
  },
  {
    slug: 'kham-chuyen-khoa-ban-dau',
    name: 'Khám chuyên khoa ban đầu',
    tagline: 'Miễn phí 100% — bước đầu tiên không nên bị cản bởi chi phí',
    audience: 'Mọi người bệnh tới khám lần đầu',
    description:
      'Buổi khám lâm sàng với bác sĩ chuyên khoa để xác định vấn đề và quyết định có cần cận lâm sàng hay không. ' +
      'Nếu không cần làm thêm gì, bạn ra về mà không mất chi phí khám.',
    includes: ['Hỏi bệnh sử và khám lâm sàng', 'Định hướng chuyên khoa phù hợp', 'Chỉ định cận lâm sàng nếu cần', 'Giải thích kết quả và hướng xử trí'],
    note: 'Chi phí cận lâm sàng, thủ thuật và thuốc tính riêng theo bảng giá niêm yết.',
  },
];
