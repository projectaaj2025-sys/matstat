#!/usr/bin/env python3
"""Run dependency-free integrity checks on the standalone StatPracticum page.

The page intentionally embeds its data, fonts, and JavaScript so it also works
offline. This check validates the JSON payloads, syntax-checks executable inline
scripts with Node.js, and catches duplicate IDs or external script/stylesheet
tags before a release is published.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_JSON_SCRIPTS = {"course-data", "material-data", "pdf-worker-data"}
REQUIRED_APP_SCRIPT = "app-code"
JSON_TYPES = {"application/json", "application/ld+json"}
JAVASCRIPT_TYPES = {
    "application/ecmascript",
    "application/javascript",
    "text/ecmascript",
    "text/javascript",
}


class ReleaseParser(HTMLParser):
    """Collect document metadata while treating script/style bodies as text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.scripts: list[dict[str, object]] = []
        self.runtime_assets: list[tuple[str, str]] = []
        self.title_parts: list[str] = []
        self.html_lang = ""
        self.main_count = 0
        self._script: dict[str, object] | None = None
        self._in_title = False
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()

        if "id" in attrs_dict:
            self.ids.append(attrs_dict["id"])
        if tag == "html":
            self.html_lang = attrs_dict.get("lang", "")
        elif tag == "main":
            self.main_count += 1
        elif tag == "title":
            self._in_title = True
        elif tag == "script":
            if self._script is not None:
                self.errors.append("nested <script> element")
                return
            script: dict[str, object] = {"attrs": attrs_dict, "parts": []}
            self.scripts.append(script)
            self._script = script
            src = attrs_dict.get("src", "").strip()
            if src:
                self.runtime_assets.append(("script", src))
        elif tag == "link":
            rel = set(attrs_dict.get("rel", "").lower().split())
            href = attrs_dict.get("href", "").strip()
            if href and "stylesheet" in rel:
                self.runtime_assets.append(("stylesheet", href))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() == "script":
            self.errors.append("self-closing <script> element")
            self._script = None

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "script":
            if self._script is None:
                self.errors.append("unmatched </script> element")
            self._script = None
        elif tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._script is not None:
            parts = self._script["parts"]
            assert isinstance(parts, list)
            parts.append(data)
        elif self._in_title:
            self.title_parts.append(data)


def is_remote_url(value: str) -> bool:
    return urlsplit(value).scheme.lower() in {"http", "https"}


def script_source(script: dict[str, object]) -> tuple[dict[str, str], str]:
    attrs = script["attrs"]
    parts = script["parts"]
    assert isinstance(attrs, dict) and isinstance(parts, list)
    return attrs, "".join(parts)


def validate(html_path: Path) -> list[str]:
    problems: list[str] = []
    try:
        html = html_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        return [f"cannot read {html_path}: {error}"]

    parser = ReleaseParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as error:  # HTMLParser is permissive, but report parser failures.
        return [f"cannot parse {html_path}: {error}"]

    problems.extend(parser.errors)
    if parser._script is not None:
        problems.append("unclosed <script> element")
    if not parser.html_lang:
        problems.append("<html> is missing its lang attribute")
    if not "".join(parser.title_parts).strip():
        problems.append("document title is missing")
    if parser.main_count != 1:
        problems.append(f"expected exactly one <main>, found {parser.main_count}")

    duplicates = [value for value, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        problems.append("duplicate static IDs: " + ", ".join(sorted(duplicates)))

    for kind, value in parser.runtime_assets:
        if is_remote_url(value):
            problems.append(f"external {kind} prevents offline use: {value}")
            continue
        parsed = urlsplit(value)
        if parsed.scheme.lower() == "data":
            continue
        relative = unquote(parsed.path).lstrip("/")
        asset_path = html_path.parent / relative
        if not relative or not asset_path.is_file():
            problems.append(f"missing local {kind} asset: {value}")

    node = shutil.which("node")
    if not node:
        problems.append("Node.js is required to syntax-check inline JavaScript")

    seen_json_ids: Counter[str] = Counter()
    seen_app_ids: Counter[str] = Counter()
    js_scripts: list[tuple[str, str]] = []
    valid_json = 0

    for number, script in enumerate(parser.scripts, start=1):
        attrs, content = script_source(script)
        script_id = attrs.get("id", "")
        script_type = attrs.get("type", "").split(";", 1)[0].strip().lower()

        if script_type in JSON_TYPES or script_type.endswith("+json"):
            if script_id:
                seen_json_ids[script_id] += 1
            try:
                json.loads(content)
                valid_json += 1
            except json.JSONDecodeError as error:
                problems.append(
                    f"JSON script #{number} ({script_id or 'no id'}) is invalid: "
                    f"line {error.lineno}, column {error.colno}: {error.msg}"
                )
            continue

        if script_type in {"", "module"} or script_type in JAVASCRIPT_TYPES:
            if script_id == REQUIRED_APP_SCRIPT:
                seen_app_ids[script_id] += 1
            # External scripts have no inline source, but are still checked above.
            if content.strip():
                js_scripts.append((script_type, content))

    for script_id in sorted(REQUIRED_JSON_SCRIPTS):
        if seen_json_ids[script_id] != 1:
            problems.append(
                f"expected one JSON script with id={script_id!r}, "
                f"found {seen_json_ids[script_id]}"
            )
    if seen_app_ids[REQUIRED_APP_SCRIPT] != 1:
        problems.append(
            f"expected one executable script with id={REQUIRED_APP_SCRIPT!r}, "
            f"found {seen_app_ids[REQUIRED_APP_SCRIPT]}"
        )
    if not js_scripts:
        problems.append("no executable inline JavaScript was found")

    if node and js_scripts:
        with tempfile.TemporaryDirectory(prefix="statpracticum-check-") as temp_dir:
            temp_path = Path(temp_dir)
            for number, (script_type, content) in enumerate(js_scripts, start=1):
                suffix = ".mjs" if script_type == "module" else ".js"
                source_path = temp_path / f"inline-{number}{suffix}"
                source_path.write_text(content, encoding="utf-8")
                result = subprocess.run(
                    [node, "--check", str(source_path)],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if result.returncode:
                    detail = (result.stderr or result.stdout).strip()
                    problems.append(f"inline JavaScript #{number} has a syntax error:\n{detail}")

    if not problems:
        print(
            f"OK {html_path}: {valid_json} JSON payloads, "
            f"{len(js_scripts)} inline JavaScript blocks, "
            f"{len(parser.ids)} unique IDs; no external script/stylesheet tags."
        )
    return problems


def main() -> int:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "index.html"
    if not target.is_absolute():
        target = Path.cwd() / target
    target = target.resolve()

    problems = validate(target)
    if problems:
        print(f"Release validation failed for {target}:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
