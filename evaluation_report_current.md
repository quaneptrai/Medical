# BotMedical — chỉ mục bằng chứng hiện tại

Cập nhật: 2026-08-30. Đây là trạng thái kỹ thuật, không phải chứng nhận lâm sàng.

## Quyết định hiện tại

- Chưa có `data/test_cases/clinical_holdout.json`; vì vậy chưa được tuyên bố cải
  thiện lâm sàng thật hoặc phát hành semantic guardrail ở chế độ auto.
- `real_benchmark_candidates.csv` có 441 ca thô và toàn bộ `actual_label` còn
  trống. Cần hai reviewer độc lập và một adjudicator thật cho từng ca được nhận.
- Benchmark validation có 34 ca cấp cứu đã được dùng để chọn alpha 0,07. Quan
  sát 34/34 chỉ có Wilson lower bound xấp xỉ 89,8%, không phải final holdout.

## Model đang chạy

- Retrieval: `bge-m3-medical-v2-recovered-a050-fp16`, alpha 0,50,
  SHA-256 `4e4a45962d7a1063366968463314bbe4d45d9373202199c882a62b84dc6b6446`.
- Đây là bản suy ra từ blend FP16 alpha 0,07 do checkpoint FP32 gốc đã mất. Sai
  số làm tròn FP16 bị khuếch đại; xem `models/registry.json` và blend manifest.
- Semantic guardrail dùng artifact alpha 0,07 riêng biệt, không dùng model
  retrieval alpha 0,50.

## Retrieval validation

Nguồn: `artifacts/evaluation/recovered_alpha050_comparison.json`. Hai benchmark
này là validation/same-distribution, không phải clinical holdout.

| Dataset / route | BGE-M3 R@1 / R@5 | Candidate R@1 / R@5 | N |
|---|---:|---:|---:|
| Generated colloquial / dense | 47,90% / 86,97% | 52,73% / 90,97% | 476 |
| Generated colloquial / hybrid | 43,70% / 83,61% | 44,54% / 84,03% | 476 |
| 603 diseases / dense | 34,13% / 56,75% | 41,13% / 65,57% | 3.015 |
| 603 diseases / hybrid | 39,14% / 60,76% | 39,97% / 62,09% | 3.015 |

Hybrid dùng BM25 weight 0,10 theo `artifacts/evaluation/bm25_weight_sweep.json`;
không được tune lại bằng final holdout.

## Guardrail

Nguồn: `artifacts/evaluation/guardrail_calibration.json`.

- `deployment_approved=false`, `semantic_mode=advisory`.
- 34 emergency / 432 non-emergency; ngưỡng hiện tại 0,58.
- Recall quan sát 100%, specificity 32,9%, 290 false positive.
- Điều kiện auto tối thiểu là 200/200, không quan sát false negative và
  specificity ≥90%. Hiện rule cứng deterministic/regex chịu trách nhiệm
  auto-escalate; semantic chỉ đưa gợi ý cần xác nhận.

## Holdout và golden

- Holdout: **MISSING / BLOCKED**. Quy trình nằm trong `CLINICAL_VALIDATION.md` và
  `docs/agent_briefs/05_build_clinical_holdout.md`.
- Golden report 10/10 cũ đã superseded vì GTC_009 được chấm sai. Chưa có kết quả
  golden hiện hành cho tới khi chạy lại audited evaluator.

## Kiểm thử

Lần kiểm tra local gần nhất: `python -m pytest tests -q` — 56 test pass. Kết quả
này chứng minh các invariant phần mềm đã kiểm tra, không chứng minh an toàn lâm sàng.
