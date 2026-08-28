import os
import sys
import io
import time
import json
from pathlib import Path
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from conversation.state import ConversationState
from llm.triage_bot import TriageBot
from evaluation.golden_schema import GoldenTestCase


def run_golden_evaluation(model_name: str = "llama3.1:8b"):
    load_dotenv()
    
    print("\n" + "="*70, flush=True)
    print(f"  RUNNING CLINICAL GOLDEN BENCHMARK (Ollama Model: {model_name})", flush=True)
    print("="*70 + "\n", flush=True)
    
    cases_file = Path("data/test_cases/golden_cases.json")
    with open(cases_file, "r", encoding="utf-8") as f:
        cases_data = json.load(f)
        
    golden_cases = [GoldenTestCase(**c) for c in cases_data]
    print(f"[*] Loaded {len(golden_cases)} verified Golden Test Cases.\n", flush=True)
    
    bot = TriageBot(provider="ollama", ollama_model=model_name)
    
    report_lines = []
    report_lines.append("# BÁO CÁO ĐÁNH GIÁ LÂM SÀNG THẬT (END-TO-END GOLDEN EVALUATION)\n")
    report_lines.append(f"- **Mô hình suy luận (LLM):** `{model_name}` qua Ollama (Local)")
    report_lines.append(f"- **Số ca kiểm thử lâm sàng:** {len(golden_cases)} ca")
    report_lines.append(f"- **Thời gian chạy:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    passed_cases = 0
    emergency_passed = 0
    emergency_total = 0
    
    for case_idx, case in enumerate(golden_cases, start=1):
        print(f"[*] Dang chay case [{case.case_id}]: {case.ground_truth_disease}...", flush=True)
        state = ConversationState(session_id=case.case_id)
        
        case_passed = True
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
            
            # Check emergency requirement
            if case.is_emergency and state.diagnostic_stage != "emergency":
                case_passed = False
                
        # Differential diagnosis check
        top_candidates = [c.lower() for c in state.candidate_diseases]
        match_gt = any(
            case.ground_truth_disease.lower() in c or c in case.ground_truth_disease.lower()
            for c in top_candidates
        )
        if not match_gt:
            case_passed = False
            
        if case.is_emergency:
            emergency_total += 1
            if state.diagnostic_stage == "emergency":
                emergency_passed += 1
                
        if case_passed:
            passed_cases += 1
            status_str = "✅ PASS"
        else:
            status_str = "❌ FAIL"
            
        progress_pct = (case_idx / len(golden_cases)) * 100
        print(f"[{progress_pct:3.0f}%] ({case_idx}/{len(golden_cases)}) -> Ket qua: {status_str} | Stage: {state.diagnostic_stage} | Candidates: {state.candidate_diseases[:2]}\n", flush=True)
        
        report_lines.append(f"## [{case.case_id}] {case.ground_truth_disease} - {status_str}")
        report_lines.append(f"- **Chuyên khoa:** `{case.category}` | **Cấp cứu (Emergency):** `{case.is_emergency}`")
        report_lines.append(f"- **Bệnh cảnh:** {case.clinical_scenario}")
        report_lines.append(f"- **Bác sĩ thẩm định:** {case.clinician_reviewer}")
        report_lines.append(f"- **Lý giải y khoa:** {case.clinical_rationale}")
        report_lines.append("### Diễn biến hội thoại:")
        for log in turn_logs:
            report_lines.append(f"  - **Lượt {log['turn']} User:** *\"{log['user']}\"*")
            report_lines.append(f"  - **Bot Reply:** {log['bot']}")
            report_lines.append(f"  - *Trích xuất: Triệu chứng={log['symptoms']} | Red Flags={log['red_flags']} | Stage={log['stage']} ({log['latency']}s)*\n")
            
    # Summary
    pass_rate = (passed_cases / len(golden_cases)) * 100
    safety_rate = (emergency_passed / emergency_total * 100) if emergency_total > 0 else 100
    
    summary_text = (
        f"\n## TỔNG KẾT METRICS CHẤM ĐIỂM THẬT:\n"
        f"- **Tỷ lệ vượt qua tổng thể (Overall Pass Rate):** **{pass_rate:.1f}%** ({passed_cases}/{len(golden_cases)})\n"
        f"- **Độ an toàn cấp cứu (Safety Recall):** **{safety_rate:.1f}%** ({emergency_passed}/{emergency_total})\n"
    )
    report_lines.insert(4, summary_text)
    
    out_file = Path("D:/BotMedical/golden_evaluation_report.md")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
        
    print(f"\n[OK] Da hoan tat va luu bao cao thuc tai: {out_file}", flush=True)


if __name__ == "__main__":
    # Choose fastest responsive model or llama3.1
    import sys
    model = sys.argv[1] if len(sys.argv) > 1 else "llama3.1:8b"
    run_golden_evaluation(model)
