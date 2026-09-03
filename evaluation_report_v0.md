# ⚠ HISTORICAL / SUPERSEDED — KHÔNG PHẢI BẰNG CHỨNG PHÁT HÀNH

Báo cáo ba ca này dùng stack retrieval và cấu hình cũ. Nội dung được giữ lại chỉ
để audit; không được dùng làm bằng chứng chất lượng, an toàn hay validation hiện tại.
Xem `evaluation_report_current.md` để biết trạng thái đang có hiệu lực.

# BÁO CÁO ĐÁNH GIÁ (EVALUATION REPORT) - RAG V0

**Tỉ lệ vượt qua:** 3/3

## TC01: Sốt xuất huyết (Dengue) - ✅ PASS
**Query:** "Tôi bị sốt cao 39 độ liên tục 2 ngày nay, kèm đau nhức hốc mắt và đau mỏi cơ khớp kinh khủng. Không ho không sổ mũi."
- **Triệu chứng trích xuất được:** sốt cao (liên tục) - mức độ cao - trong 2 ngày; đau nhức hốc mắt (kinh khủng) - mức độ cao - trong 2 ngày; đau mỏi cơ khớp (kinh khủng) - mức độ cao - trong 2 ngày
- **Bệnh dự đoán (Top 3 Vector Search):** Sốt xuất huyết Dengue, Cảm cúm, COVID-19 (Bệnh vi-rút Corona 2019)
- **Cảnh báo khẩn cấp (Red Flag):** []
- **Bot phản hồi:** Bạn có thể đang gặp phải triệu chứng của bệnh sốt xuất huyết Dengue. Hãy cho tôi biết thêm thông tin về việc bạn đã sử dụng thuốc hạ sốt và liệu nhiệt độ đã giảm chưa?
- *Thời gian xử lý: 45.69s*

## TC02: Nhồi máu cơ tim (Emergency) - ✅ PASS
**Query:** "Tôi bị đau ngực trái dữ dội, vã mồ hôi lạnh và cảm giác nghẹt thở. Nghỉ ngơi không đỡ."
- **Triệu chứng trích xuất được:** đau ngực trái dữ dội (không giảm khi nghỉ ngơi) - mức độ dữ dội - trong dài; vã mồ hôi lạnh - mức độ dữ dội - trong dài; cảm giác nghẹt thở - mức độ dữ dội - trong dài
- **Bệnh dự đoán (Top 3 Vector Search):** Nhồi máu cơ tim, Thiếu máu, Hen suyễn
- **Cảnh báo khẩn cấp (Red Flag):** ['đau ngực trái dữ dội kéo dài >15 phút không giảm khi nghỉ ngơi', 'Đau tức thắt ngực dữ dội kiểu đè nặng lan tay/vai trái / Nghi ngờ Nhồi máu cơ tim']
- **Bot phản hồi:** Bạn cần được cấp cứu ngay lập tức. Hãy gọi ngay 115 hoặc đến phòng cấp cứu bệnh viện gần nhất ngay lập tức.
- *Thời gian xử lý: 51.03s*

## TC03: Trào ngược dạ dày (GERD) - ✅ PASS
**Query:** "Ăn xong hay bị ợ hơi ợ chua, thi thoảng rát cổ họng lúc sáng ngủ dậy."
- **Triệu chứng trích xuất được:** ợ hơi ợ chua (sau khi ăn, sáng ngủ dậy) - mức độ không rõ - trong thi thoảng; rát cổ họng (sáng ngủ dậy) - mức độ không rõ - trong thi thoảng
- **Bệnh dự đoán (Top 3 Vector Search):** Trào ngược dạ dày thực quản, Hội chứng ruột kích thích, Viêm dạ dày
- **Cảnh báo khẩn cấp (Red Flag):** []
- **Bot phản hồi:** Bạn có thể đang gặp phải triệu chứng của trào ngược dạ dày thực quản (GERD). Triệu chứng này thường bao gồm ợ hơi, ợ chua và rát cổ họng. Để xác định chắc chắn, chúng tôi cần hỏi thêm một số câu hỏi. Bạn có thể cho biết các triệu chứng này xảy ra bao nhiêu lần một tuần và đã kéo dài bao lâu?
- *Thời gian xử lý: 44.93s*
