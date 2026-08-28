import sys
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from retrieval.search_engine import HybridDiseaseSearcher
from tests.test_retrieval import RETRIEVAL_BENCHMARK

def diagnose_emergency_failures():
    print("1. Khởi tạo BGE-M3 gốc (Vector-only) trên Local...")
    searcher = HybridDiseaseSearcher(diseases_dir=ROOT / "data/diseases", db_path=ROOT / "data/embeddings")
    
    print("\n2. Quét tìm ca Cấp cứu (Emergency) bị trượt khỏi Top 3...")
    emergencies = [case for case in RETRIEVAL_BENCHMARK if case.get("is_emergency", False)]
    failed_cases = []
    
    for case in emergencies:
        results = searcher.search(case["query"], top_k=5, bm25_weight=0.0)
        top_names = [r["name"] for r in results]
        
        # Kiểm tra xem ca đúng có lọt vào Top 3 không
        found_in_top3 = False
        for exp in case["expected_in_top3"]:
            for i, name in enumerate(top_names[:3]):
                if exp.lower() in name.lower() or name.lower() in exp.lower():
                    found_in_top3 = True
                    break
            if found_in_top3:
                break
                
        if not found_in_top3:
            failed_cases.append({
                "query": case["query"],
                "expected": case["expected_in_top3"],
                "top_5_predicted": [(r["name"], round(r["score"], 4)) for r in results]
            })
            
    print("\n================ [BÁO CÁO LỖI CẤP CỨU] ================")
    if not failed_cases:
        print("Tuyệt vời! Không có ca cấp cứu nào bị trượt (Kỳ lạ, vì test trước đó báo trượt 1 ca).")
    else:
        print(f"🚨 PHÁT HIỆN {len(failed_cases)} CA CẤP CỨU BỊ LỌT LƯỚI:")
        for idx, fc in enumerate(failed_cases, 1):
            print(f"\nCa #{idx}:")
            print(f"- Bệnh nhân kể: \"{fc['query']}\"")
            print(f"- Đáng lẽ phải ra: {fc['expected']}")
            print(f"- Nhưng BGE-M3 lại ưu tiên các bệnh sau:")
            for rank, (name, score) in enumerate(fc['top_5_predicted'], 1):
                print(f"   Top {rank}: {name} (Điểm: {score})")
                
if __name__ == "__main__":
    # Đảm bảo in tiếng Việt không lỗi trên Windows
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    diagnose_emergency_failures()
