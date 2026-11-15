#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add the presentation-related interface phrases missing from course-data.

The dictionary lives in the large embedded `course-data` payload of index.html,
so the phrases are appended to the English and Kazakh interface dictionaries.
Running the script twice changes nothing.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

# ru: (en, kk) — подписи карточек презентаций, просмотрщика и панели учителя.
PHRASES = {
    "МБ": ("MB", "МБ"),
    "доп. модуль, 11 класс": ("extra module, grade 11", "қосымша модуль, 11 сынып"),
    "Язык встроенного файла": ("Language of the built-in file", "Кірістірілген файл тілі"),
    "Изображение слайда": ("Slide image", "Слайд суреті"),
    "Текстового слоя нет.": ("There is no text layer.", "Мәтін қабаты жоқ."),
    "В этой странице нет текстового слоя. Используйте изображение слайда.": (
        "This page has no text layer. Use the slide image instead.",
        "Бұл бетте мәтін қабаты жоқ. Слайд суретін қолданыңыз.",
    ),
    "Слайд": ("Slides", "Слайд"),
    "Открыть презентацию на языке": ("Open the presentation in the language", "Презентацияны тілде ашу"),
    "тема": ("topic", "тақырып"),
    "тем": ("topics", "тақырып"),
    "списке материалов": ("in the materials list", "материалдар тізімінде"),
    # Фрагмент казахских названий («1-сабақ»), который иначе остаётся кириллицей в английской версии.
    "сабақ. Кездейсоқ шамалар": ("lesson. Random variables", "сабақ. Кездейсоқ шамалар"),
    "и методическая работа уже внутри курса. Слайды открываются без интернета. Дополнительные материалы можно загрузить через кнопку «Учителю».": (
        "and the methodical work are already inside the course. The slides open without the internet. Additional materials can be uploaded with the “Teacher” button.",
        "және әдістемелік жұмыс курстың ішінде. Слайдтар интернетсіз ашылады. Қосымша материалдарды «Мұғалім» түймесі арқылы жүктеуге болады.",
    ),
    # Счётчики презентаций в библиотеке: число подставляется, форма слова переводится.
    "приложенная презентация": ("attached presentation", "тіркелген презентация"),
    "приложенные презентации": ("attached presentations", "тіркелген презентациялар"),
    "приложенных презентаций": ("attached presentations", "тіркелген презентациялар"),
    "Изображения слайдов": ("Slide images", "Слайд суреттері"),
    "Слайды / презентация": ("Slides / presentation", "Слайдтар / презентация"),
    "Методический материал для учителя": (
        "Teaching material for the teacher",
        "Мұғалімге арналған әдістемелік материал",
    ),
    "Показ презентации": ("Presenting the deck", "Презентацияны көрсету"),
    "Презентация открыта на языке интерфейса.": (
        "The presentation opens in the interface language.",
        "Презентация интерфейс тілінде ашылады.",
    ),
    "Каждая презентация открывается на языке интерфейса; переключатель языков меняет и файл.": (
        "Every presentation opens in the interface language; the language switch changes the file too.",
        "Әр презентация интерфейс тілінде ашылады; тіл ауыстырғыш файлды да ауыстырады.",
    ),
    "Презентации уже загружены. Откройте их здесь: листайте слайды, увеличивайте масштаб и читайте пояснения. Исходные PDF можно скачать.": (
        "The presentations are already loaded. Open them here: browse the slides, zoom in and read the notes. The original PDFs can be downloaded.",
        "Презентациялар жүктелген. Оларды осында ашыңыз: слайдтарды парақтап, масштабты үлкейтіп, түсініктемелерді оқыңыз. Түпнұсқа PDF-терді жүктеуге болады.",
    ),
    "Отдельной презентации пока нет. Теория, графики и задания доступны во вкладках темы.": (
        "There is no separate presentation yet. The theory, charts and tasks are available in the topic tabs.",
        "Жеке презентация әзірге жоқ. Теория, графиктер және тапсырмалар тақырып қойындыларында қолжетімді.",
    ),
    "Учитель может добавить свой материал.": (
        "A teacher can add their own material.",
        "Мұғалім өз материалын қоса алады.",
    ),
    "Скачать текст": ("Download the text", "Мәтінді жүктеу"),
    "Не удалось показать страницу. Исходный материал доступен по кнопке «Скачать».": (
        "The page could not be shown. The original material is available with the “Download” button.",
        "Бетті көрсету мүмкін болмады. Түпнұсқа материал «Жүктеу» түймесімен қолжетімді.",
    ),
    "Этот формат можно скачать для просмотра.": (
        "This format can be downloaded to view it.",
        "Бұл форматты қарау үшін жүктеуге болады.",
    ),
}

BLOCK = re.compile(
    r"(<script\b[^>]*\bid\s*=\s*[\"']course-data[\"'][^>]*>)(.*?)(</script\s*>)",
    re.IGNORECASE | re.DOTALL,
)


def inject(data: dict) -> int:
    added = 0
    for lang, index in (("en", 0), ("kk", 1)):
        target = data["i18n"][lang]
        for source, translations in PHRASES.items():
            value = translations[index]
            if target.get(source) == value:
                continue
            target[source] = value
            added += 1
    return added


def main() -> int:
    html = INDEX.read_text(encoding="utf-8")
    matches = list(BLOCK.finditer(html))
    if len(matches) != 1:
        raise SystemExit(f"expected one course-data script, found {len(matches)}")
    match = matches[0]
    data = json.loads(match.group(2))
    added = inject(data)
    if added:
        payload = json.dumps(data, ensure_ascii=False)
        html = html[: match.start(2)] + payload + html[match.end(2) :]
        INDEX.write_text(html, encoding="utf-8")
    print(f"course-data: {added} phrase(s) added")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
