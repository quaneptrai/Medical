import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import time

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from conversation.state import ConversationState
from llm.triage_bot import TriageBot

def run_evaluation():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    bot = TriageBot(api_key=api_key)
    
    test_cases = [
        {
            "id": "TC01",
            "name": "Sốt xuất huyết (Dengue)",
            "query": "Tôi bị sốt cao 39 độ liên tục 2 ngày nay, kèm đau nhức hốc mắt và đau mỏi cơ khớp kinh khủng. Không ho không sổ mũi.",
            "expected_top_disease": "Sốt xuất huyết",
            "expected_red_flag": False
        },
        {
            "id": "TC02",
            "name": "Nhồi máu cơ tim (Emergency)",
            "query": "Tôi bị đau ngực trái dữ dội, vã mồ hôi lạnh và cảm giác nghẹt thở. Nghỉ ngơi không đỡ.",
            "expected_top_disease": "Nhồi máu cơ tim",
            "expected_red_flag": True
        },
        {
            "id": "TC03",
            "name": "Trào ngược dạ dày (GERD)",
            "query": "Ăn xong hay bị ợ hơi ợ chua, thi thoảng rát cổ họng lúc sáng ngủ dậy.",
            "expected_top_disease": "Trào ngược dạ dày",
            "expected_red_flag": False
        }
    ]
    
    report = []
    report.append("# BÁO CÁO ĐÁNH GIÁ (EVALUATION REPORT) - RAG V0\n")
    
    success_count = 0
    
    for tc in test_cases:
        print(f"Đang test case: {tc['name']}...")
        state = ConversationState(session_id=tc["id"])
        
        start_time = time.time()
        bot_reply, updated_state = bot.process_turn(tc["query"], state)
        latency = time.time() - start_time
        
        # Đánh giá tiêu chí
        candidate_names = [c.lower() for c in updated_state.candidate_diseases]
        expected = tc["expected_top_disease"].lower()
        # Khớp theo substring hai chiều: tên trong KB có thể dài hơn tên mong đợi
        # (vd: "Sốt xuất huyết" vs "Sốt xuất huyết Dengue"). Nhất quán với tests/test_retrieval.py.
        top_k_match = any(expected in c or c in expected for c in candidate_names)
        red_flag_match = (updated_state.diagnostic_stage == "emergency") == tc["expected_red_flag"]
        
        if top_k_match and red_flag_match:
            success_count += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            
        report.append(f"## {tc['id']}: {tc['name']} - {status}")
        report.append(f"**Query:** \"{tc['query']}\"")
        report.append(f"- **Triệu chứng trích xuất được:** {updated_state.get_symptoms_summary()}")
        report.append(f"- **Bệnh dự đoán (Top 3 Vector Search):** {', '.join(updated_state.candidate_diseases)}")
        report.append(f"- **Cảnh báo khẩn cấp (Red Flag):** {updated_state.red_flags_detected}")
        report.append(f"- **Bot phản hồi:** {bot_reply}")
        report.append(f"- *Thời gian xử lý: {latency:.2f}s*\n")
        
    report.insert(1, f"**Tỉ lệ vượt qua:** {success_count}/{len(test_cases)}\n")
    
    # Ghi ra file
    out_path = Path("D:/BotMedical/evaluation_report_v0.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report))
        
    print(f"Hoàn thành! Đã lưu báo cáo tại {out_path}")

if __name__ == "__main__":
    run_evaluation()
