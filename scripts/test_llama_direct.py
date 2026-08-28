import sys
import io
import json
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from openai import OpenAI

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

system_prompt = """Bạn là bác sĩ phân loại (Triage AI). Hãy trích xuất triệu chứng và phân loại theo đúng JSON:
{
    "new_symptoms": [{"name": "tên triệu chứng", "duration": "thời gian", "severity": "mức độ"}],
    "new_red_flags": ["dấu hiệu cấp cứu nếu có"],
    "stage": "emergency",
    "bot_reply": "lời khuyên y tế bằng tiếng Việt"
}
"""

user_query = "Tôi bị đau ngực trái dữ dội lan ra tay trái, khó thở và vã mồ hôi 30 phút nay."

print("[*] Gui request den Ollama (llama3.1:8b)...", flush=True)
start = time.time()
resp = client.chat.completions.create(
    model="llama3.1:8b",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ],
    response_format={"type": "json_object"},
    temperature=0.1
)
latency = time.time() - start
print(f"[OK] Thoi gian phan hoi: {latency:.2f}s\n", flush=True)
print(resp.choices[0].message.content, flush=True)
