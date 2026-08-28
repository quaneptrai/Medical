import json
import random
import os
import re
from pathlib import Path
from datasets import load_dataset
import pandas as pd
from rank_bm25 import BM25Okapi

# Sửa lỗi Import: Load trực tiếp từ schema
from src.knowledge.schema import load_all_diseases

def tokenize_vi(text):
    """Tokenize tiếng Việt cơ bản: xóa dấu câu, chuyển chữ thường, cắt theo khoảng trắng"""
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return text.split()

def generate_stratified_bm25_benchmark(target_per_disease=15):
    print("1. Load 30 Disease Profiles...")
    diseases = load_all_diseases(Path("data/diseases"))
    
    disease_docs = []
    disease_map = {}
    
    for d in diseases:
        # Bóc tách chính xác dict symptoms để không bị lỗi 'common occasional rare'
        symptom_texts = []
        for sym_list in d.symptoms.values():
            for sym in sym_list:
                symptom_texts.append(sym.name_vi)
        
        # Gom các từ khóa đặc trưng: Tên, Alias, Cách gọi dân dã, Triệu chứng
        doc_text = " ".join([
            d.name_vi,
            " ".join(d.aliases),
            " ".join(d.user_language_variants),
            " ".join(symptom_texts)
        ])
        
        disease_docs.append(tokenize_vi(doc_text))
        disease_map[d.disease_id] = d.name_vi

    print("\n2. Khởi tạo BM25 (Lexical Search) - Tránh Echo Chamber của BGE-M3...")
    # Khởi tạo BM25 với tập corpus là các Disease
    bm25 = BM25Okapi(disease_docs)

    print("\n3. Tải 9,335 câu hỏi từ hungnm/vietnamese-medical-qa...")
    dataset = load_dataset("hungnm/vietnamese-medical-qa", split="train")
    queries = [row["question"].strip() for row in dataset if row.get("question")]

    print("   Đang chấm điểm BM25 cho toàn bộ câu hỏi...")
    # Cấu trúc lưu trữ: {disease_id: [(query, score), ...]}
    disease_scores = {d.disease_id: [] for d in diseases}
    
    for query in queries:
        tokenized_q = tokenize_vi(query)
        # Bỏ qua câu quá ngắn (không đủ dữ kiện y khoa)
        if len(tokenized_q) < 5:
            continue
            
        scores = bm25.get_scores(tokenized_q)
        # Gán câu hỏi này cho bệnh có BM25 Score cao nhất
        best_match_idx = scores.argmax()
        best_score = scores[best_match_idx]
        
        if best_score > 0: # Có ít nhất 1 từ khóa trùng khớp
            matched_disease_id = diseases[best_match_idx].disease_id
            disease_scores[matched_disease_id].append((query, best_score))

    print("\n4. Trích xuất mẫu phân tầng (Cao - Trung bình - Thấp) cho TỪNG BỆNH...")
    final_candidates = []
    
    for d in diseases:
        d_id = d.disease_id
        matches = sorted(disease_scores[d_id], key=lambda x: x[1], reverse=True)
        
        if not matches:
            continue
            
        # Chia đều hạn ngạch (ví dụ 15 ca/bệnh -> 5 Dễ, 5 Vừa, 5 Khó)
        quota_per_band = target_per_disease // 3
        
        # Band 1: Dễ (Top scores)
        top_matches = matches[:quota_per_band]
        
        # Band 2: Trung bình (Ở giữa danh sách)
        mid_start = max(len(matches) // 2 - (quota_per_band // 2), quota_per_band)
        mid_matches = matches[mid_start : mid_start + quota_per_band]
        
        # Band 3: Khó (Low scores - nhưng vẫn > 0)
        bot_start = max(len(matches) - quota_per_band, mid_start + quota_per_band)
        bot_matches = matches[bot_start : bot_start + quota_per_band]
        
        # Hợp nhất và gán nhãn độ khó
        for q, score in top_matches:
            final_candidates.append({"query": q, "predicted_disease": d.name_vi, "bm25_score": score, "difficulty": "Dễ", "actual_label": ""})
        for q, score in mid_matches:
            final_candidates.append({"query": q, "predicted_disease": d.name_vi, "bm25_score": score, "difficulty": "Vừa", "actual_label": ""})
        for q, score in bot_matches:
            final_candidates.append({"query": q, "predicted_disease": d.name_vi, "bm25_score": score, "difficulty": "Khó", "actual_label": ""})

    # Đảo lộn danh sách để người gán nhãn không bị thiên kiến
    random.shuffle(final_candidates)

    out_dir = "data/test_cases"
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "real_benchmark_candidates.csv")
    
    df = pd.DataFrame(final_candidates)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    print(f"\n[THÀNH CÔNG] Đã trích xuất {len(final_candidates)} ca lâm sàng phân tầng.")
    print(f"File lưu tại: {csv_path}")

if __name__ == "__main__":
    generate_stratified_bm25_benchmark(target_per_disease=15)
