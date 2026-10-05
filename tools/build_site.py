#!/usr/bin/env python3
"""Inline the maintained CSS/JavaScript sources into the standalone page.

The large course data and vendored libraries remain in index.html so the
published page and downloadable kit continue to work offline. CSS and app code
are maintained under src/ and inlined here for distribution.
"""

from __future__ import annotations

import argparse
import os
import re
import stat
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CSS_BLOCKS = (
    ("course-font", "src/css/00-course-font.css"),
    ("math-style", "src/css/01-katex.css"),
    ("app-style", "src/css/02-app.css"),
    ("assist-styles", "src/css/03-open-answer.css"),
    ("profile-styles", "src/css/04-teacher-profile.css"),
    ("feature-styles", "src/css/05-features.css"),
)
# Joiners preserve the original blank lines between sections in the standalone file.
JS_PARTS = (
    ("src/js/00-bootstrap.js", "\n"),
    ("src/js/01-course-navigation.js", ""),
    ("src/js/02-practice-and-checking.js", ""),
    ("src/js/03-progress-and-library.js", ""),
    ("src/js/04-localization.js", "\n"),
    ("src/js/05-statistics-labs.js", "\n"),
    ("src/js/06-research-labs.js", ""),
    ("src/js/07-roulette-and-betting.js", ""),
    ("src/js/08-reflection-and-projects.js", ""),
    ("src/js/09-bank-and-teacher.js", ""),
    ("src/js/10-worksheets-and-exports.js", "\n"),
    ("src/js/11-materials-and-pdf.js", "\n"),
    ("src/js/12-open-answer-assistant.js", "\n"),
    ("src/js/13-teacher-settings.js", "\n"),
    ("src/js/14-solution-gate.js", "\n"),
    ("src/js/15-open-answer-scoring.js", "\n"),
    ("src/js/16-teacher-profile.js", "\n"),
    ("src/js/17-check-hook.js", "\n"),
    ("src/js/18-hard-tasks.js", "\n"),
    ("src/js/19-error-trainer.js", "\n"),
    ("src/js/20-task-search.js", "\n"),
    ("src/js/21-exam.js", "\n"),
    ("src/js/22-lesson-notes.js", "\n"),
    ("src/js/23-boot.js", ""),
)


def read_source(relative_path: str) -> str:
    path = ROOT / relative_path
    try:
        return path.read_bytes().decode("utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"cannot read source {path.relative_to(ROOT)}: {error}") from error


def replace_block(html: str, tag: str, block_id: str, content: str) -> str:
    pattern = re.compile(
        rf'(<{tag}\b(?=[^>]*\s+id\s*=\s*["\']{re.escape(block_id)}["\'])[^>]*>)'
        rf"(.*?)"
        rf"(</{tag}\s*>)",
        re.IGNORECASE | re.DOTALL,
    )
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise ValueError(
            f"expected exactly one <{tag} id={block_id!r}> in index.html, "
            f"found {len(matches)}"
        )
    match = matches[0]
    return html[: match.start()] + match.group(1) + content + match.group(3) + html[match.end() :]


def render() -> bytes:
    try:
        html = INDEX.read_bytes().decode("utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"cannot read {INDEX}: {error}") from error

    for block_id, source_path in CSS_BLOCKS:
        html = replace_block(html, "style", block_id, read_source(source_path))

    app_parts: list[str] = []
    for source_path, separator in JS_PARTS:
        part = read_source(source_path)
        if not part.endswith("\n") or part.endswith("\n\n"):
            raise ValueError(f"JavaScript source must end with one newline: {source_path}")
        app_parts.append(part + separator)
    app_code = "".join(app_parts)
    html = replace_block(html, "script", "app-code", app_code)
    return html.encode("utf-8")


def write_atomically(content: bytes) -> None:
    mode = stat.S_IMODE(INDEX.stat().st_mode)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".index.html-", dir=ROOT, delete=False) as handle:
            temp_path = Path(handle.name)
            handle.write(content)
        os.chmod(temp_path, mode)
        os.replace(temp_path, INDEX)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail if index.html differs from the CSS/JavaScript sources",
    )
    args = parser.parse_args()

    try:
        output = render()
        if args.check:
            if INDEX.read_bytes() != output:
                print("index.html is out of date; run: python tools/build_site.py", file=sys.stderr)
                return 1
            print("OK: index.html matches the maintained CSS/JavaScript sources.")
            return 0

        if INDEX.read_bytes() == output:
            print("index.html is already up to date.")
            return 0
        write_atomically(output)
        print("Built index.html from src/css and src/js.")
        return 0
    except (OSError, ValueError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
