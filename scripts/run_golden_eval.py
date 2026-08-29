import os
import sys
import time
import json
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from conversation.state import ConversationState
from llm.triage_bot import TriageBot
from evaluation.golden_schema import GoldenTestCase
from evaluation.golden_evaluator import evaluate_golden_case, normalize_label


def run_golden_evaluation(model_name: str = "llama3.1:8b"):
    load_dotenv()
    
    print("\n" + "="*70, flush=True)
    print(f"  RUNNING CLINICAL GOLDEN BENCHMARK (Ollama Model: {model_name})", flush=True)
    print("="*70 + "\n", flush=True)
    
    cases_file = ROOT / "data" / "test_cases" / "golden_cases.json"
    with open(cases_file, "r", encoding="utf-8") as f:
        cases_data = json.load(f)
        
    golden_cases = [GoldenTestCase(**c) for c in cases_data]
    print(f"[*] Loaded {len(golden_cases)} Golden Test Cases (review status is scored explicitly).\n", flush=True)
    
    bot = TriageBot(provider="ollama", ollama_model=model_name)
    
    report_lines = []
    report_lines.append("# BÁO CÁO GOLDEN EVALUATION CÓ KIỂM TOÁN\n")
    report_lines.append(f"- **Mô hình suy luận (LLM):** `{model_name}` qua Ollama (Local)")
    report_lines.append(f"- **Số ca kiểm thử lâm sàng:** {len(golden_cases)} ca")
    report_lines.append(f"- **Thời gian chạy:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    automated_passed = 0
    clinical_passed = 0
    emergency_passed = 0
    emergency_total = 0
    case_results = []
    category_by_name = {
        normalize_label(disease.name_vi): disease.category
        for disease in bot.search_engine.diseases
    }
    
    for case_idx, case in enumerate(golden_cases, start=1):
        print(f"[*] Dang chay case [{case.case_id}]: {case.ground_truth_disease}...", flush=True)
        state = ConversationState(session_id=case.case_id)
        
        turn_logs = []
        
        for turn_idx, turn in enumerate(case.dialogue, start=1):
            start_t = time.time()
            bot_reply, state = bot.process_turn(turn.user_utterance, state)
            turn_latency = time.time() - start_t
            
            turn_logs.append({
                "turn": turn_idx,
                "user": turn.user_utterance,
                "bot": bot_reply,
                "stage": state.diagnostic_stage,
                "symptoms": [s.name for s in state.symptoms],
                "red_flags": state.red_flags_detected,
                "candidates": state.candidate_diseases,
                "latency": round(turn_latency, 2)
            })
            
        result = evaluate_golden_case(
            case,
            turn_logs,
            candidate_category_by_name=category_by_name,
        )
        result["turn_logs"] = turn_logs
        case_results.append(result)
        automated_passed += int(result["automated_pass"])
        clinical_passed += int(result["clinical_pass"])
            
        if case.is_emergency:
            emergency_total += 1
            if state.diagnostic_stage == "emergency":
                emergency_passed += 1
                
        if result["clinical_pass"]:
            status_str = "✅ CLINICAL PASS"
        elif result["automated_pass"]:
            status_str = "⚠️ AUTOMATED PASS / REVIEW REQUIRED"
        else:
            status_str = "❌ FAIL"
            
        progress_pct = (case_idx / len(golden_cases)) * 100
        print(f"[{progress_pct:3.0f}%] ({case_idx}/{len(golden_cases)}) -> Ket qua: {status_str} | Stage: {state.diagnostic_stage} | Candidates: {state.candidate_diseases[:2]}\n", flush=True)
        
        report_lines.append(f"## [{case.case_id}] {case.ground_truth_disease} - {status_str}")
        report_lines.append(f"- **Chuyên khoa:** `{case.category}` | **Cấp cứu (Emergency):** `{case.is_emergency}`")
        report_lines.append(f"- **Bệnh cảnh:** {case.clinical_scenario}")
        report_lines.append(f"- **Trạng thái duyệt:** `{case.review_status}`")
        report_lines.append(f"- **Nhãn người duyệt (chưa tự chứng minh danh tính):** {case.clinician_reviewer}")
        report_lines.append(f"- **Lý giải y khoa:** {case.clinical_rationale}")
        report_lines.append("### Kết quả từng tiêu chí:")
        for check in result["checks"]:
            marker = "PASS" if check["passed"] else "FAIL"
            report_lines.append(f"- **{marker} — {check['name']}:** {check['detail']}")
        report_lines.append("### Diễn biến hội thoại:")
        for log in turn_logs:
            report_lines.append(f"  - **Lượt {log['turn']} User:** *\"{log['user']}\"*")
            report_lines.append(f"  - **Bot Reply:** {log['bot']}")
            report_lines.append(f"  - *Trích xuất: Triệu chứng={log['symptoms']} | Red Flags={log['red_flags']} | Stage={log['stage']} ({log['latency']}s)*\n")
            
    # Summary
    automated_rate = (automated_passed / len(golden_cases)) * 100
    clinical_rate = (clinical_passed / len(golden_cases)) * 100
    safety_rate = (emergency_passed / emergency_total * 100) if emergency_total > 0 else 100
    
    summary_text = (
        f"\n## TỔNG KẾT:\n"
        f"- **Automated pass:** **{automated_rate:.1f}%** ({automated_passed}/{len(golden_cases)})\n"
        f"- **Clinical pass có duyệt:** **{clinical_rate:.1f}%** ({clinical_passed}/{len(golden_cases)})\n"
        f"- **Observed emergency stage recall:** **{safety_rate:.1f}%** ({emergency_passed}/{emergency_total})\n"
        "- Automated pass không được diễn giải là thẩm định lâm sàng.\n"
    )
    report_lines.insert(4, summary_text)
    
    out_file = ROOT / "golden_evaluation_report.md"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
    json_file = ROOT / "artifacts" / "evaluation" / "golden_evaluation.json"
    json_file.parent.mkdir(parents=True, exist_ok=True)
    with json_file.open("w", encoding="utf-8") as f:
        json.dump({
            "model": model_name,
            "automated_passed": automated_passed,
            "clinical_passed": clinical_passed,
            "emergency_passed": emergency_passed,
            "emergency_total": emergency_total,
            "cases": case_results,
        }, f, ensure_ascii=False, indent=2)
        
    print(f"\n[OK] Reports: {out_file} and {json_file}", flush=True)


if __name__ == "__main__":
    # Choose fastest responsive model or llama3.1
    import sys
    model = sys.argv[1] if len(sys.argv) > 1 else "llama3.1:8b"
    run_golden_evaluation(model)
