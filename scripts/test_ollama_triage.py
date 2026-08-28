import sys
import io
import json
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from openai import OpenAI

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

models_to_test = ["llama3.1:8b", "deepseek-r1:8b", "qwen2.5:1.5b"]

system_prompt = """Bạn là trợ lý Triage Y tế. Hãy phân tích triệu chứng của người dùng và trả về đúng định dạng JSON sau:
{
    "new_symptoms": [{"name": "tên triệu chứng", "duration": "thời gian", "severity": "mức độ"}],
    "new_red_flags": ["dấu hiệu cấp cứu nếu có"],
    "stage": "emergency",
    "bot_reply": "lời khuyên cho người bệnh"
}
"""

user_query = "Tôi bị đau ngực trái dữ dội lan ra tay trái, khó thở và vã mồ hôi 30 phút nay."

for model_name in models_to_test:
    print(f"\n--- TESTING MODEL: {model_name} ---")
    start = time.time()
    try:
        resp = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        latency = time.time() - start
        content = resp.choices[0].message.content
        print(f"Latency: {latency:.2f}s")
        print(f"Output:\n{content}")
    except Exception as e:
        print(f"Error with {model_name}: {e}")
