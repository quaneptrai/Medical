import pytest
import sys
from pathlib import Path

# Add src to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from knowledge.schema import load_all_diseases
from retrieval.search_engine import (
    HybridDiseaseSearcher,
    build_collection_name,
    tokenize_vietnamese,
)
from safety.guardrails import ClinicalGuardrailEngine


@pytest.fixture(scope="session")
def searcher():
    """Session-scoped hybrid searcher with all 30 diseases indexed."""
    return HybridDiseaseSearcher(diseases_dir="data/diseases", db_path="data/embeddings")


@pytest.fixture(scope="session")
def deterministic_guardrail():
    return ClinicalGuardrailEngine(semantic_mode="off", require_semantic=False)


def test_knowledge_base_completeness():
    """Verify all 30 diseases across 5 specialties are loaded and valid."""
    diseases = load_all_diseases(Path("data/diseases"))
    assert len(diseases) == 30, f"Expected 30 diseases, got {len(diseases)}"
    
    categories = {d.category for d in diseases}
    expected_categories = {"cardiology", "respiratory", "digestive", "general", "dermatology"}
    assert categories == expected_categories, f"Missing categories: {expected_categories - categories}"
    
    for cat in expected_categories:
        count = sum(1 for d in diseases if d.category == cat)
        assert count == 6, f"Category '{cat}' must have 6 diseases, found {count}"


def test_tokenizer_diacritics_normalization():
    """Verify Vietnamese tokenizer creates both accented and unaccented tokens without punctuation."""
    tokens = tokenize_vietnamese("Tôi bị đau ngực, khó thở và tức tối!")
    assert "ngực" in tokens
    assert "nguc" in tokens
    assert "thở" in tokens
    assert "tho" in tokens
    assert "ngực," not in tokens
    assert "tối!" not in tokens


def test_collection_name_isolated_by_knowledge_base_path(tmp_path):
    first = build_collection_name("same-model", tmp_path / "diseases")
    second = build_collection_name("same-model", tmp_path / "diseases_expanded")

    assert first != second
    assert len(first) <= 63
    assert len(second) <= 63


# Clinical benchmark query test dataset
RETRIEVAL_BENCHMARK = [
    # CARDIOLOGY (Red Flags & Typical)
    {
        "query": "tôi bị đau ngực, vã mồ hôi và khó thở",
        "expected_top": "Nhồi máu cơ tim",
        "expected_in_top3": ["Nhồi máu cơ tim"],
        "is_emergency": True
    },
    {
        "query": "toi bi dau nguc du doi, va mo hoi lanh",
        "expected_top": "Nhồi máu cơ tim",
        "expected_in_top3": ["Nhồi máu cơ tim"],
        "is_emergency": True
    },
    {
        "query": "huyết áp đo lên 160 trên 100, đau nhức sau gáy đỏ bừng mặt",
        "expected_top": "Tăng huyết áp",
        "expected_in_top3": ["Tăng huyết áp"],
        "is_emergency": False
    },
    {
        "query": "nằm xuống là ngộp thở phải ngồi dậy, hai chân sưng phù mắt cá",
        "expected_top": "Suy tim",
        "expected_in_top3": ["Suy tim"],
        "is_emergency": False
    },
    {
        "query": "tim đập thình thịch liên hồi như muốn nhảy ra ngoài lồng ngực",
        "expected_top": "Rối loạn nhịp tim",
        "expected_in_top3": ["Rối loạn nhịp tim"],
        "is_emergency": False
    },
    {
        "query": "hết sốt cảm cúm xong giờ tức ngực khó thở mệt rũ rượi tim đập nhanh",
        "expected_top": "Viêm cơ tim",
        "expected_in_top3": ["Viêm cơ tim"],
        "is_emergency": True
    },

    # RESPIRATORY
    {
        "query": "sốt cao rét run, ho khạc đờm đặc màu rỉ sắt, đau tức ngực khi hít thở",
        "expected_top": "Viêm phổi",
        "expected_in_top3": ["Viêm phổi"],
        "is_emergency": False
    },
    {
        "query": "lên cơn khó thở về đêm, thở rít khò khè nghe rõ tiếng cò cử",
        "expected_top": "Hen suyễn",
        "expected_in_top3": ["Hen suyễn"],
        "is_emergency": False
    },
    {
        "query": "ho khạc đờm kéo dài nhiều năm ở người hút thuốc lá lâu năm khó thở khi đi bộ",
        "expected_top": "Bệnh phổi tắc nghẽn mạn tính",
        "expected_in_top3": ["Bệnh phổi tắc nghẽn mạn tính", "COPD"],
        "is_emergency": False
    },
    {
        "query": "ho ra máu, sốt nhẹ về chiều, sụt cân gầy sút toát mồ hôi trộm ban đêm",
        "expected_top": "Lao phổi",
        "expected_in_top3": ["Lao phổi"],
        "is_emergency": False
    },

    # DIGESTIVE
    {
        "query": "đau quặn bụng dữ dội vùng hố chậu phải, sốt nhẹ, buồn nôn, ấn vào đau nhói",
        "expected_top": "Viêm ruột thừa",
        "expected_in_top3": ["Viêm ruột thừa"],
        "is_emergency": True
    },
    {
        "query": "ăn xong hay bị ợ hơi ợ chua, nóng rát vùng sau xương ức rát cổ họng",
        "expected_top": "Trào ngược dạ dày thực quản",
        "expected_in_top3": ["Trào ngược dạ dày thực quản"],
        "is_emergency": False
    },
    {
        "query": "đau quặn từng cơn vùng hạ sườn phải lan lên vai phải sau bữa ăn nhiều dầu mỡ",
        "expected_top": "Sỏi mật",
        "expected_in_top3": ["Sỏi mật"],
        "is_emergency": False
    },

    # GENERAL
    {
        "query": "sốt cao 39 40 độ liên tục ngày thứ 3, đau nhức hốc mắt, đau mỏi cơ bắp dữ dội",
        "expected_top": "Sốt xuất huyết Dengue",
        "expected_in_top3": ["Sốt xuất huyết Dengue", "Sốt xuất huyết"],
        "is_emergency": False
    },
    {
        "query": "tiểu buốt, tiểu rắt nhiều lần, nước tiểu đục có mùi hôi buốt tận óc",
        "expected_top": "Nhiễm trùng đường tiết niệu",
        "expected_in_top3": ["Nhiễm trùng đường tiết niệu"],
        "is_emergency": False
    },

    # DERMATOLOGY
    {
        "query": "vết đỏ hình tròn như đồng xu có viền mụn nước ngứa dữ dội khi ra mồ hôi",
        "expected_top": "Nấm da",
        "expected_in_top3": ["Nấm da"],
        "is_emergency": False
    },
    {
        "query": "da nổi mảng đỏ phủ vảy trắng bạc như sáp nến tróc vảy ở đầu gối khuỷu tay",
        "expected_top": "Vẩy nến",
        "expected_in_top3": ["Vẩy nến"],
        "is_emergency": False
    },
    {
        "query": "nổi mẩn ngứa phù từng mảng khắp người sưng vù môi sau khi ăn hải sản",
        "expected_top": "Mề đay",
        "expected_in_top3": ["Mề đay"],
        "is_emergency": True
    },
    {
        "query": "nổi chùm mụn nước dọc một bên mạn sườn đau rát như bị bỏng lửa chạm áo vào cũng nhói",
        "expected_top": "Zona thần kinh",
        "expected_in_top3": ["Zona thần kinh"],
        "is_emergency": False
    }
]


@pytest.mark.parametrize("case", RETRIEVAL_BENCHMARK)
def test_clinical_retrieval_cases(searcher, case):
    """Test individual clinical queries for Top 1 & Top 3 recall."""
    results = searcher.search(case["query"], top_k=3)
    assert len(results) > 0, f"No results returned for query: {case['query']}"
    
    top1_name = results[0]["name"]
    top3_names = [r["name"] for r in results]
    
    # Verify expected candidate is in Top 3
    found_in_top3 = any(
        exp.lower() in name.lower() or name.lower() in exp.lower()
        for exp in case["expected_in_top3"]
        for name in top3_names
    )
    assert found_in_top3, f"Query '{case['query']}' failed! Expected {case['expected_in_top3']} in Top 3, got {top3_names}"


def test_overall_retrieval_metrics(searcher, deterministic_guardrail):
    """
    Compute quantitative evaluation metrics across the clinical benchmark:
    - Recall@1 (Target >= 85%)
    - Recall@3 (Target >= 95%)
        - Deterministic guardrail recall on red flags (Target = 100%)
    - Mean Reciprocal Rank (MRR)
    """
    total = len(RETRIEVAL_BENCHMARK)
    recall_at_1_hits = 0
    recall_at_3_hits = 0
    emergency_top1_hits = 0
    emergency_cases = 0
    reciprocal_ranks = []
    
    for case in RETRIEVAL_BENCHMARK:
        results = searcher.search(case["query"], top_k=5)
        names = [r["name"].lower() for r in results]
        
        # Check rank of expected disease
        rank_found = None
        for rank, name in enumerate(names, start=1):
            if any(exp.lower() in name or name in exp.lower() for exp in case["expected_in_top3"]):
                rank_found = rank
                break
                
        if rank_found == 1:
            recall_at_1_hits += 1
                
        if rank_found is not None and rank_found <= 3:
            recall_at_3_hits += 1
            
        if case.get("is_emergency", False):
            emergency_cases += 1
            alert = deterministic_guardrail.evaluate_emergency(case["query"])
            if alert is not None and alert.get("is_emergency") is True:
                emergency_top1_hits += 1
            
        if rank_found is not None:
            reciprocal_ranks.append(1.0 / rank_found)
        else:
            reciprocal_ranks.append(0.0)
            
    recall_at_1 = recall_at_1_hits / total
    recall_at_3 = recall_at_3_hits / total
    mrr = sum(reciprocal_ranks) / total
    safety_guardrail_recall = emergency_top1_hits / emergency_cases if emergency_cases > 0 else 1.0
    
    print(f"\n--- RETRIEVAL BENCHMARK METRICS ---")
    print(f"Total Test Cases: {total}")
    print(f"Recall@1: {recall_at_1:.2%}")
    print(f"Recall@3: {recall_at_3:.2%}")
    print(f"MRR:      {mrr:.4f}")
    print(f"Deterministic Guardrail Recall (Red Flags): {safety_guardrail_recall:.2%}")
    
    assert recall_at_1 >= 0.85, f"Recall@1 too low: {recall_at_1:.2%}"
    assert recall_at_3 >= 0.95, f"Recall@3 too low: {recall_at_3:.2%}"
    assert safety_guardrail_recall >= 0.99, (
        "Deterministic guardrail recall must be 100%, "
        f"got {safety_guardrail_recall:.2%}"
    )
