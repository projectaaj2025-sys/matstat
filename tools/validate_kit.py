#!/usr/bin/env python3
"""Check that the 7z kit matches the current release inputs and optionally test it."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import py7zr

from build_kit import APP, APP_NAME, ARC_ROOT, ARCHIVE, DOCS, KIT_DIR

TEST_SCRIPT = Path(__file__).with_name("test-solution-gate.mjs")


def expected_files() -> dict[str, Path]:
    files = {f"{ARC_ROOT}/{name}": KIT_DIR / name for name in DOCS}
    files[f"{ARC_ROOT}/{APP_NAME}"] = APP
    return files


def validate(archive_path: Path, run_tests: bool) -> int:
    archive_path = archive_path.expanduser().resolve()
    if not archive_path.is_file():
        raise FileNotFoundError(f"Archive not found: {archive_path}")

    sources = expected_files()
    with tempfile.TemporaryDirectory(prefix="statpracticum-kit-check-") as temp_dir:
        extraction_dir = Path(temp_dir)
        with py7zr.SevenZipFile(archive_path, "r") as archive:
            actual = set(archive.getnames())
            expected = set(sources)
            missing = sorted(expected - actual)
            unexpected = sorted(actual - expected)
            if missing or unexpected:
                details = []
                if missing:
                    details.append("missing: " + ", ".join(missing))
                if unexpected:
                    details.append("unexpected: " + ", ".join(unexpected))
                raise ValueError("Archive entries do not match the kit: " + "; ".join(details))
            archive.extract(path=extraction_dir, targets=sorted(expected))

        extracted_app: Path | None = None
        for member, source in sources.items():
            extracted = extraction_dir / member
            if not extracted.is_file():
                raise ValueError(f"Archive member was not extracted: {member}")
            if extracted.read_bytes() != source.read_bytes():
                raise ValueError(f"Archive member differs from its source: {member}")
            if member.endswith(f"/{APP_NAME}"):
                extracted_app = extracted

        print(f"OK: {archive_path.name} contains all {len(sources)} current kit files.")
        if not run_tests:
            return 0
        if extracted_app is None:
            raise ValueError("The archived application entry is missing")
        node = shutil.which("node")
        if not node:
            raise RuntimeError("Node.js is required to run the archived app test")
        result = subprocess.run(
            [node, str(TEST_SCRIPT), str(extracted_app)],
            cwd=APP.parent,
            check=False,
        )
        return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--archive",
        type=Path,
        default=ARCHIVE,
        help="7z archive to inspect (default: the tracked release kit)",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="also run the jsdom regression suite against the archived HTML",
    )
    args = parser.parse_args()
    try:
        return validate(args.archive, args.test)
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Kit validation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
