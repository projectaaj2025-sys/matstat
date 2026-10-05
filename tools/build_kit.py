#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересборка автономного комплекта «СтатПрактикум — комплект.7z».

Внутри архива лежит полная автономная сборка приложения под именем
`СтатПрактикум.html` (копия корневого index.html) плюс инструкции RU/EN/KK
и обзор версии. Скрипт следит, чтобы в архив никогда не попала устаревшая
копия приложения: она копируется из index.html при каждой сборке.

Запуск:  python3 tools/build_kit.py
"""
import lzma
import shutil
import sys
import time
from pathlib import Path

import py7zr

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'index.html'
KIT_DIR = ROOT / 'СтатПрактикум — комплект'
ARCHIVE = ROOT / 'СтатПрактикум — комплект.7z'
ARC_ROOT = KIT_DIR.name

# Порядок файлов в архиве: инструкции, затем приложение, затем обзор версии.
DOCS = [
    'StatPracticum — guide (EN).md',
    'Инструкция к СтатПрактикуму.md',
    'СтатПрактикум — нұсқаулық (KK).md',
    'Что нового в 4.0.md',
]
APP_NAME = 'СтатПрактикум.html'

FILTERS = [{'id': py7zr.FILTER_LZMA2, 'preset': 9 | lzma.PRESET_EXTREME}]


def build_stage(stage: Path) -> None:
    if stage.exists():
        shutil.rmtree(stage)
    target = stage / ARC_ROOT
    target.mkdir(parents=True)
    for name in DOCS:
        src = KIT_DIR / name
        if not src.exists():
            raise SystemExit(f'Нет файла комплекта: {src}')
        shutil.copy2(src, target / name)
    if not APP.exists():
        raise SystemExit(f'Нет сборки приложения: {APP}')
    shutil.copy2(APP, target / APP_NAME)
    print(f'Подготовлено: {target}')


def main() -> int:
    stage = Path('/tmp/statpracticum-kit')
    build_stage(stage)
    started = time.time()
    tmp_archive = ARCHIVE.with_suffix('.7z.tmp')
    if tmp_archive.exists():
        tmp_archive.unlink()
    entry = stage / ARC_ROOT
    with py7zr.SevenZipFile(tmp_archive, 'w', filters=FILTERS) as z:
        for name in DOCS:
            z.write(entry / name, f'{ARC_ROOT}/{name}')
        z.write(entry / APP_NAME, f'{ARC_ROOT}/{APP_NAME}')
    tmp_archive.replace(ARCHIVE)
    size = ARCHIVE.stat().st_size
    print(f'Архив готов: {ARCHIVE.name} — {size/1048576:.1f} МБ за {time.time()-started:.0f} с')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
