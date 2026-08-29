"""Validated runtime settings shared by retrieval, safety, and LLM layers."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SETTINGS_PATH = ROOT / "config" / "settings.yaml"
_MISSING = object()


class SettingsError(RuntimeError):
    """Raised when the runtime settings file is missing or malformed."""


@lru_cache(maxsize=4)
def load_settings(path: str | Path | None = None) -> dict[str, Any]:
    configured_path = Path(
        path or os.getenv("BOTMED_SETTINGS_PATH") or DEFAULT_SETTINGS_PATH
    )
    if not configured_path.is_absolute():
        configured_path = ROOT / configured_path
    if not configured_path.exists():
        raise SettingsError(f"Runtime settings file not found: {configured_path}")
    try:
        payload = yaml.safe_load(configured_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise SettingsError(f"Cannot load runtime settings: {configured_path}") from exc
    if not isinstance(payload, dict):
        raise SettingsError("Runtime settings root must be a mapping")
    return payload


def get_setting(dotted_key: str, default: Any = _MISSING) -> Any:
    value: Any = load_settings()
    for part in dotted_key.split("."):
        if not isinstance(value, dict) or part not in value:
            if default is not _MISSING:
                return default
            raise SettingsError(f"Missing required runtime setting: {dotted_key}")
        value = value[part]
    return value


def resolve_project_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path
