import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from conversation.state import ConversationState
from llm.triage_bot import TriageBot

def main():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Lỗi: Chưa cấu hình GEMINI_API_KEY trong .env")
        sys.exit(1)
        
    print("🔄 Khởi tạo Medical Triage Bot V0...")
    bot = TriageBot(api_key=api_key)
    state = ConversationState(session_id="test_session_001")
    
    print("="*60)
    print("🏥 CHÀO MỪNG ĐẾN VỚI TRỢ LÝ Y TẾ VẢO V0 🏥")
    print("Hệ thống hiện tại có kiến thức về: Viêm phổi, Nhồi máu cơ tim.")
    print("Hãy thử nhập triệu chứng của bạn (Gõ 'quit' hoặc 'exit' để thoát).")
    print("="*60)
    
    while True:
        user_input = input("\n🧑 Bạn: ")
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("Tạm biệt!")
            break
            
        if not user_input.strip():
            continue
            
        print("🤖 Bot đang suy nghĩ...")
        bot_reply, state = bot.process_turn(user_input, state)
        
        print(f"\n🤖 Bot: {bot_reply}")
        
        # Debug State
        print("\n--- [DEBUG STATE] ---")
        print(f"Symptoms: {state.get_symptoms_summary()}")
        print(f"Red Flags: {state.red_flags_detected}")
        print(f"Stage: {state.diagnostic_stage}")
        print(f"Candidates: {state.candidate_diseases}")
        print("---------------------\n")
        
        if state.diagnostic_stage in ["emergency", "concluded"]:
            print(f"⚠️ Phiên khám đã kết thúc với trạng thái: {state.diagnostic_stage.upper()}")
            break

if __name__ == "__main__":
    main()
