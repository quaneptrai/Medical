import json
import pytest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_frontend_project_structure():
    """Verify all required routes and components from Brief 09 exist."""
    clinic_dir = ROOT / "frontend" / "clinic"
    assert clinic_dir.exists()
    assert (clinic_dir / "app" / "page.tsx").exists()
    assert (clinic_dir / "app" / "tro-ly" / "page.tsx").exists()
    assert (clinic_dir / "app" / "chuyen-khoa" / "page.tsx").exists()
    assert (clinic_dir / "app" / "bac-si" / "page.tsx").exists()
    assert (clinic_dir / "app" / "dat-lich" / "page.tsx").exists()
    assert (clinic_dir / "app" / "lien-he" / "page.tsx").exists()
    
    # Auth routes
    assert (clinic_dir / "app" / "dang-nhap" / "page.tsx").exists()
    assert (clinic_dir / "app" / "dang-ky" / "page.tsx").exists()
    assert (clinic_dir / "app" / "xac-minh-email" / "page.tsx").exists()
    assert (clinic_dir / "app" / "quen-mat-khau" / "page.tsx").exists()
    assert (clinic_dir / "app" / "dat-lai-mat-khau" / "page.tsx").exists()
    assert (clinic_dir / "app" / "tai-khoan" / "page.tsx").exists()

    # Core components
    assert (clinic_dir / "components" / "triage" / "EmergencyBanner.tsx").exists()
    assert (clinic_dir / "components" / "triage" / "TriageDesk.tsx").exists()
    assert (clinic_dir / "components" / "triage" / "ClinicalMap.tsx").exists()
    assert (clinic_dir / "components" / "triage" / "DiseaseCandidate.tsx").exists()
    assert (clinic_dir / "components" / "triage" / "MedicalDisclaimer.tsx").exists()
    
    # Audit documents
    assert (ROOT / "design" / "CURRENT_UI_AUDIT.md").exists()
    assert (ROOT / "design" / "ANTI_TEMPLATE_REVIEW.md").exists()
    assert (ROOT / "design" / "FIGMA_AUDIT.md").exists()


def test_no_forbidden_diagnostic_phrases_in_frontend():
    """Verify strict prohibition of fake diagnostic claims in user-facing texts."""
    forbidden_terms = [
        "chẩn đoán bệnh chính xác 100%",
        "bác sĩ kết luận bạn bị",
        "chắc chắn bạn bị",
        "cam kết chữa khỏi 100%",
    ]
    clinic_app_dir = ROOT / "frontend" / "clinic" / "app"
    for file_path in clinic_app_dir.rglob("*.tsx"):
        content = file_path.read_text(encoding="utf-8").lower()
        for term in forbidden_terms:
            assert term not in content, f"Found forbidden diagnostic claim '{term}' in {file_path}"


def test_emergency_banner_accessibility_and_contrast():
    """Verify EmergencyBanner uses #971E26 (AAA contrast) and assertive aria-live."""
    banner_file = ROOT / "frontend" / "clinic" / "components" / "triage" / "EmergencyBanner.tsx"
    content = banner_file.read_text(encoding="utf-8")
    assert 'aria-live="assertive"' in content
    assert 'role="alert"' in content
    assert '#971E26' in content or 'bg-[#971E26]' in content
    assert 'tel:115' in content
    assert 'min-h-[56px]' in content


def test_anti_template_clean_tokens():
    """Verify absence of AI template clichés (radial glow, blue-purple gradient text)."""
    hero_file = ROOT / "frontend" / "clinic" / "components" / "clinic" / "HeroSection.tsx"
    content = hero_file.read_text(encoding="utf-8")
    assert "bg-gradient-to-r from-blue" not in content
    assert "bg-indigo-950" not in content
    assert "BotMedical Engine" not in content
