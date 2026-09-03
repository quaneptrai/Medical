"""Rebuild the expanded disease corpus reproducibly and without partial writes."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

from datasets import load_dataset
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from knowledge.schema import DiseaseSchema, load_all_diseases

DATASET_NAME = "PB3002/ViMedical_Disease"
DATASET_REVISION = "02dc52cbb6f2692aa1ebaee98a26b42cdd942d5e"
EXPECTED_TIER2_COUNT = 603
MANUAL_START_ID = 604


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _slug(name: str) -> str:
    # Keep the historical filename contract so a safe rebuild does not rename
    # hundreds of otherwise unchanged records.
    return unidecode(name).lower().replace(" ", "_").replace("/", "_")


def categorize_disease(name_vi: str) -> str:
    name = name_vi.casefold()
    groups = (
        ("respiratory", ["phổi", "phế quản", "hô hấp", "họng", "xoang", "mũi", "thanh quản", "amidan", "hen"]),
        ("digestive", ["dạ dày", "ruột", "gan", "mật", "tụy", "tiêu hóa", "đại tràng", "trĩ", "hậu môn", "thực quản"]),
        ("cardiology", ["tim", "mạch", "huyết áp", "động mạch", "tĩnh mạch", "đột quỵ"]),
        ("neurology", ["não", "thần kinh", "đầu", "migraine", "động kinh", "alzheimer", "parkinson"]),
        ("dermatology", ["da", "mẩn", "ngứa", "vảy nến", "chàm", "mụn"]),
        ("urology", ["thận", "bàng quang", "tiết niệu", "tiểu", "tuyến tiền liệt"]),
        ("oncology", ["ung thư", "u ", "bướu", "sarcoma", "carcinoma"]),
        ("musculoskeletal", ["xương", "khớp", "gân", "cột sống", "đốt sống", "thoát vị", "gối"]),
        ("ophthalmology", ["mắt", "thị", "giác mạc", "kết mạc"]),
        ("ent", ["tai", "màng nhĩ"]),
        ("obstetrics_gynecology", ["thai", "sinh", "tử cung", "buồng trứng", "âm đạo", "vú"]),
        ("andrology", ["tinh hoàn", "xuất tinh", "sinh lý"]),
        ("infectious", ["sốt", "nhiễm", "viêm", "virus", "vi khuẩn", "dịch"]),
    )
    for category, keywords in groups:
        if any(keyword in name for keyword in keywords):
            return category
    return "general"


def extract_symptoms(questions: list[str]) -> list[str]:
    symptoms: set[str] = set()
    for question in questions:
        cleaned = re.sub(
            r"[\.\?]?\s*Tôi có thể đang bị bệnh gì.*$", "", question, flags=re.IGNORECASE
        ).strip()
        match = re.search(r"(?:như|cảm thấy|bị|thấy|xuất hiện)\s+(.+)", cleaned, re.IGNORECASE)
        if match:
            parts = re.split(r"[,;]|\bvà\b|\bkèm theo\b|\bcũng như\b", match.group(1))
            for part in parts:
                value = part.strip().strip(".")
                if len(value) >= 3 and not value.casefold().startswith("tôi có thể"):
                    symptoms.add(value)
        else:
            value = re.sub(r"^(Tôi|Hiện tại tôi|Dạo này tôi)\s+(đang\s+)?", "", cleaned).strip()
            if len(value) >= 4:
                symptoms.add(value)
    result = sorted(symptoms)
    return result if len(result) >= 2 else ["Biểu hiện bất thường nghi ngờ liên quan"]


def _write_json(path: Path, payload: object) -> None:
    # Match the original corpus byte format (no trailing newline). This keeps
    # reviews focused on real content changes instead of serialization churn.
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_manual_entries(path: Path, existing_terms: set[str]) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not payload:
        raise ValueError(f"{path} must contain a non-empty JSON array")
    result = []
    seen_terms = set(existing_terms)
    for offset, item in enumerate(payload):
        if not isinstance(item, dict):
            raise ValueError(f"Manual entry {offset} is not an object")
        disease_id = f"EXP_{MANUAL_START_ID + offset:03d}"
        disease_obj = {
            **item,
            "disease_id": disease_id,
            "tier": 1,
            "provenance": {
                "source_document": "Curated common primary-care conditions (non-clinician-authored)",
                "issuing_body": "BotMedical KB curation",
                "year": 2026,
                "evidence_level": "Kiến thức y khoa phổ thông, cần bác sĩ rà soát",
                "reviewed_by": None,
                "review_date": None,
            },
        }
        disease = DiseaseSchema.model_validate(disease_obj)
        own_terms = [disease.name_vi, *disease.aliases]
        normalized = {" ".join(term.casefold().split()) for term in own_terms if term.strip()}
        collisions = sorted(normalized & seen_terms)
        if collisions:
            raise ValueError(f"Manual disease {disease_id} collides with existing terms: {collisions}")
        # The canonical name may intentionally also appear in aliases.
        aliases = [" ".join(term.casefold().split()) for term in disease.aliases]
        if len(aliases) != len(set(aliases)):
            raise ValueError(f"Manual disease {disease_id} contains duplicate aliases")
        seen_terms.update(normalized)
        result.append(disease.model_dump(mode="json"))
    return result


def build_corpus(staging_dir: Path, dataset_revision: str) -> tuple[int, int, dict]:
    print(f"Loading {DATASET_NAME}@{dataset_revision}...")
    dataset = load_dataset(DATASET_NAME, revision=dataset_revision, split="train")
    disease_groups: dict[str, list[str]] = {}
    for row in dataset:
        name = row["Disease"].strip()
        question = row["Question"].strip()
        if name and question:
            disease_groups.setdefault(name, []).append(question)
    if len(disease_groups) != EXPECTED_TIER2_COUNT:
        raise RuntimeError(
            f"Pinned dataset produced {len(disease_groups)} diseases; expected {EXPECTED_TIER2_COUNT}. "
            "Review migration instead of shifting stable EXP IDs."
        )

    enrichment_path = ROOT / "data" / "tier2_enrichments_manual.json"
    enrichments = (
        json.loads(enrichment_path.read_text(encoding="utf-8"))
        if enrichment_path.exists()
        else {}
    )
    if not isinstance(enrichments, dict):
        raise ValueError(f"{enrichment_path} must contain an object keyed by stable disease_id")
    unknown_enrichment_ids = set(enrichments) - {
        f"EXP_{index:03d}" for index in range(1, EXPECTED_TIER2_COUNT + 1)
    }
    if unknown_enrichment_ids:
        raise ValueError(f"Unknown Tier-2 enrichment IDs: {sorted(unknown_enrichment_ids)}")

    staging_dir.mkdir(parents=True, exist_ok=False)
    benchmark_cases = []
    existing_terms: set[str] = set()
    for index, (name_vi, questions) in enumerate(disease_groups.items(), 1):
        disease_id = f"EXP_{index:03d}"
        category = categorize_disease(name_vi)
        kb_variants, test_questions = questions[:15], questions[15:]
        symptoms = extract_symptoms(kb_variants)
        disease_obj = {
            "disease_id": disease_id,
            "name_vi": name_vi,
            "name_en": unidecode(name_vi),
            "category": category,
            "aliases": [name_vi, unidecode(name_vi)],
            "tier": 2,
            "description": f"{name_vi} (Chuyên khoa: {category})",
            "urgency": "unknown",
            "symptoms": {
                "common": [
                    {"name_vi": symptom, "name_en": unidecode(symptom), "frequency": "common"}
                    for symptom in symptoms
                ],
                "occasional": [],
            },
            "risk_factors": [],
            "questions_to_ask": [],
            "differential_diagnoses": [],
            "red_flags": [],
            "when_to_seek_emergency": [],
            "user_language_variants": kb_variants,
            "provenance": {
                "source_document": "ViMedical_Disease Dataset",
                "issuing_body": "PB3002 / Kalapa Bytebattles / Kaggle 2023",
                "year": 2023,
                "evidence_level": "Thực nghiệm NLP y khoa",
                "reviewed_by": None,
                "review_date": None,
            },
        }
        enrichment = enrichments.get(disease_id, {})
        allowed_enrichment_fields = {"aliases", "user_language_variants"}
        unexpected_fields = set(enrichment) - allowed_enrichment_fields
        if unexpected_fields:
            raise ValueError(
                f"{disease_id}: unsupported enrichment fields {sorted(unexpected_fields)}"
            )
        for field in allowed_enrichment_fields:
            additions = enrichment.get(field, [])
            if not isinstance(additions, list) or not all(
                isinstance(value, str) and value.strip() for value in additions
            ):
                raise ValueError(f"{disease_id}.{field} enrichment must be non-empty strings")
            if additions:
                disease_obj[field] = list(dict.fromkeys([*disease_obj[field], *additions]))
        disease = DiseaseSchema.model_validate(disease_obj)
        existing_terms.update(" ".join(term.casefold().split()) for term in disease.aliases)
        existing_terms.add(" ".join(disease.name_vi.casefold().split()))
        # Validate with the schema, but retain the historical field ordering and
        # intentional alias representation in the serialized Tier-2 record.
        _write_json(staging_dir / f"{disease_id}_{_slug(name_vi)}.json", disease_obj)
        benchmark_cases.extend(
            {
                "disease_id": disease_id,
                "expected_disease": name_vi,
                "category": category,
                "query": question,
            }
            for question in test_questions
        )

    manual_path = ROOT / "data" / "common_diseases_manual.json"
    manual_entries = _load_manual_entries(manual_path, existing_terms)
    for item in manual_entries:
        _write_json(staging_dir / f"{item['disease_id']}_{_slug(item['name_vi'])}.json", item)

    diseases = load_all_diseases(staging_dir)
    expected_total = EXPECTED_TIER2_COUNT + len(manual_entries)
    if len(diseases) != expected_total:
        raise RuntimeError(f"Staging loaded {len(diseases)} diseases; expected {expected_total}")
    benchmark = {"total_cases": len(benchmark_cases), "cases": benchmark_cases}
    return len(disease_groups), len(manual_entries), benchmark


def _verify_reserved_benchmark(generated: dict, reserved_path: Path) -> None:
    if not reserved_path.exists():
        raise RuntimeError(f"Reserved benchmark is missing: {reserved_path}")
    current = json.loads(reserved_path.read_text(encoding="utf-8"))
    if current != generated:
        raise RuntimeError(
            "Pinned rebuild would change benchmark_603_diseases.json. Reserved data was not touched; "
            "review the source revision before proceeding."
        )
    print(f"Reserved benchmark unchanged: {reserved_path} ({_sha256(reserved_path)})")


def _compare_corpora(staging: Path, production: Path) -> None:
    def fingerprints(directory: Path) -> dict[str, str]:
        result = {}
        for path in directory.glob("*.json"):
            payload = json.loads(path.read_text(encoding="utf-8"))
            disease_id = payload["disease_id"]
            canonical = json.dumps(
                payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
            ).encode("utf-8")
            result[disease_id] = hashlib.sha256(canonical).hexdigest()
        return result

    staged = fingerprints(staging)
    current = fingerprints(production)
    if staged != current:
        missing = sorted(staged.keys() - current.keys())[:10]
        extra = sorted(current.keys() - staged.keys())[:10]
        changed = sorted(
            name for name in staged.keys() & current.keys() if staged[name] != current[name]
        )[:10]
        raise RuntimeError(
            f"Rebuild differs from current corpus; missing={missing}, extra={extra}, changed={changed}. "
            "Inspect before replacing production."
        )
    print(f"Semantic corpus verification passed for {len(staged)} disease records.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-revision", default=DATASET_REVISION)
    parser.add_argument("--replace-production", action="store_true")
    parser.add_argument(
        "--allow-reviewed-change",
        action="store_true",
        help="Permit a staged corpus differing from production after human review",
    )
    args = parser.parse_args()
    if len(args.dataset_revision) != 40 or any(
        character not in "0123456789abcdef" for character in args.dataset_revision.casefold()
    ):
        parser.error("--dataset-revision must be a full 40-character commit SHA")

    production = ROOT / "data" / "diseases_expanded"
    staging = Path(tempfile.mkdtemp(prefix="diseases_expanded.staging-", dir=ROOT / "data"))
    staging.rmdir()  # build_corpus requires a fresh directory.
    backup_base = production.with_name("diseases_expanded.backup-before-rebuild")
    backup = backup_base
    suffix = 2
    while backup.exists():
        backup = production.with_name(f"{backup_base.name}-{suffix}")
        suffix += 1
    try:
        tier2_count, manual_count, benchmark = build_corpus(staging, args.dataset_revision)
        _verify_reserved_benchmark(
            benchmark, ROOT / "data" / "test_cases" / "benchmark_603_diseases.json"
        )
        differs = False
        try:
            _compare_corpora(staging, production)
        except RuntimeError:
            differs = True
            if not args.allow_reviewed_change:
                raise
        if args.replace_production:
            production.rename(backup)
            try:
                staging.rename(production)
            except Exception:
                backup.rename(production)
                raise
            print(
                f"Production corpus replaced atomically (reviewed_change={differs}). "
                f"Recoverable backup retained at {backup}."
            )
        print(
            f"Rebuild verified: {tier2_count} pinned Tier 2 + {manual_count} stable Tier 1 = "
            f"{tier2_count + manual_count} diseases."
        )
    finally:
        if staging.exists():
            shutil.rmtree(staging)


if __name__ == "__main__":
    main()
