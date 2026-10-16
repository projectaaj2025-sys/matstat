#!/usr/bin/env python3
"""Build the redesigned StatPracticum tour with a dedicated API-key story."""

from __future__ import annotations

import math
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
PROMO = ROOT / "promo"
SCREENS = PROMO / "_screens"
WORK = PROMO / "_render_v2"
OUTPUT = PROMO / "statpracticum-overview-ai-ru.mp4"
COMPAT = WORK / "statpracticum-overview-ai-compatible.mp4"
ARCHIVE = PROMO / "statpracticum-overview-ai-ru.zip"
COVER = PROMO / "statpracticum-overview-ai-cover.jpg"

W, H, FPS = 1920, 1080, 24
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
BG = (7, 25, 35)
SURFACE = (13, 42, 54)
SURFACE_2 = (18, 53, 66)
WHITE = (249, 252, 252)
MUTED = (174, 199, 205)
TEAL = (61, 218, 177)
CYAN = (83, 191, 224)
CORAL = (242, 154, 122)


@dataclass(frozen=True)
class Scene:
    image: str
    seconds: float
    chapter: int
    label: str
    title: str
    bullets: tuple[str, ...]
    cursor: tuple[int, int] | None = None
    chrome: str | None = None
    accent: tuple[int, int, int] = TEAL
    note: str = ""
    providers: tuple[str, ...] = ()
    card: str = ""


SCENES = [
    Scene("01-home", 4.0, 0, "НОВЫЙ ВИДЕООБЗОР", "", (), card="open"),
    Scene("01-home", 4.0, 1, "ОБЗОР", "Полный курс в одном автономном сайте",
          ("19 тем и 610 проверяемых заданий", "18 лабораторий и 140 слайдов", "Работает без регистрации и сервера"),
          cursor=(526, 474)),
    Scene("02-theory", 2.5, 2, "УЧЕНИКУ", "Теория ведёт к действию",
          ("Понятные объяснения и формулы", "Графики, примеры и частые ошибки"), cursor=(560, 257), accent=CYAN),
    Scene("03-practice-check", 2.5, 2, "УЧЕНИКУ", "Ответ проверяется сразу",
          ("8 форматов заданий", "Обратная связь и разбор решения"), cursor=(480, 525), accent=CYAN),
    Scene("04-roulette-lab", 2.0, 3, "ИССЛЕДОВАНИЯ", "18 интерактивных лабораторий",
          ("Симуляции, серии опытов и графики", "CSV для собственного отчёта"), cursor=(1220, 521), accent=CORAL),
    Scene("05-pisa-data", 2.0, 3, "ИССЛЕДОВАНИЯ", "PISA на реальных данных",
          ("15 ситуаций и 90 вопросов", "Казахстан, мир и ссылки на источники"), cursor=(486, 757), accent=CORAL),
    Scene("20-project", 2.0, 3, "ИССЛЕДОВАНИЯ", "Собственный проект ученика",
          ("Вопрос → данные → расчёты → вывод", "Отчёт сохраняется локально"), cursor=(553, 269), accent=CORAL),
    Scene("06-bank-open", 2.0, 4, "ПРАКТИКА", "Банк из 75 задач",
          ("Фильтры по теме и условию", "Рабочий лист из любого набора"), cursor=(1139, 570)),
    Scene("07-search", 2.0, 4, "ПРАКТИКА", "Глобальный поиск заданий",
          ("Формат, уровень и статус", "Решение прямо в результатах поиска"), cursor=(646, 384)),
    Scene("08-trainer", 2.0, 4, "ПРАКТИКА", "Тренажёр только нерешённого",
          ("Весь курс, тема или трудные задания", "Решённое исчезает из очереди"), cursor=(490, 692)),
    Scene("10-exam-run", 2.5, 5, "КОНТРОЛЬНАЯ", "Таймер и честный режим",
          ("3–30 случайных заданий", "Подсказки и ИИ закрыты до сдачи"), cursor=(1350, 175), accent=CYAN),
    Scene("11-exam-result", 2.5, 5, "ПРОГРЕСС", "Автоматический итог",
          ("Процент, разбор и история", "Выгрузка результата в CSV"), cursor=(1336, 360), accent=CYAN),
    Scene("13-ai-page", 4.0, 6, "ИИ-НАСТАВНИК", "Помощник уже встроен в курс",
          ("Объясняет тему простыми словами", "Проверяет ответ и разбирает шаги", "Генерирует задачи с новыми числами"),
          cursor=(527, 553), accent=TEAL, note="Без API-ключа работает локальный режим."),
    Scene("14-ai-drawer", 4.0, 7, "ИИ НА ЛЮБОЙ СТРАНИЦЕ", "Контекстная панель помощника",
          ("Видит текущую тему или задание", "Открывается рядом с рабочим экраном"),
          cursor=(1465, 725), accent=TEAL),
    Scene("13b-ai-api-settings", 6.0, 8, "ПОДКЛЮЧЕНИЕ ИИ", "Внешняя модель — через API-ключ",
          ("1. Выберите провайдера и модель", "2. Вставьте ключ вида sk-…", "3. Нажмите «Проверить подключение»"),
          cursor=(712, 500), chrome="13-ai-page", accent=CORAL,
          note="Подключение необязательно: без ключа курс продолжает отвечать локально."),
    Scene("13b-ai-api-settings", 4.0, 9, "БЕЗОПАСНОСТЬ API", "Ключ не попадает в файл курса",
          ("Хранится только в localStorage браузера", "Запрос идёт напрямую к API провайдера", "Для класса используйте отдельный ключ"),
          cursor=(698, 616), chrome="13-ai-page", accent=CYAN,
          providers=("DeepSeek", "OpenAI", "OpenRouter", "Groq", "Gemini", "Mistral", "Ollama", "LM Studio")),
    Scene("15-teacher-profile", 4.0, 10, "УЧИТЕЛЮ", "Настройте правила проверки",
          ("Показ решений и число попыток", "Автооценка и порог зачёта"), cursor=(437, 803), accent=CORAL),
    Scene("16b-teacher-plan-detail", 2.5, 11, "УЧИТЕЛЮ", "Готовый план и рабочий лист",
          ("Этапы уже распределены по времени", "Печать или сохранение в PDF"), cursor=(1088, 519), chrome="16-teacher-plan", accent=CORAL),
    Scene("17b-teacher-upload-detail", 2.5, 11, "УЧИТЕЛЮ", "Добавьте свои материалы",
          ("PDF, текст, Markdown или изображения", "Материалы встраиваются в копию курса"), cursor=(665, 491), chrome="17-teacher-upload", accent=CORAL),
    Scene("18-library", 2.0, 12, "БИБЛИОТЕКА", "Всё необходимое уже внутри",
          ("Презентации, конспекты и источники", "Открываются без интернета"), cursor=(501, 734)),
    Scene("21-home-en", 1.0, 12, "3 ЯЗЫКА", "Русский · English · Қазақша",
          ("Интерфейс и задания меняют язык",), cursor=(1431, 40)),
    Scene("22-home-kk", 1.0, 12, "3 ЯЗЫКА", "Прогресс не теряется",
          ("Печатные материалы — на выбранном языке",), cursor=(1431, 40)),
    Scene("01-home", 4.0, 13, "ГОТОВО", "", (), card="close"),
]


def face(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(BOLD_PATH if bold else FONT_PATH, size)


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    size = (math.ceil(image.width * scale), math.ceil(image.height * scale))
    image = image.resize(size, Image.Resampling.LANCZOS)
    x = (image.width - width) // 2
    y = (image.height - height) // 2
    return image.crop((x, y, x + width, y + height))


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if not current or draw.textlength(candidate, font=font) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


_GRADIENT_CACHE: Image.Image | None = None


def gradient_background() -> Image.Image:
    global _GRADIENT_CACHE
    if _GRADIENT_CACHE is not None:
        return _GRADIENT_CACHE.copy()
    image = Image.new("RGB", (W, H), BG)
    pix = image.load()
    for y in range(H):
        for x in range(W):
            glow = max(0.0, 1.0 - math.hypot(x - 250, y - 980) / 1200)
            glow2 = max(0.0, 1.0 - math.hypot(x - 1850, y - 80) / 1000)
            pix[x, y] = (
                min(255, int(BG[0] + glow * 10 + glow2 * 5)),
                min(255, int(BG[1] + glow * 31 + glow2 * 20)),
                min(255, int(BG[2] + glow * 36 + glow2 * 30)),
            )
    draw = ImageDraw.Draw(image, "RGBA")
    for x in range(40, W, 90):
        for y in range(30, H, 90):
            draw.ellipse((x, y, x + 3, y + 3), fill=(111, 190, 183, 26))
    _GRADIENT_CACHE = image.convert("RGBA")
    return _GRADIENT_CACHE.copy()


def logo(draw: ImageDraw.ImageDraw, x: int, y: int, size: int = 58) -> None:
    draw.rounded_rectangle((x, y, x + size, y + size), radius=14, fill=(21, 67, 80))
    points = [(x + 13, y + 42), (x + 24, y + 30), (x + 34, y + 35), (x + 47, y + 16)]
    draw.line(points, fill=TEAL, width=4, joint="curve")
    for px, py in points:
        draw.ellipse((px - 3, py - 3, px + 3, py + 3), fill=TEAL)


def fixed_chrome(detail: Image.Image, source: Image.Image) -> Image.Image:
    result = detail.copy()
    result.paste(source.crop((0, 0, 1600, 78)), (0, 0))
    result.paste(source.crop((0, 78, 342, 900)), (0, 78))
    return result


def source_cursor(image: Image.Image, x: int, y: int, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw.ellipse((x - 29, y - 29, x + 29, y + 29), outline=(*color, 185), width=6)
    pointer = [(x, y), (x + 3, y + 34), (x + 13, y + 25), (x + 23, y + 42),
               (x + 31, y + 37), (x + 20, y + 21), (x + 34, y + 20)]
    draw.polygon([(px + 3, py + 4) for px, py in pointer], fill=(0, 0, 0, 115))
    draw.polygon(pointer, fill=(255, 255, 255, 255), outline=(6, 31, 41, 255))


def browser_window(canvas: Image.Image, screen: Image.Image, scene: Scene) -> None:
    x, y, width = 55, 174, 1280
    toolbar = 48
    shot_h = 720
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle((x + 10, y + 15, x + width + 10, y + toolbar + shot_h + 15),
                           radius=27, fill=(0, 0, 0, 85))
    draw.rounded_rectangle((x, y, x + width, y + toolbar + shot_h), radius=27,
                           fill=(236, 242, 243), outline=(116, 151, 159, 90), width=2)
    draw.rectangle((x, y + 26, x + width, y + toolbar + 2), fill=(236, 242, 243))
    for i, color in enumerate(((244, 114, 103), (242, 192, 89), (70, 197, 139))):
        cx = x + 24 + i * 23
        draw.ellipse((cx, y + 18, cx + 11, y + 29), fill=color)
    address_x = x + 120
    draw.rounded_rectangle((address_x, y + 10, x + width - 20, y + 38), radius=14, fill=(218, 228, 230))
    draw.text((address_x + 18, y + 15), "projectaaj2025-sys.github.io/matstat/", font=face(14), fill=(67, 91, 98))
    mask = Image.new("L", (width, shot_h), 255)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, 0, width, shot_h), fill=255)
    md.rounded_rectangle((0, shot_h - 35, width, shot_h + 15), radius=27, fill=255)
    shot = fit(screen, width, shot_h)
    canvas.paste(shot, (x, y + toolbar), mask)


CHAPTER_NAMES = {
    1: "КУРС", 2: "ОБУЧЕНИЕ", 3: "ИССЛЕДОВАНИЯ", 4: "ПРАКТИКА",
    5: "КОНТРОЛЬ", 6: "ЛОКАЛЬНЫЙ ИИ", 7: "ИИ В КОНТЕКСТЕ",
    8: "API-КЛЮЧ", 9: "БЕЗОПАСНОСТЬ", 10: "ПРОФИЛЬ УЧИТЕЛЯ",
    11: "ПОДГОТОВКА УРОКА", 12: "МАТЕРИАЛЫ", 13: "СТАРТ",
}


def side_panel(canvas: Image.Image, scene: Scene) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    x, y, width, height = 1372, 174, 492, 768
    draw.rounded_rectangle((x, y, x + width, y + height), radius=30, fill=(*SURFACE, 245), outline=(*scene.accent, 90), width=2)
    draw.rounded_rectangle((x + 28, y + 28, x + 252, y + 68), radius=20, fill=(*scene.accent, 245))
    draw.text((x + 48, y + 39), scene.label, font=face(16, True), fill=BG)
    draw.text((x + 379, y + 22), f"{scene.chapter:02d}", font=face(64, True), fill=(*scene.accent, 80))

    title_font = face(39, True)
    ty = y + 105
    for line in wrap(draw, scene.title, title_font, width - 58)[:4]:
        draw.text((x + 29, ty), line, font=title_font, fill=WHITE)
        ty += 51

    bullet_y = max(y + 325, ty + 25)
    bullet_font = face(20)
    for bullet in scene.bullets:
        draw.rounded_rectangle((x + 29, bullet_y + 7, x + 44, bullet_y + 22), radius=5, fill=scene.accent)
        lines = wrap(draw, bullet, bullet_font, width - 82)
        for li, line in enumerate(lines[:2]):
            draw.text((x + 57, bullet_y + li * 28), line, font=bullet_font, fill=MUTED)
        bullet_y += max(43, len(lines[:2]) * 28 + 13)

    if scene.providers:
        py = min(y + height - 205, bullet_y + 10)
        draw.text((x + 29, py), "ПОДДЕРЖИВАЕМЫЕ ПРОВАЙДЕРЫ", font=face(13, True), fill=scene.accent)
        py += 30
        px = x + 29
        for provider in scene.providers:
            tw = int(draw.textlength(provider, font=face(14, True))) + 26
            if px + tw > x + width - 24:
                px = x + 29
                py += 37
            draw.rounded_rectangle((px, py, px + tw, py + 29), radius=14, fill=(*SURFACE_2, 255), outline=(80, 128, 139, 150))
            draw.text((px + 13, py + 7), provider, font=face(14, True), fill=WHITE)
            px += tw + 8

    if scene.note:
        ny = y + height - 120
        draw.rounded_rectangle((x + 25, ny, x + width - 25, y + height - 32), radius=18, fill=(*scene.accent, 28), outline=(*scene.accent, 100))
        note_lines = wrap(draw, scene.note, face(15), width - 84)
        draw.text((x + 45, ny + 19), "\n".join(note_lines[:3]), font=face(15), fill=(216, 235, 232), spacing=6)

    # Vertical chapter rail: this is deliberately unlike the first video's bottom caption.
    rail_x = x + width - 23
    for i in range(1, 14):
        cy = y + 92 + (i - 1) * 43
        r = 6 if i == scene.chapter else 3
        fill = scene.accent if i <= scene.chapter else (72, 102, 111)
        draw.ellipse((rail_x - r, cy - r, rail_x + r, cy + r), fill=fill)


def header(canvas: Image.Image, scene: Scene) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    logo(draw, 55, 49)
    draw.text((130, 48), "СТАТПРАКТИКУМ", font=face(24, True), fill=WHITE)
    draw.text((130, 82), "ВОЗМОЖНОСТИ САЙТА · НОВАЯ ВЕРСИЯ РОЛИКА", font=face(12, True), fill=TEAL)
    chapter = CHAPTER_NAMES.get(scene.chapter, "ОБЗОР")
    draw.text((1372, 70), chapter, font=face(15, True), fill=MUTED)


def title_card(screen: Image.Image, kind: str) -> Image.Image:
    canvas = gradient_background()
    draw = ImageDraw.Draw(canvas, "RGBA")
    logo(draw, 90, 74, 68)
    draw.text((180, 76), "СТАТПРАКТИКУМ", font=face(30, True), fill=WHITE)
    draw.text((180, 118), "ИНТЕРАКТИВНЫЙ КУРС С ИИ-НАСТАВНИКОМ", font=face(14, True), fill=TEAL)

    if kind == "open":
        draw.text((90, 290), "Другой взгляд", font=face(65, True), fill=WHITE)
        draw.text((90, 371), "на возможности сайта", font=face(65, True), fill=TEAL)
        draw.text((94, 473), "Для ученика · для учителя · с подключением ИИ по API-ключу",
                  font=face(25), fill=MUTED)
        tags = ("ОБУЧЕНИЕ", "ПРАКТИКА", "КОНТРОЛЬ", "AI API")
    else:
        draw.text((90, 292), "Готово к уроку.", font=face(66, True), fill=WHITE)
        draw.text((90, 374), "Готово к исследованию.", font=face(66, True), fill=TEAL)
        draw.text((94, 479), "Локальный режим работает сразу. Внешний ИИ подключается по желанию.",
                  font=face(24), fill=MUTED)
        tags = ("ОДИН HTML-ФАЙЛ", "БЕЗ СЕРВЕРА", "3 ЯЗЫКА", "API ПО ЖЕЛАНИЮ")

    tx = 92
    for tag in tags:
        tw = int(draw.textlength(tag, font=face(14, True))) + 40
        draw.rounded_rectangle((tx, 565, tx + tw, 607), radius=21, fill=SURFACE_2, outline=(69, 143, 134, 150))
        draw.text((tx + 20, 578), tag, font=face(14, True), fill=WHITE)
        tx += tw + 12

    # Floating real-site window on the right/bottom gives the title card a very
    # different rhythm from the first full-screen design.
    shot_w, shot_h = 760, 428
    shot = fit(screen, shot_w, shot_h).filter(ImageFilter.GaussianBlur(0.35))
    sx, sy = 1090, 430
    draw.rounded_rectangle((sx + 13, sy + 16, sx + shot_w + 13, sy + shot_h + 16), radius=26, fill=(0, 0, 0, 85))
    canvas.paste(shot, (sx, sy))
    draw.rounded_rectangle((sx, sy, sx + shot_w, sy + shot_h), radius=25, outline=(98, 183, 169, 160), width=3)

    if kind == "close":
        draw.rounded_rectangle((90, 770, 760, 852), radius=18, fill=TEAL)
        draw.text((125, 796), "projectaaj2025-sys.github.io/matstat/", font=face(23, True), fill=BG)
        draw.text((90, 910), "Ключ API хранится только в браузере и отправляется напрямую провайдеру.",
                  font=face(17), fill=(157, 191, 197))
    else:
        draw.text((90, 740), "61 секунда · реальный интерфейс · новые акценты",
                  font=face(18, True), fill=(152, 194, 196))
    return canvas.convert("RGB")


def compose(scene: Scene, index: int) -> Path:
    path = SCREENS / f"{scene.image}.png"
    if not path.exists():
        raise FileNotFoundError(path)
    screen = Image.open(path).convert("RGB")
    if scene.chrome:
        screen = fixed_chrome(screen, Image.open(SCREENS / f"{scene.chrome}.png").convert("RGB"))
    if scene.cursor:
        source_cursor(screen, *scene.cursor, scene.accent)
    if scene.card:
        canvas = title_card(screen, scene.card)
    else:
        canvas = gradient_background()
        header(canvas, scene)
        browser_window(canvas, screen, scene)
        side_panel(canvas, scene)
        canvas = canvas.convert("RGB")
    out = WORK / f"scene-{index:02d}.png"
    canvas.save(out, optimize=True)
    return out


def run(args: list[str]) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> None:
    if not SCREENS.exists():
        raise SystemExit("Run promo/capture_screens.mjs first.")
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(parents=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    rendered: list[Path] = []

    for i, scene in enumerate(SCENES):
        still = compose(scene, i)
        video = WORK / f"segment-{i:02d}.mp4"
        end = scene.seconds - 0.24
        # Small camera movement keeps the tour animated while the browser mockup
        # and the API instructions remain readable.
        dx = 36 if i % 2 == 0 else -36
        x = f"18+({dx})*(t/{scene.seconds:.3f})"
        vf = (
            "scale=1956:1101:flags=lanczos,"
            f"crop=1920:1080:x='{x}':y='10+6*sin(t*0.8)',"
            "fade=t=in:st=0:d=0.24:color=0x071923,"
            f"fade=t=out:st={end:.3f}:d=0.24:color=0x071923,"
            f"fps={FPS},format=yuv420p"
        )
        run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
             "-loop", "1", "-framerate", str(FPS), "-i", str(still),
             "-t", f"{scene.seconds:.3f}", "-vf", vf,
             "-c:v", "libx264", "-preset", "fast", "-crf", "20",
             "-pix_fmt", "yuv420p", "-an", str(video)])
        rendered.append(video)
        print(f"Rendered {i + 1}/{len(SCENES)}")

    concat = WORK / "concat.txt"
    concat.write_text("\n".join(f"file '{p.name}'" for p in rendered) + "\n", encoding="utf-8")
    video_only = WORK / "video-only.mp4"
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
         "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(video_only)])
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
         "-i", str(video_only), "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
         "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(OUTPUT)])

    # Browser-compatible 720p baseline copy for the downloadable archive.
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(OUTPUT),
         "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-profile:v", "baseline",
         "-level", "3.1", "-preset", "medium", "-crf", "28", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(COMPAT)])
    from zipfile import ZipFile, ZIP_STORED
    with ZipFile(ARCHIVE, "w", compression=ZIP_STORED) as archive:
        archive.write(COMPAT, "statpracticum-overview-ai-ru.mp4")

    Image.open(WORK / "scene-00.png").convert("RGB").save(COVER, quality=91, optimize=True)
    print(f"Created {OUTPUT} ({sum(s.seconds for s in SCENES):.1f} s)")
    print(f"Created {ARCHIVE}")


if __name__ == "__main__":
    main()
