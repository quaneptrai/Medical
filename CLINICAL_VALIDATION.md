# Quy trình validation lâm sàng trước phát hành

## Trạng thái hiện tại

Model FP16 đã đóng gói và chạy được, nhưng chưa có bằng chứng đủ để tuyên bố cải thiện
lâm sàng hoặc “zero false negatives”. Benchmark hiện tại là validation vì đã được dùng
để chọn `alpha=0.07`; 34 ca cấp cứu chỉ cho Wilson lower bound xấp xỉ 89,8% khi quan sát
34/34 hit.

## Final holdout bắt buộc

Tập final holdout phải có tối thiểu 200 ca cấp cứu và 200 ca thường, lấy từ ca thật đã
ẩn danh hoặc được chuyên gia lâm sàng viết độc lập. Không đưa câu do model sinh từ cùng
knowledge base vào final holdout.

Mỗi ca cần hai người gán nhãn độc lập và một người phân xử; ba reviewer ID phải khác
nhau. Chỉ ca có `review_status=adjudicated` mới hợp lệ. Không ghi tên, số điện thoại,
địa chỉ, mã bệnh án hoặc dữ liệu nhận dạng bệnh nhân vào repo.

Schema thực thi nằm tại `src/evaluation/holdout_schema.py`. Khi dữ liệu đã được khóa:

```powershell
python scripts/validate_clinical_holdout.py data/test_cases/clinical_holdout.json
```

Script kiểm tra số lượng, trùng câu, trạng thái review và ghi SHA-256 vào
`artifacts/evaluation/clinical_holdout_manifest.json`. Sau khi đã xem kết quả final
holdout, không được quay lại chỉnh model/cấu hình rồi báo lại cùng tập đó như kết quả
final; mọi thay đổi phải chuyển sang một phiên bản holdout mới chưa được xem.

## Tiêu chí phát hành

- Emergency recall phải báo cả point estimate và Wilson 95% CI; không dùng cụm từ
  “zero false negatives” như một bảo đảm production.
- Guardrail semantic chỉ được auto-escalate khi vừa đạt zero observed FN trên holdout
  vừa đạt specificity tối thiểu 90%. Nếu không, nó chỉ là advisory cho tầng xác nhận.
- Báo paired bootstrap CI và McNemar exact test cho chênh lệch base/candidate trên cùng
  ca. Nếu CI chứa 0 hoặc phép thử không đủ bằng chứng, ghi rõ gain chưa được chứng minh.
- Golden evaluation chỉ được gọi là `clinical_pass` khi các tiêu chí tự động đều qua và
  `review_status=clinician_approved`; tên reviewer dạng văn bản không tự chứng minh đã duyệt.
- Route retrieval cấp cứu dùng dense-only; route ca thường dùng hybrid weight đã tune
  trên validation, tuyệt đối không tune trên final holdout.

## Quyết định thuê GPU tiếp theo

Không thuê GPU chỉ để lặp lại cấu hình train cũ. Chỉ train vòng mới sau khi đã chuẩn bị
hard negatives cho các bệnh/típ bệnh dễ nhầm, tách selection/validation/final holdout và
định trước tiêu chí dừng. Mọi gain sau đó vẫn phải được xác minh trên final holdout.
