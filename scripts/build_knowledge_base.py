import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

# Thêm src vào path để import schema
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from knowledge.schema import DiseaseSchema

load_dotenv()

PROMPT_TEMPLATE = """
Bạn là một chuyên gia y tế tại Việt Nam.
Nhiệm vụ của bạn là tạo ra một bản tóm tắt kiến thức (Disease Schema) cho bệnh: '{disease_name}'.
Bản tóm tắt này sẽ được dùng làm Knowledge Base cho một chatbot y tế triage (phân loại bệnh nhân).

YÊU CẦU QUAN TRỌNG:
1. Thông tin phải cực kỳ chính xác về mặt y khoa.
2. Mục 'user_language_variants' phải chứa 10-15 câu miêu tả thực tế mà bệnh nhân Việt Nam hay dùng (có thể bao gồm từ lóng, viết tắt, cách nói dân dã). Ví dụ: "đau bụng vl", "sốt đùng đùng", v.v.
3. Mục 'questions_to_ask' phải là các câu hỏi giúp phân biệt bệnh này với các bệnh tương tự.
4. Trả về đúng định dạng JSON tuân thủ chặt chẽ cấu trúc được yêu cầu.

Danh mục (category) của bệnh này thuộc về: {category}
"""

def generate_disease_data(disease_name: str, category: str, api_key: str):
    print(f"Dang sinh du lieu cho benh: {disease_name}...")
    
    client = genai.Client(api_key=api_key)
    
    full_prompt = PROMPT_TEMPLATE.format(disease_name=disease_name, category=category)
    full_prompt += "\n\nJSON SCHEMA YÊU CẦU BẮT BUỘC:\n" + json.dumps(DiseaseSchema.model_json_schema(), indent=2)
    
    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash', # Dùng flash cho nhanh và rẻ, dữ liệu có cấu trúc nên rất ổn
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        
        # Parse JSON and validate
        raw_json = response.text
        data = json.loads(raw_json)
        
        # Pydantic validation
        validated_disease = DiseaseSchema(**data)
        return validated_disease
        
    except Exception as e:
        print(f"Loi khi goi API hoac parse du lieu: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Generate Disease Schema JSON using LLM")
    parser.add_argument("disease_name", help="Tên bệnh (VD: 'Viêm dạ dày')")
    parser.add_argument("category", choices=["respiratory", "digestive", "general", "dermatology", "cardiology"], help="Chuyên khoa")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Lỗi: Không tìm thấy GEMINI_API_KEY trong file .env")
        print("Vui lòng thêm GEMINI_API_KEY=your_key_here vào file .env ở thư mục gốc.")
        sys.exit(1)

    disease = generate_disease_data(args.disease_name, args.category, api_key)
    
    if disease:
        output_dir = Path(f"data/diseases/{args.category}")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Tạo tên file an toàn từ tên bệnh
        import unicodedata
        import re
        safe_name = unicodedata.normalize('NFKD', args.disease_name).encode('ASCII', 'ignore').decode('utf-8')
        safe_name = re.sub(r'[^\w\s-]', '', safe_name).strip().lower()
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        
        output_file = output_dir / f"{safe_name}.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(disease.model_dump(), f, ensure_ascii=False, indent=2)
            
        print(f"✅ Đã lưu thành công tại: {output_file}")
        print(f"⚠️ Nhớ MỞ FILE RA ĐỌC LẠI (Human Review) để đảm bảo không có ảo giác (hallucination) y khoa!")

if __name__ == "__main__":
    main()
