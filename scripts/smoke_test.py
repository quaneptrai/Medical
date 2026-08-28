import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, "src")
from retrieval.search_engine import HybridDiseaseSearcher

searcher = HybridDiseaseSearcher()

queries = [
    "tôi bị đau ngực, vã mồ hôi và khó thở",
    "toi bi dau nguc du doi, va mo hoi lanh",
    "ho nhieu ngay, sot cao, khac dom xanh",
    "an xong bi op hoi op chua, rat co hong",
    "dau bung du doi vung ho chau ben phai, sot buon non",
    "vết đỏ hình tròn như đồng xu có viền mụn nước ngứa dữ dội khi ra mồ hôi",
    "da nổi mảng đỏ phủ vảy trắng bạc như sáp nến tróc vảy ở đầu gối khuỷu tay",
    "sốt cao 39 40 độ liên tục ngày thứ 3, đau nhức hốc mắt, đau mỏi cơ bắp dữ dội",
    "nổi mẩn ngứa phù từng mảng khắp người sưng vù môi sau khi ăn hải sản"
]

print("\n" + "="*70)
print("  SMOKE TEST RETRIEVAL (30 DISEASES ACROSS 5 SPECIALTIES)")
print("="*70 + "\n")

for q in queries:
    print(f"🔍 Query: \"{q}\"")
    results = searcher.search(q, top_k=3)
    for i, r in enumerate(results):
        print(f"   {i+1}. {r['name']:35s} | Chuyên khoa: {r['category']:12s} | Score: {r['score']:.4f} | Urgency: {r['urgency']}")
    print()
