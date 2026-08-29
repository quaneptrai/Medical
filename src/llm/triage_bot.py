import json
import os
import re
from typing import Dict, Any, Tuple, Optional
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from conversation.state import ConversationState, SymptomExtracted
from retrieval.search_engine import HybridDiseaseSearcher
try:
    from src.runtime_config import get_setting
except ImportError:  # Script mode with ``src`` inserted into sys.path.
    from runtime_config import get_setting

PROMPT_TRIAGE_SYSTEM = """Bạn là trợ lý AI Phân loại Y tế (Triage Bot) chuyên nghiệp tại Việt Nam.

THÔNG TIN TRẠNG THÁI HIỆN TẠI:
- Các triệu chứng người bệnh đã có: {symptoms}
- Dấu hiệu nguy hiểm (Red Flags): {red_flags}
- Số lượt đã hỏi: {turn_count} / {max_turns}
- Kiến thức Y khoa liên quan (Database RAG):
{disease_context}

QUY TẮC AN TOÀN LÂM SÀNG CỐT TỬ (BẮT BUỘC TUÂN THỦ 100%):
1. NẾU BỆNH NHÂN CÓ BẤT KỲ DẤU HIỆU NÀO DƯỚI ĐÂY -> BẮT BUỘC ĐẶT "stage": "emergency":
   - Tim mạch: Đau tức ngực dữ dội, đau ngực lan vai/tay trái/hàm, vã mồ hôi lạnh, ngất xỉu.
   - Tiêu hóa ngoại khoa: Đau bụng cấp dữ dội/nhói tăng dần ở vùng bụng dưới bên phải (hố chậu phải), nôn ra máu, đi ngoài phân đen.
   - Hô hấp: Khó thở cấp dữ dội, thở rít, tím tái, không thể nằm thở được, ho ra máu lượng nhiều.
   - Dị ứng cấp: Sưng phù môi, lưỡi, họng kèm khó thở hoặc tụt huyết áp sau ăn đồ lạ/uống thuốc (nghi ngờ sốc phản vệ).
   - Thần kinh: Yếu liệt nửa người đột ngột, méo miệng, nói ngọng, lơ mơ.
   -> KHI PHÁT HIỆN CẤP CỨU: "bot_reply" PHẢI yêu cầu gọi ngay 115 hoặc đến phòng cấp cứu bệnh viện gần nhất NGAY LẬP TỨC. TUYỆT ĐỐI CẤM hỏi thêm câu hỏi thăm dò làm chậm trễ thời gian vàng.

2. NẾU KHÔNG CÓ DẤU HIỆU CẤP CỨU:
   - Nếu chưa đủ thông tin: Đặt "stage": "follow_up", "bot_reply" chỉ đặt tối đa 1-2 câu hỏi phân biệt ngắn gọn bám sát triệu chứng đang nghi ngờ.
   - Nếu đã đủ thông tin hoặc đạt lượt tối đa: Đặt "stage": "concluded", "bot_reply" đưa ra định hướng các bệnh có thể gặp (Differential Diagnosis), giải thích nhẹ nhàng và khuyên đi khám chuyên khoa. TUYỆT ĐỐI KHÔNG tự ý kê đơn thuốc hay kết luận khẳng định 100%.

FORMAT JSON BẮT BUỘC (chỉ trả về JSON thuần túy, không bọc markdown):
{{
    "new_symptoms": [
        {{"name": "tên triệu chứng", "duration": "thời gian", "severity": "mức độ", "modifiers": ["đặc điểm"]}}
    ],
    "new_red_flags": ["tên dấu hiệu cấp cứu nếu có"],
    "stage": "emergency" // hoặc "follow_up" hoặc "concluded",
    "bot_reply": "câu trả lời cho người bệnh",
    "reasoning": "suy luận lâm sàng ngắn gọn"
}}
"""


from safety.guardrails import ClinicalGuardrailEngine

class TriageBot:
    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        ollama_model: Optional[str] = None,
        ollama_base_url: Optional[str] = None,
    ):
        self.provider = provider or os.getenv("BOTMED_LLM_PROVIDER") or get_setting("llm.provider")
        self.ollama_model = ollama_model or os.getenv("BOTMED_OLLAMA_MODEL") or get_setting("llm.ollama_model")
        self.ollama_base_url = ollama_base_url or os.getenv("BOTMED_OLLAMA_BASE_URL") or get_setting("llm.ollama_base_url")
        self.gemini_model = os.getenv("BOTMED_GEMINI_MODEL") or get_setting("llm.gemini_model")
        self.llm_temperature = float(get_setting("llm.temperature"))
        self.llm_max_tokens = int(get_setting("llm.max_tokens"))
        self.retrieval_top_k = int(get_setting("retrieval.top_k"))
        self.max_turns = int(get_setting("conversation.max_turns"))
        self.gemini_api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        # Initialize Hybrid Search
        self.search_engine = HybridDiseaseSearcher()
        
        # Initialize Deterministic Safety Guardrails
        self.guardrail_engine = ClinicalGuardrailEngine()
        
        # OpenAI client for Ollama
        try:
            from openai import OpenAI
            self.openai_client = OpenAI(base_url=self.ollama_base_url, api_key="ollama")
        except Exception:
            self.openai_client = None

        # Gemini client
        self.gemini_client = None
        if self.gemini_api_key and not self.gemini_api_key.startswith("your_"):
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
            except Exception:
                self.gemini_client = None

    def _call_ollama(self, prompt: str, user_message: str) -> str:
        if not self.openai_client:
            raise RuntimeError("OpenAI client not available for Ollama connection")
            
        resp = self.openai_client.chat.completions.create(
            model=self.ollama_model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"},
            temperature=self.llm_temperature,
            max_tokens=self.llm_max_tokens,
        )
        return resp.choices[0].message.content

    def _call_gemini(self, prompt: str, user_message: str) -> str:
        if not self.gemini_client:
            raise RuntimeError("Gemini client not initialized")
            
        from google.genai import types
        response = self.gemini_client.models.generate_content(
            model=self.gemini_model,
            contents=[prompt, f"User: {user_message}"],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=self.llm_temperature,
                max_output_tokens=self.llm_max_tokens,
            )
        )
        return response.text

    def process_turn(self, user_message: str, state: ConversationState) -> Tuple[str, ConversationState]:
        state.turn_count += 1
        
        # 1. Check Deterministic Clinical Safety Guardrail
        current_sym_names = [s.name for s in state.symptoms]
        guardrail_eval = self.guardrail_engine.evaluate_emergency(user_message, current_sym_names)
        
        # 2. General queries retain tuned hybrid retrieval. A deterministic safety
        # hit uses dense-only retrieval so BM25 cannot suppress the emergency result.
        # Raw semantic similarity is intentionally not a router: calibration showed
        # that it fires on most routine cases and still needs a separate confirmer.
        search_query = f"{state.get_symptoms_summary()} {user_message}"
        retrieval_route = "emergency" if guardrail_eval else "general"
        retrieved_diseases = self.search_engine.search(
            search_query,
            top_k=getattr(self, "retrieval_top_k", 5),
            route=retrieval_route,
        )
        
        disease_context = ""
        candidate_ids = []
        for res in retrieved_diseases:
            d = res["schema"]
            candidate_ids.append(d.name_vi)
            sym_list = [s.name_vi for s in d.symptoms.get("common", [])]
            disease_context += f"- Bệnh: {d.name_vi} (Urgency: {d.urgency.value})\n"
            disease_context += f"  + Triệu chứng chính: {', '.join(sym_list)}\n"
            disease_context += f"  + Red flags: {', '.join(d.red_flags)}\n"
            disease_context += f"  + Câu hỏi gợi ý: {', '.join(d.questions_to_ask[:3])}\n\n"

        state.candidate_diseases = candidate_ids
        
        # 3. Build prompt
        prompt = PROMPT_TRIAGE_SYSTEM.format(
            symptoms=state.get_symptoms_summary(),
            red_flags=", ".join(state.red_flags_detected) if state.red_flags_detected else "Chưa có",
            turn_count=state.turn_count,
            max_turns=getattr(self, "max_turns", 6),
            disease_context=disease_context if disease_context else "Chưa có dữ liệu liên quan."
        )
        
        # 4. Call LLM with provider fallback
        raw_json_str = None
        
        if self.provider == "gemini" or (self.provider == "auto" and self.gemini_client):
            try:
                raw_json_str = self._call_gemini(prompt, user_message)
            except Exception as e:
                # Fallback to local Ollama on 429 or API error
                if self.openai_client:
                    raw_json_str = self._call_ollama(prompt, user_message)
                else:
                    return f"Lỗi gọi AI: {e}", state
        else:
            raw_json_str = self._call_ollama(prompt, user_message)
            
        # 5. Parse output and apply guardrail overrides
        try:
            # Clean possible markdown block
            cleaned = re.sub(r"^```json\s*", "", raw_json_str.strip())
            cleaned = re.sub(r"```$", "", cleaned.strip())
            
            # Handle deepseek reasoning <think> tag if present
            if "<think>" in cleaned and "</think>" in cleaned:
                cleaned = cleaned.split("</think>")[-1].strip()
                
            out_data = json.loads(cleaned)
            
            for s in out_data.get("new_symptoms", []):
                sym_obj = SymptomExtracted(**s)
                state.symptoms.append(sym_obj)
                
            for rf in out_data.get("new_red_flags", []):
                if rf not in state.red_flags_detected:
                    state.red_flags_detected.append(rf)
                    
            state.diagnostic_stage = out_data.get("stage", state.diagnostic_stage)
            bot_reply = out_data.get("bot_reply", "Xin vui lòng miêu tả thêm về tình trạng của bạn.")
            
            # Apply Safety Guardrail Override if triggered
            if guardrail_eval:
                state.diagnostic_stage = "emergency"
                if guardrail_eval["red_flag"] not in state.red_flags_detected:
                    state.red_flags_detected.append(guardrail_eval["red_flag"])
                # If LLM didn't flag emergency, enforce the emergency message
                if out_data.get("stage") != "emergency":
                    bot_reply = guardrail_eval["emergency_reply"]
                    
            return bot_reply, state
            
        except Exception as e:
            if guardrail_eval:
                state.diagnostic_stage = "emergency"
                return guardrail_eval["emergency_reply"], state
            return f"Không thể phân tích dữ liệu: {e}. Raw: {raw_json_str[:100]}", state
