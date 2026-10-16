#!/usr/bin/env python3
"""Build the Russian screen-tour video from real StatPracticum screenshots.

The browser captures are made by capture_screens.mjs. This script adds the
editorial captions, role labels, cursor/click marks and renders a compact MP4.
Intermediate frames stay under promo/_render and are safe to delete.
"""

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
RENDER = PROMO / "_render"
OUTPUT = PROMO / "statpracticum-overview-ru.mp4"
COVER = PROMO / "statpracticum-video-cover.jpg"

WIDTH, HEIGHT, FPS = 1920, 1080, 24
NAVY = (12, 39, 49)
NAVY_2 = (20, 50, 63)
ACCENT = (44, 207, 165)
MINT = (225, 248, 241)
WHITE = (255, 255, 255)
MUTED = (198, 218, 222)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


@dataclass(frozen=True)
class Segment:
    image: str
    duration: float
    audience: str
    title: str
    bullets: tuple[str, ...]
    chapter: int
    side: str = "left"
    cursor: tuple[int, int] | None = None
    chrome: str | None = None
    title_card: str | None = None


# The chapter count stays stable even when one chapter uses several captures.
SEGMENTS = [
    Segment("01-home", 4.0, "СТАТПРАКТИКУМ 4.0", "", (), 0, title_card="open"),
    Segment("01-home", 5.5, "УЧИТЕЛЮ И УЧЕНИКУ", "Весь курс — на одном экране",
            ("19 тем · 610 заданий · 18 лабораторий", "140 слайдов и готовая система практики"), 1,
            side="left", cursor=(526, 474)),
    Segment("02-theory", 3.0, "ДЛЯ УЧЕНИКА", "Сначала — понятная теория",
            ("Формулы, примеры, графики и частые ошибки", "Каждая тема ведёт прямо к практике"), 2,
            side="right", cursor=(564, 257)),
    Segment("03-practice-check", 3.2, "ДЛЯ УЧЕНИКА", "Затем — ответ и мгновенная проверка",
            ("8 форматов ответа и обратная связь", "Верный ответ сразу открывает разбор"), 2,
            side="right", cursor=(480, 525)),
    Segment("04-roulette-lab", 3.0, "ДЛЯ УЧЕНИКА", "Экспериментируй, а не заучивай",
            ("18 интерактивных лабораторий", "Серии опытов, графики и выгрузка CSV"), 3,
            side="right", cursor=(1220, 521)),
    Segment("20-project", 2.0, "ДЛЯ УЧЕНИКА", "Собери собственное исследование",
            ("Вопрос, данные, расчёты и вывод", "Черновик и отчёт сохраняются локально"), 3,
            side="left", cursor=(553, 269)),
    Segment("19-reflection", 2.0, "ДЛЯ УЧЕНИКА", "Заверши урок рефлексией",
            ("Самооценка, вопросы и напутствия", "Без оценивания способностей ученика"), 3,
            side="right", cursor=(543, 731)),
    Segment("05-pisa-data", 5.0, "РЕАЛЬНЫЕ ДАННЫЕ", "PISA-контексты про Казахстан и мир",
            ("15 ситуаций · 90 проверяемых вопросов", "Таблицы, источники и CSV доступны офлайн"), 4,
            side="right", cursor=(486, 757)),
    Segment("06-bank-open", 2.3, "БАНК ЗАДАЧ", "75 готовых задач для урока",
            ("Фильтры по набору, теме и условию", "Любой отбор превращается в рабочий лист"), 5,
            side="left", cursor=(1139, 570)),
    Segment("06b-bank-detail", 3.2, "БАНК ЗАДАЧ", "Полные условия и исходные данные",
            ("146 проверяемых подзаданий", "Ответы включаются только в версии учителя"), 5,
            side="left", cursor=(1358, 122), chrome="06-bank-open"),
    Segment("07-search", 2.7, "ЛИЧНЫЙ МАРШРУТ", "Найди нужное задание за секунды",
            ("Поиск по вопросу, критериям и разбору", "Фильтры по формату, уровню и статусу"), 6,
            side="right", cursor=(646, 384)),
    Segment("08-trainer", 2.8, "ЛИЧНЫЙ МАРШРУТ", "Повторяй только нерешённое",
            ("Весь курс, одна тема или трудные задания", "Решённое сразу уходит из очереди"), 6,
            side="right", cursor=(490, 692)),
    Segment("09-exam-builder", 2.0, "КОНТРОЛЬНАЯ", "Собери проверку под свой урок",
            ("Тема · 3–30 заданий · 5–90 минут", "Открытые ответы можно включить или убрать"), 7,
            side="right", cursor=(515, 477)),
    Segment("10-exam-run", 2.0, "КОНТРОЛЬНАЯ", "Честный режим с таймером",
            ("Подсказки, разборы и ИИ закрыты до сдачи", "Ответы сохраняются на этом устройстве"), 7,
            side="left", cursor=(1350, 175)),
    Segment("11-exam-result", 2.5, "КОНТРОЛЬНАЯ", "Итог и разбор — автоматически",
            ("Процент, решения по заданиям и история", "Результат выгружается в CSV"), 7,
            side="left", cursor=(1336, 360)),
    Segment("12-progress", 4.5, "ДЛЯ УЧЕНИКА", "Мой прогресс — без регистрации",
            ("Карта тем, трудные задания и история контрольных", "Все личные данные остаются в браузере"), 8,
            side="right", cursor=(507, 404)),
    Segment("13-ai-page", 3.0, "ИИ-НАСТАВНИК", "Помощник встроен прямо в курс",
            ("Объясняет тему и разбирает задачу по шагам", "Локальный режим работает даже без ключа"), 9,
            side="left", cursor=(527, 553)),
    Segment("14-ai-drawer", 3.2, "ИИ-НАСТАВНИК", "Задачи с новыми числами",
            ("Условие, таблица, ответ и разбор пересчитываются", "Внешняя модель подключается по желанию"), 9,
            side="left", cursor=(1465, 725)),
    Segment("15-teacher-profile", 5.2, "ДЛЯ УЧИТЕЛЯ", "Настрой правила показа и проверки",
            ("Решения · число попыток · порог зачёта", "Автооценка открытых ответов по критериям"), 10,
            side="right", cursor=(437, 803)),
    Segment("16b-teacher-plan-detail", 2.8, "ДЛЯ УЧИТЕЛЯ", "Готовый план урока и рабочий лист",
            ("Этапы занятия уже распределены по времени", "Лист можно распечатать или сохранить в PDF"), 11,
            side="right", cursor=(1088, 519), chrome="16-teacher-plan"),
    Segment("17b-teacher-upload-detail", 2.8, "ДЛЯ УЧИТЕЛЯ", "Добавь свои материалы",
            ("PDF, TXT, Markdown или до 30 изображений", "Дополнения встраиваются в копию курса"), 11,
            side="left", cursor=(665, 491), chrome="17-teacher-upload"),
    Segment("18-library", 2.2, "МАТЕРИАЛЫ", "Презентации и конспекты — внутри",
            ("6 презентаций · 140 слайдов", "Конспекты открываются и скачиваются текстом"), 12,
            side="right", cursor=(501, 734)),
    Segment("21-home-en", 1.5, "3 ЯЗЫКА", "Русский · English · Қазақша",
            ("Интерфейс, задания и выгрузки меняют язык", "Прогресс при переключении не теряется"), 12,
            side="left", cursor=(1431, 40)),
    Segment("22-home-kk", 1.5, "3 ЯЗЫКА", "Один курс для разных классов",
            ("Выбор языка сохраняется", "Печатные материалы создаются на выбранном языке"), 12,
            side="left", cursor=(1431, 40)),
    Segment("01-home", 4.3, "ГОТОВО К УРОКУ", "", (), 13, title_card="close"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def fit_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    ratio = max(tw / image.width, th / image.height)
    resized = image.resize((math.ceil(image.width * ratio), math.ceil(image.height * ratio)), Image.Resampling.LANCZOS)
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def add_fixed_chrome(detail: Image.Image, source: Image.Image) -> Image.Image:
    """Re-create what the fixed header/sidebar look like after a page scroll."""
    detail = detail.copy()
    # Source captures are 1600×900. These dimensions follow the app's actual
    # 78 px topbar and 342 px left edge of the desktop content shell.
    detail.paste(source.crop((0, 0, 1600, 78)), (0, 0))
    detail.paste(source.crop((0, 78, 342, 900)), (0, 78))
    return detail


def draw_logo(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    s = int(70 * scale)
    draw.rounded_rectangle((x, y, x + s, y + s), radius=int(17 * scale), fill=(20, 63, 76))
    pts = [(x + int(17*scale), y + int(50*scale)), (x + int(30*scale), y + int(37*scale)),
           (x + int(41*scale), y + int(43*scale)), (x + int(56*scale), y + int(21*scale))]
    draw.line(pts, fill=(126, 228, 197), width=max(2, int(4 * scale)), joint="curve")
    for px, py in pts:
        r = max(2, int(3 * scale))
        draw.ellipse((px-r, py-r, px+r, py+r), fill=(126, 228, 197))


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if not line or draw.textlength(candidate, font=face) <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_cursor(canvas: Image.Image, x: int, y: int) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    # Coordinates were recorded on a 1600×900 browser viewport.
    x = int(x * WIDTH / 1600)
    y = int(y * HEIGHT / 900)
    draw.ellipse((x - 37, y - 37, x + 37, y + 37), outline=(44, 207, 165, 155), width=7)
    draw.ellipse((x - 22, y - 22, x + 22, y + 22), outline=(255, 255, 255, 145), width=3)
    pointer = [(x, y), (x + 4, y + 43), (x + 15, y + 31), (x + 27, y + 53),
               (x + 38, y + 47), (x + 25, y + 26), (x + 42, y + 25)]
    shadow = [(px + 4, py + 5) for px, py in pointer]
    draw.polygon(shadow, fill=(0, 0, 0, 120))
    draw.polygon(pointer, fill=(255, 255, 255, 255), outline=(10, 35, 45, 255))


def add_caption(canvas: Image.Image, seg: Segment) -> Image.Image:
    draw = ImageDraw.Draw(canvas, "RGBA")
    panel_w, panel_h = 1010, 326
    x = 70 if seg.side == "left" else WIDTH - panel_w - 70
    y = HEIGHT - panel_h - 52
    # Soft shadow and glass-like dark card.
    draw.rounded_rectangle((x + 10, y + 14, x + panel_w + 10, y + panel_h + 14), radius=34, fill=(0, 0, 0, 70))
    draw.rounded_rectangle((x, y, x + panel_w, y + panel_h), radius=34, fill=(*NAVY, 232), outline=(82, 133, 142, 120), width=2)
    draw.rounded_rectangle((x + 34, y + 28, x + 34 + 250, y + 70), radius=21, fill=(*ACCENT, 235))
    audience_face = font(18, True)
    draw.text((x + 53, y + 39), seg.audience, font=audience_face, fill=NAVY)
    draw.text((x + panel_w - 110, y + 39), f"{seg.chapter:02d} / 12", font=font(17, True), fill=(*MUTED, 220))

    title_face = font(42, True)
    title_lines = wrap(draw, seg.title, title_face, panel_w - 72)
    ty = y + 92
    for line in title_lines[:2]:
        draw.text((x + 36, ty), line, font=title_face, fill=WHITE)
        ty += 54

    bullet_face = font(23, False)
    bullet_y = max(y + 205, ty + 10)
    for bullet in seg.bullets[:2]:
        draw.ellipse((x + 39, bullet_y + 8, x + 53, bullet_y + 22), fill=ACCENT)
        lines = wrap(draw, bullet, bullet_face, panel_w - 100)
        draw.text((x + 69, bullet_y), lines[0], font=bullet_face, fill=MUTED)
        bullet_y += 39

    # Chapter progress line.
    px0, px1 = x + 36, x + panel_w - 36
    py = y + panel_h - 22
    draw.rounded_rectangle((px0, py, px1, py + 5), radius=3, fill=(82, 111, 119, 175))
    draw.rounded_rectangle((px0, py, px0 + int((px1 - px0) * seg.chapter / 12), py + 5), radius=3, fill=ACCENT)
    return canvas


def title_card(background: Image.Image, kind: str) -> Image.Image:
    bg = fit_cover(background, (WIDTH, HEIGHT)).filter(ImageFilter.GaussianBlur(9)).convert("RGBA")
    tint = Image.new("RGBA", bg.size, (*NAVY, 215 if kind == "open" else 225))
    bg = Image.alpha_composite(bg, tint)
    draw = ImageDraw.Draw(bg, "RGBA")
    # Decorative data lines.
    for i in range(7):
        y = 165 + i * 125
        draw.line((0, y, WIDTH, y - 85), fill=(64, 155, 138, 27), width=2)
    draw_logo(draw, 126, 116, 1.0)
    draw.text((220, 125), "СТАТПРАКТИКУМ", font=font(36, True), fill=WHITE)
    draw.text((220, 176), "МАТЕМАТИКА · 10 КЛАСС", font=font(17, True), fill=ACCENT)

    if kind == "open":
        draw.text((126, 326), "Возможности сайта", font=font(76, True), fill=WHITE)
        draw.text((126, 421), "для учителя и ученика", font=font(76, True), fill=ACCENT)
        draw.text((132, 540), "Короткая экскурсия по реальному интерфейсу — без постановочных макетов.",
                  font=font(27), fill=MUTED)
        chips = ["ОДИН HTML-ФАЙЛ", "БЕЗ РЕГИСТРАЦИИ", "РАБОТАЕТ ОФЛАЙН"]
    else:
        draw.text((126, 310), "Один файл. Полный курс.", font=font(73, True), fill=WHITE)
        draw.text((126, 402), "Готовый урок.", font=font(73, True), fill=ACCENT)
        draw.text((132, 523), "Откройте СтатПрактикум и начните работать с данными.",
                  font=font(30), fill=MUTED)
        chips = ["19 ТЕМ", "610 ЗАДАНИЙ", "18 ЛАБОРАТОРИЙ", "3 ЯЗЫКА"]

    chip_x = 126
    for chip in chips:
        tw = int(draw.textlength(chip, font=font(18, True))) + 52
        draw.rounded_rectangle((chip_x, 625, chip_x + tw, 677), radius=26,
                               fill=(31, 79, 84, 235), outline=(67, 172, 146, 170), width=2)
        draw.text((chip_x + 26, 640), chip, font=font(18, True), fill=(218, 249, 239))
        chip_x += tw + 16

    if kind == "close":
        url = "projectaaj2025-sys.github.io/matstat/"
        draw.rounded_rectangle((126, 774, 1060, 864), radius=20, fill=ACCENT)
        draw.text((169, 801), url, font=font(28, True), fill=NAVY)
        draw.text((126, 926), "СтатПрактикум 4.0 · автономный учебный сайт",
                  font=font(20), fill=(155, 190, 195))
    else:
        draw.text((126, 822), "ТЕОРИЯ  →  ПРАКТИКА  →  ЭКСПЕРИМЕНТ  →  ВЫВОД",
                  font=font(23, True), fill=(164, 207, 204))
    return bg.convert("RGB")


def compose(seg: Segment, index: int) -> Path:
    src_path = SCREENS / f"{seg.image}.png"
    if not src_path.exists():
        raise FileNotFoundError(src_path)
    source = Image.open(src_path).convert("RGB")
    if seg.chrome:
        chrome = Image.open(SCREENS / f"{seg.chrome}.png").convert("RGB")
        source = add_fixed_chrome(source, chrome)
    if seg.title_card:
        canvas = title_card(source, seg.title_card)
    else:
        canvas = fit_cover(source, (WIDTH, HEIGHT)).convert("RGBA")
        # A subtle vignette makes the captions feel integrated while leaving the
        # application itself crisp and recognisable.
        shade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shade, "RGBA")
        for step in range(12):
            alpha = int(4 + step * 1.8)
            sd.rectangle((step, step, WIDTH - step - 1, HEIGHT - step - 1), outline=(5, 25, 32, alpha), width=18)
        canvas = Image.alpha_composite(canvas, shade)
        if seg.cursor:
            draw_cursor(canvas, *seg.cursor)
        canvas = add_caption(canvas, seg).convert("RGB")
    out = RENDER / f"scene-{index:02d}.png"
    canvas.save(out, optimize=True)
    return out


def run(command: list[str]) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> None:
    if not SCREENS.exists():
        raise SystemExit("Run promo/capture_screens.mjs first.")
    if RENDER.exists():
        shutil.rmtree(RENDER)
    RENDER.mkdir(parents=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    segment_files: list[Path] = []

    for i, seg in enumerate(SEGMENTS):
        still = compose(seg, i)
        video = RENDER / f"segment-{i:02d}.mp4"
        direction = i % 2
        duration = seg.duration
        max_x = 80
        x_expr = f"{max_x}*(t/{duration:.3f})" if direction == 0 else f"{max_x}*(1-t/{duration:.3f})"
        fade_out = max(0.0, duration - .28)
        vf = (
            "scale=2000:1125:flags=lanczos,"
            f"crop={WIDTH}:{HEIGHT}:x='{x_expr}':y='22+10*sin(t*0.7)',"
            f"fade=t=in:st=0:d=0.28:color=0x0c2731,"
            f"fade=t=out:st={fade_out:.3f}:d=0.28:color=0x0c2731,"
            f"fps={FPS},format=yuv420p"
        )
        run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-loop", "1", "-framerate", str(FPS), "-i", str(still),
            "-t", f"{duration:.3f}", "-vf", vf,
            "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-an", str(video),
        ])
        segment_files.append(video)
        print(f"Rendered {i + 1}/{len(SEGMENTS)}")

    concat = RENDER / "concat.txt"
    concat.write_text("\n".join(f"file '{p.name}'" for p in segment_files) + "\n", encoding="utf-8")
    video_only = RENDER / "video-only.mp4"
    run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat),
        "-c", "copy", str(video_only),
    ])
    # A silent AAC track improves compatibility with social/video players that
    # expect an audio stream, while the tour remains intentionally text-led.
    run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(video_only),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart", str(OUTPUT),
    ])

    # The opening composition doubles as a cover image.
    opening = Image.open(RENDER / "scene-00.png").convert("RGB")
    opening.save(COVER, quality=91, optimize=True)
    total = sum(s.duration for s in SEGMENTS)
    print(f"Created {OUTPUT} ({total:.1f} s)")


if __name__ == "__main__":
    main()
