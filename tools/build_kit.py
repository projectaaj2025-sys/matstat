#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the standalone 7z kit without a shared staging directory."""

from __future__ import annotations

import argparse
import lzma
import os
import stat
import tempfile
import time
from pathlib import Path

import py7zr

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "index.html"
KIT_DIR = ROOT / "СтатПрактикум — комплект"
ARCHIVE = ROOT / "СтатПрактикум — комплект.7z"
ARC_ROOT = KIT_DIR.name
APP_NAME = "СтатПрактикум.html"

# Keep archive order stable and easy to inspect.
DOCS = (
    "StatPracticum — guide (EN).md",
    "Инструкция к СтатПрактикуму.md",
    "СтатПрактикум — нұсқаулық (KK).md",
    "Что нового в 4.0.md",
)
FILTERS = [{"id": py7zr.FILTER_LZMA2, "preset": 9 | lzma.PRESET_EXTREME}]


def inputs() -> list[tuple[Path, str]]:
    files = [(KIT_DIR / name, f"{ARC_ROOT}/{name}") for name in DOCS]
    files.append((APP, f"{ARC_ROOT}/{APP_NAME}"))
    missing = [source for source, _ in files if not source.is_file()]
    if missing:
        raise FileNotFoundError("Missing kit input(s): " + ", ".join(map(str, missing)))
    return files


def build(output: Path) -> Path:
    """Write a complete archive atomically and leave no shared temp files."""
    output = output.expanduser().resolve()
    files = inputs()
    input_paths = {source.resolve() for source, _ in files}
    if output in input_paths:
        raise ValueError("The archive output path must not replace one of its input files")
    output.parent.mkdir(parents=True, exist_ok=True)
    output_mode = stat.S_IMODE(output.stat().st_mode) if output.exists() else 0o644

    fd, temp_name = tempfile.mkstemp(
        prefix=f".{output.name}.", suffix=".tmp", dir=output.parent
    )
    os.close(fd)
    temp_archive = Path(temp_name)
    started = time.perf_counter()
    try:
        with py7zr.SevenZipFile(temp_archive, "w", filters=FILTERS) as archive:
            for source, archive_name in files:
                archive.write(source, archive_name)
        os.chmod(temp_archive, output_mode)
        os.replace(temp_archive, output)
    finally:
        temp_archive.unlink(missing_ok=True)

    elapsed = time.perf_counter() - started
    print(f"Archive ready: {output} — {output.stat().st_size / 1048576:.1f} MB in {elapsed:.0f}s")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ARCHIVE,
        help="archive path (default: the tracked 7z kit)",
    )
    args = parser.parse_args()
    try:
        build(args.output)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
