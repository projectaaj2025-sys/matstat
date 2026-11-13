#!/usr/bin/env python3
"""Embed the comic strips from src/img/stories/ into a JavaScript source.

The standalone page must work offline, so every strip is stored as a data URL in
src/js/22-stories-images.js. Run this after adding or replacing a .webp file,
then rebuild the page with tools/build_site.py.
"""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "src" / "img" / "stories"
OUTPUT = ROOT / "src" / "js" / "22-stories-images.js"
HEADER = (
    "/* ---- 13б. Картинки комиксов (data URL) ---------------------------------- */\n"
    "// Файл создан tools/build_story_images.py из src/img/stories/*.webp — не редактируйте вручную.\n"
)


def render() -> str:
    lines = []
    for path in sorted(IMAGES.glob("*.webp")):
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        lines.append(f"    {json.dumps(path.stem)}: \"data:image/webp;base64,{data}\"")
    return HEADER + "const SP_COMIC_IMAGES = {\n" + ",\n".join(lines) + "\n};\n"


def main() -> int:
    output = render()
    if "--check" in sys.argv[1:]:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != output:
            print("22-stories-images.js is out of date; run: python tools/build_story_images.py", file=sys.stderr)
            return 1
        print("OK: comic images match src/img/stories.")
        return 0
    OUTPUT.write_text(output, encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({len(output) // 1024} KB).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
