"""Hash paid-run artifacts before they are copied off the GPU machine."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--output", default="artifacts/training/backup_manifest.json")
    args = parser.parse_args()
    records = []
    for value in args.paths:
        target = (ROOT / value).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError as exc:
            raise SystemExit(f"Backup target must stay inside the repository: {target}") from exc
        if not target.exists():
            raise SystemExit(f"Required backup target is missing: {target}")
        files = [target] if target.is_file() else sorted(path for path in target.rglob("*") if path.is_file())
        for path in files:
            records.append({
                "path": path.relative_to(ROOT).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": _sha256(path),
            })
    output = (ROOT / args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({
        "created_at": datetime.now(timezone.utc).isoformat(),
        "files": records,
        "instructions": "Copy every listed file plus this manifest to persistent storage and verify SHA-256 before terminating the GPU instance.",
    }, indent=2), encoding="utf-8")
    print(f"Backup manifest: {output} ({len(records)} files)")


if __name__ == "__main__":
    main()
