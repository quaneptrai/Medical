import json
import torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer, util
import pandas as pd
import os
from tqdm import tqdm
from src.knowledge.kb import MedicalKnowledgeBase

def extract_real_benchmark(threshold=0.5, top_k=200):
    print("1. Loading Knowledge Base (30 diseases)...")
    kb = MedicalKnowledgeBase(kb_path="data/knowledge_base")
    diseases = kb.get_all_diseases()
    
    disease_ids = [d.disease_id for d in diseases]
    disease_descriptions = [f"{d.name} {d.description} {' '.join(d.symptoms)}" for d in diseases]

    print("\n2. Loading BGE-M3 Model on GPU...")
    model = SentenceTransformer(
        "BAAI/bge-m3",
        device="cuda" if torch.cuda.is_available() else "cpu",
    )
    
    print("   Embedding 30 disease profiles...")
    disease_embeddings = model.encode(disease_descriptions, convert_to_tensor=True, normalize_embeddings=True)

    print("\n3. Loading 9,335 real patient queries...")
    dataset = load_dataset("hungnm/vietnamese-medical-qa", split="train")
    queries = [row["question"].strip() for row in dataset if row.get("question")]

    print("   Embedding patient queries (this may take a minute)...")
    # Batch encode for speed on GPU
    query_embeddings = model.encode(queries, batch_size=64, convert_to_tensor=True, normalize_embeddings=True, show_progress_bar=True)

    print("\n4. Calculating similarities and filtering...")
    # Compute Cosine Similarity between all queries and all diseases
    cosine_scores = util.cos_sim(query_embeddings, disease_embeddings)
    
    results = []
    for i in tqdm(range(len(queries)), desc="Matching queries"):
        # Get the highest matching disease for this query
        best_match_idx = torch.argmax(cosine_scores[i]).item()
        best_score = cosine_scores[i][best_match_idx].item()
        
        if best_score >= threshold:
            results.append({
                "patient_query": queries[i],
                "predicted_disease_id": disease_ids[best_match_idx],
                "confidence_score": best_score,
                "label": "" # Trống để User gán nhãn thủ công
            })

    # Sort by confidence score descending
    results = sorted(results, key=lambda x: x["confidence_score"], reverse=True)
    
    # Take top K to avoid overwhelming manual review
    if len(results) > top_k:
        results = results[:top_k]

    print(f"\n5. Found {len(results)} highly relevant queries for our 30 diseases.")
    
    out_dir = "data/test_cases"
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "candidate_real_benchmark.csv")
    
    df = pd.DataFrame(results)
    df.to_csv(csv_path, index=False, encoding="utf-8")
    print(f"[SUCCESS] Saved to {csv_path}. Please review, fill 'label' column, and delete false positives!")

if __name__ == "__main__":
    extract_real_benchmark(threshold=0.45, top_k=200)
