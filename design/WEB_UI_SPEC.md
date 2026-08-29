# Đặc tả thiết kế — Web phòng khám + Trợ lý phân loại y tế

Tài liệu này là **spec để build**, không phải mô tả cảm hứng. Mọi con số đều là quyết định, không phải gợi ý.

---

## 0. Bối cảnh và nguyên tắc

Sản phẩm là website phòng khám tiếng Việt, có tích hợp trợ lý phân loại triệu chứng (triage bot) chạy trên kiến trúc RAG sẵn có.

Người dùng chính là **người đang lo lắng về sức khoẻ**, không phải người đi mua sắm. Nhiều người lớn tuổi, nhiều người dùng điện thoại, một số đang trong tình huống khẩn cấp. Ba nguyên tắc chi phối mọi quyết định thiết kế:

1. **Rõ hơn đẹp.** Khi hai thứ mâu thuẫn, chọn rõ ràng. Không bao giờ hy sinh khả năng đọc để lấy hiệu ứng.
2. **Cảnh báo cấp cứu phải không thể bỏ lỡ.** Đây là thành phần quan trọng nhất toàn site, thiết kế riêng, không dùng chung style với thông báo thường.
3. **Không giả vờ là bác sĩ.** Mọi kết quả phân loại đều kèm ghi chú giới hạn. Không dùng từ "chẩn đoán". Không hiển thị phần trăm chắc chắn như thể là kết luận y khoa.

---

## 1. Tech stack

```
Next.js 15 (App Router) + TypeScript
Tailwind CSS v4
shadcn/ui  (Radix primitives)
lucide-react  (icon — nét 1.75px, không dùng icon fill)
framer-motion  (chỉ cho scroll reveal + page transition)
next/font  (self-host, không gọi CDN)
```

Cấu trúc thư mục:

```
app/
  (marketing)/         layout riêng, có header/footer đầy đủ
    page.tsx           trang chủ
    dich-vu/
    bac-si/
    bang-gia/
    lien-he/
  (app)/               layout gọn, cho khu vực đã đăng nhập
    tro-ly/            giao diện chat triage
    dat-lich/
    ho-so/
  layout.tsx
components/
  ui/                  shadcn, không sửa trực tiếp
  marketing/
  triage/
  booking/
lib/
```

Lý do tách route group: khu marketing cần SEO và header lớn; khu ứng dụng cần tối đa không gian màn hình và điều hướng gọn. Hai layout khác nhau hoàn toàn.

---

## 2. Design tokens

### 2.1 Màu

Bảng màu tối giản: **một màu thương hiệu, một dải trung tính, bốn màu ngữ nghĩa**. Không thêm màu nào ngoài danh sách này.

```css
/* Thương hiệu — xanh y tế, trầm hơn xanh mặc định để bớt cảm giác "tech" */
--brand-50:  #EFF6FF;
--brand-100: #DBEAFE;
--brand-200: #BFD9FE;
--brand-300: #93BFFD;
--brand-400: #5E9CF9;
--brand-500: #3B82F6;
--brand-600: #1D6FE0;   /* màu hành động chính */
--brand-700: #1857B4;
--brand-800: #164A93;
--brand-900: #163F79;

/* Trung tính — hơi ngả xanh, ăn với brand */
--neutral-0:   #FFFFFF;
--neutral-50:  #F8FAFC;
--neutral-100: #F1F5F9;
--neutral-200: #E2E8F0;
--neutral-300: #CBD5E1;
--neutral-400: #94A3B8;
--neutral-500: #64748B;
--neutral-600: #475569;
--neutral-700: #334155;
--neutral-800: #1E293B;
--neutral-900: #0F172A;

/* Ngữ nghĩa */
--success: #059669;
--warning: #D97706;
--danger:  #DC2626;
--emergency: #B91C1C;   /* CHỈ dùng cho cảnh báo cấp cứu, không dùng chỗ khác */
```

**Quy tắc dùng màu:**
- Nền trang luôn là `--neutral-0` hoặc `--neutral-50`. Không dùng gradient làm nền toàn trang.
- `--brand-600` chỉ dành cho hành động chính và link. Mỗi khung nhìn có **tối đa một** nút brand đặc.
- Text chính `--neutral-800`, text phụ `--neutral-500`. Không bao giờ dùng dưới `--neutral-400` cho chữ.
- `--emergency` là màu **được bảo lưu**. Nếu nó xuất hiện trên màn hình, nghĩa là có tình huống cấp cứu. Không dùng nó cho nút xoá, badge giảm giá, hay bất cứ thứ gì khác.

### 2.2 Chữ

```
Tiêu đề:  Be Vietnam Pro  (600, 700)
Nội dung: Inter            (400, 500, 600)
```

Hai font này đều có bộ dấu tiếng Việt đầy đủ và dựng riêng cho dấu — quan trọng vì nhiều font phổ biến đặt dấu sai vị trí trên nguyên âm tiếng Việt. Self-host qua `next/font/google`, `display: 'swap'`.

Thang cỡ chữ (rem, gốc 16px):

| Vai trò | Cỡ | Line-height | Weight | Letter-spacing |
|---|---|---|---|---|
| Hero H1 | 3.5 / 2.25 mobile | 1.1 | 700 | -0.02em |
| H2 | 2.25 / 1.75 | 1.2 | 700 | -0.015em |
| H3 | 1.5 | 1.3 | 600 | -0.01em |
| H4 | 1.25 | 1.4 | 600 | 0 |
| Body lớn | 1.125 | 1.7 | 400 | 0 |
| Body | 1 | 1.65 | 400 | 0 |
| Nhỏ | 0.875 | 1.5 | 400 | 0 |
| Nhãn | 0.8125 | 1.4 | 600 | 0.02em |

Độ dài dòng nội dung tối đa **68 ký tự** (`max-w-[68ch]`). Tiếng Việt nhiều dấu nên dòng quá dài rất mỏi mắt.

### 2.3 Khoảng cách, bo góc, đổ bóng

Lưới 4px. Chỉ dùng: `4 8 12 16 24 32 48 64 96 128`.

Khoảng cách dọc giữa các section: `96px` desktop, `64px` mobile. Nhất quán tuyệt đối — đây là thứ tạo cảm giác "sạch" nhiều hơn bất kỳ chi tiết nào khác.

```css
--radius-sm: 8px;    /* badge, input nhỏ */
--radius-md: 12px;   /* nút, input */
--radius-lg: 16px;   /* card */
--radius-xl: 24px;   /* panel lớn, modal */
```

Đổ bóng phải **rất nhẹ**. Bóng nặng làm site y tế trông rẻ tiền.

```css
--shadow-sm: 0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06);
--shadow-md: 0 2px 4px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.06);
--shadow-lg: 0 4px 8px rgba(15,23,42,.04), 0 12px 32px rgba(15,23,42,.08);
```

Ưu tiên **viền `1px solid --neutral-200` thay vì bóng** để phân tách card. Chỉ dùng bóng cho phần tử nổi thật sự (dropdown, modal, nút hành động chính).

### 2.4 Chế độ tối

Bắt buộc hỗ trợ. Đảo vai trò trung tính, **giữ nguyên hue thương hiệu nhưng sáng hơn một bậc** (`--brand-400` làm màu hành động trên nền tối, vì `--brand-600` không đủ tương phản).

Định nghĩa toàn bộ token sáng ở `:root`, ghi đè trong `@media (prefers-color-scheme: dark)` có guard `:root:not([data-theme="light"])`, và lặp lại ở `:root[data-theme="dark"]` để nút chuyển chế độ thắng cả hai chiều.

---

## 3. Bản đồ trang

### 3.1 Trang chủ

Thứ tự section cố định:

1. **Hero** — H1 nói rõ phòng khám làm gì, một câu phụ, hai nút (chính: "Đặt lịch khám", phụ: "Hỏi trợ lý triệu chứng"). Bên phải là ảnh thật của phòng khám, tỉ lệ 4:3, bo `--radius-xl`. **Không dùng ảnh stock bác sĩ khoanh tay.**
2. **Dải tin cậy** — số năm hoạt động, số bệnh nhân, số bác sĩ, giấy phép. Bốn ô, chữ số lớn `--brand-700`.
3. **Chuyên khoa** — lưới 3 cột (1 cột mobile). Mỗi thẻ: icon nét, tên khoa, một dòng mô tả, link "Xem chi tiết".
4. **Trợ lý triệu chứng** — khối nổi bật giới thiệu bot, có ô nhập demo ngay tại chỗ. Kèm **ghi chú giới hạn** rõ ràng ngay dưới ô nhập.
5. **Quy trình khám** — 4 bước ngang, có đường nối.
6. **Đội ngũ bác sĩ** — carousel ảnh chân dung + chuyên môn + học hàm.
7. **Câu hỏi thường gặp** — accordion, tối đa 8 mục.
8. **CTA cuối** — nền `--brand-600`, chữ trắng, một nút duy nhất.

### 3.2 Giao diện trợ lý phân loại (`/tro-ly`)

Đây là màn hình quan trọng nhất. Bố cục 2 cột trên desktop, 1 cột + panel trượt trên mobile.

**Cột trái (70%) — luồng hội thoại**
- Tin nhắn bot: nền `--neutral-100`, bo `--radius-lg`, góc dưới-trái vuông.
- Tin nhắn người dùng: nền `--brand-600`, chữ trắng, góc dưới-phải vuông.
- Chỉ báo đang soạn: ba chấm nảy, chu kỳ 1.4s.
- Ô nhập dính đáy, tự giãn cao đến tối đa 5 dòng, có nút gửi và nút mic.

**Cột phải (30%) — bảng trạng thái**
- **Triệu chứng đã ghi nhận**: danh sách chip, mỗi chip có nút xoá. Chip mới thêm có animation nhấn nhá (xem §5).
- **Bệnh đang cân nhắc**: tối đa 3, mỗi mục có thanh mức độ phù hợp. **Không hiển thị số phần trăm** — dùng nhãn "Rất phù hợp / Phù hợp / Có thể" để tránh tạo ảo giác chính xác y khoa.
- **Mức độ khẩn**: badge màu theo `urgency` trả về từ backend.

**Trạng thái cấp cứu — thiết kế riêng**

Khi backend trả về cờ cấp cứu, giao diện phải **thay đổi hẳn**, không chỉ hiện một dòng chữ đỏ:

- Một dải `--emergency` chiếm toàn bộ chiều rộng ghim ở đỉnh khung chat, không cuộn theo.
- Icon cảnh báo 32px, chữ tối thiểu 18px, weight 600.
- Nút "Gọi 115" cỡ lớn (chiều cao tối thiểu 56px), là `<a href="tel:115">`, đặt ngay trong dải.
- Ô nhập bị vô hiệu hoá, thay bằng dòng "Vui lòng gọi cấp cứu ngay — trợ lý tạm dừng".
- Toàn bộ phần còn lại của giao diện giảm độ nổi (opacity 0.5) để dồn sự chú ý.
- **Không có animation nào ở trạng thái này** ngoài một lần fade-in 200ms. Không nhấp nháy, không rung — người đang hoảng loạn cần đọc được chữ.

### 3.3 Đặt lịch (`/dat-lich`)

Ba bước, có thanh tiến trình:
1. Chọn chuyên khoa + bác sĩ
2. Chọn ngày giờ — lịch tháng, ô giờ trống hiện `--brand-50`, ô đã kín gạch chéo nhạt
3. Thông tin liên hệ + xác nhận

Mỗi bước là một URL riêng (`?buoc=1`) để nút Back của trình duyệt hoạt động đúng.

### 3.4 Hồ sơ bệnh nhân (`/ho-so`)

Tab: Lịch hẹn / Lịch sử phân loại / Thông tin cá nhân. Bảng đơn giản, không lồng nhau. Trên mobile chuyển bảng thành danh sách thẻ.

---

## 4. Danh mục component

Dùng shadcn/ui làm nền, tuỳ biến theo token ở §2:

`Button` (variants: primary, secondary, ghost, danger) · `Input` · `Textarea` · `Select` · `Calendar` · `Dialog` · `Sheet` (mobile) · `Accordion` · `Tabs` · `Badge` · `Card` · `Avatar` · `Skeleton` · `Toast` · `Progress`

Component tự viết:

- `EmergencyBanner` — dải cấp cứu §3.2
- `SymptomChip` — chip triệu chứng có nút xoá
- `DiseaseCandidate` — mục bệnh + thanh mức độ phù hợp
- `ChatBubble` — bong bóng chat hai kiểu
- `TypingIndicator`
- `StepIndicator` — thanh tiến trình đặt lịch
- `DoctorCard`
- `MedicalDisclaimer` — khối ghi chú giới hạn, dùng lại ở nhiều nơi

**Kích thước chạm tối thiểu 44×44px** cho mọi phần tử tương tác. Người lớn tuổi và người đang run tay là nhóm dùng chính.

---

## 5. Đặc tả chuyển động

Mức độ: **vừa phải**. Chuyển động phục vụ việc hiểu bố cục, không phải để khoe.

### 5.1 Hằng số

```ts
const EASE_OUT = [0.16, 1, 0.3, 1];      // chủ đạo, cảm giác "hạ cánh mềm"
const EASE_IN_OUT = [0.65, 0, 0.35, 1];  // cho thứ đóng/mở
const DUR = {
  instant: 120,   // hover, focus
  fast: 200,      // đổi màu, hiện/ẩn nhỏ
  base: 320,      // scroll reveal, mở accordion
  slow: 480,      // chuyển trang, modal lớn
};
```

### 5.2 Từng hiệu ứng

**Scroll reveal** — mỗi section khi vào khung nhìn: `opacity 0→1`, `translateY 16px→0`, thời lượng `base`, easing `EASE_OUT`, kích hoạt khi 15% section hiện ra, **chỉ chạy một lần** (`viewport={{ once: true }}`). Các phần tử con trong lưới so le nhau `60ms`. Không so le quá 6 phần tử — phần tử thứ 7 trở đi chạy cùng lúc, nếu không sẽ có cảm giác chờ đợi.

**Hover nút** — nền đậm thêm một bậc, `translateY(-1px)`, bóng từ `sm` lên `md`, thời lượng `instant`. Không phóng to (`scale`) — nút phóng to trông rẻ tiền.

**Hover card** — viền đổi sang `--brand-200`, bóng `sm`→`md`, `translateY(-2px)`, thời lượng `fast`.

**Focus** — vòng `2px solid --brand-500` cách phần tử `2px`. **Không bao giờ tắt outline.** Nhiều người dùng bàn phím.

**Chip triệu chứng mới** — khi bot trích xuất được triệu chứng mới, chip xuất hiện với `scale 0.9→1` + `opacity 0→1`, `fast`, kèm một lần nháy nền `--brand-100` rồi trở về bình thường trong `600ms`. Đây là micro-interaction quan trọng nhất của sản phẩm: nó cho người dùng thấy bot **thực sự đang nghe**.

**Bong bóng chat mới** — `translateY 8px→0` + fade, `fast`. Tin nhắn bot xuất hiện sau chỉ báo đang soạn, không đột ngột thay thế.

**Accordion** — cao `0→auto`, `base`, `EASE_IN_OUT`, mũi tên xoay 180°.

**Chuyển trang** — fade `slow` giữa các route marketing. Khu ứng dụng **không chuyển trang** — cần cảm giác tức thì.

**Skeleton** — nhịp đập 1.6s, biên độ opacity 0.5→0.8. Không dùng hiệu ứng loé sáng chạy ngang.

### 5.3 Ràng buộc bắt buộc

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Không có ngoại lệ. Một số người bị chóng mặt do chuyển động, và đây là site y tế.

Ngoài ra: **không parallax**, **không auto-play carousel**, **không hiệu ứng khi cuộn ngược lên**, **không animation trên phần tử chứa thông tin y khoa quan trọng**.

---

## 6. Yêu cầu đặc thù ngành y

**Ghi chú giới hạn** phải xuất hiện ở: dưới ô nhập của trợ lý, cuối mỗi kết quả phân loại, và ở footer. Nội dung:

> Trợ lý này cung cấp thông tin tham khảo, **không thay thế chẩn đoán của bác sĩ**. Hãy đến cơ sở y tế để được thăm khám trực tiếp.

Kiểu dáng: nền `--neutral-50`, viền trái `3px --neutral-300`, chữ `--neutral-600` cỡ nhỏ. Đủ nhìn thấy, không gây hoảng.

**Từ ngữ cấm** trong toàn bộ giao diện: "chẩn đoán", "kết luận", "chắc chắn là", "bạn bị". Dùng thay bằng: "có thể liên quan đến", "gợi ý", "cần được bác sĩ kiểm tra".

**Số 115 phải luôn với tới được** trong tối đa một thao tác từ bất kỳ trang nào — đặt trong header dạng icon điện thoại, và trong footer dạng nút.

---

## 7. Khả năng tiếp cận

- Tương phản tối thiểu **WCAG AA**: 4.5:1 cho chữ thường, 3:1 cho chữ lớn. Dải cấp cứu phải đạt **AAA (7:1)**.
- Mọi ảnh có `alt` tiếng Việt có nghĩa.
- Luồng chat dùng `role="log"` `aria-live="polite"`; dải cấp cứu dùng `aria-live="assertive"`.
- Điều hướng bàn phím đầy đủ, có link "Bỏ qua tới nội dung chính".
- Cỡ chữ gốc không được nhỏ hơn 16px trên mobile (tránh iOS tự phóng khi focus input).
- Không truyền tải thông tin **chỉ bằng màu** — mức độ khẩn phải có cả icon và chữ.

---

## 8. Ngân sách hiệu năng

| Chỉ số | Mục tiêu |
|---|---|
| LCP | < 2.0s trên 4G |
| CLS | < 0.05 |
| INP | < 200ms |
| JS ban đầu | < 180KB gzip |
| Ảnh | AVIF/WebP, `next/image`, luôn có `width`/`height` |

Font self-host, `display: swap`, preload font tiêu đề. Không nhúng script bên thứ ba nào ở trang chủ ngoài analytics.

---

## 9. Những điều KHÔNG làm

- Không gradient tím-hồng, không glassmorphism, không neon. Đây là phòng khám, không phải sản phẩm crypto.
- Không dùng emoji làm icon trong giao diện.
- Không popup khuyến mãi, không đếm ngược giả tạo.
- Không ảnh stock trắng bệch kiểu "bác sĩ khoanh tay cười". Nếu chưa có ảnh thật, dùng minh hoạ hình học đơn giản theo màu thương hiệu.
- Không hiển thị phần trăm độ chắc chắn của kết quả phân loại.
- Không dark pattern ở luồng đặt lịch — nút huỷ phải dễ thấy ngang nút xác nhận.
- Không animation nào chạy vô hạn ngoài chỉ báo tải.

---

## 10. Thứ tự dựng

1. Token + `tailwind.config` + layout gốc + dark mode
2. Component `ui/` cơ bản (Button, Input, Card, Badge)
3. Header + Footer (có sẵn số 115)
4. Trang chủ, từng section một
5. Giao diện trợ lý — **làm `EmergencyBanner` trước tiên**, trước cả bong bóng chat
6. Luồng đặt lịch
7. Hồ sơ bệnh nhân
8. Rà tiếp cận + đo hiệu năng

Sau mỗi mục, kiểm tra ở ba khung: 375px, 768px, 1440px — và thử ở cả hai chế độ sáng/tối.
