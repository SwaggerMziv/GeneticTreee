# -*- coding: utf-8 -*-
"""Генератор PDF для семейной книги с поддержкой кириллицы и красивым дизайном"""

import os
import re
import logging
from io import BytesIO
from typing import List, Dict, Any, Optional
from datetime import date
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether, Flowable
)
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Line, Circle, Rect
from reportlab.graphics import renderPDF

from src.book.schemas import BookStyle, BookTheme

logger = logging.getLogger(__name__)

# Regex for photo markers: [PHOTO:relative_id:story_key:media_index]
PHOTO_MARKER_RE = re.compile(r'\[PHOTO:(\d+):([^:]+):(\d+)\]')


class TreeBranchLine(Flowable):
    """Декоративная линия-ветка для семейного древа"""
    def __init__(self, width, color, style='solid'):
        Flowable.__init__(self)
        self.width = width
        self.color = color
        self.style = style
        self.height = 20

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(2)
        if self.style == 'dashed':
            self.canv.setDash(6, 3)
        self.canv.line(0, 10, self.width, 10)
        # Листик на конце
        self.canv.setFillColor(self.color)
        self.canv.circle(self.width - 5, 10, 4, fill=1)


class DecorativeHeader(Flowable):
    """Декоративный заголовок с орнаментом"""
    def __init__(self, width, color, style_type='classic'):
        Flowable.__init__(self)
        self.width = width
        self.color = color
        self.style_type = style_type
        self.height = 30

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setFillColor(self.color)

        center = self.width / 2

        if self.style_type == 'classic':
            # Классический орнамент - линии с ромбами
            self.canv.setLineWidth(1.5)
            self.canv.line(center - 150, 15, center - 30, 15)
            self.canv.line(center + 30, 15, center + 150, 15)
            # Центральный ромб
            self.canv.saveState()
            self.canv.translate(center, 15)
            self.canv.rotate(45)
            self.canv.rect(-8, -8, 16, 16, fill=1)
            self.canv.restoreState()
            # Маленькие кружки
            self.canv.circle(center - 25, 15, 3, fill=1)
            self.canv.circle(center + 25, 15, 3, fill=1)

        elif self.style_type == 'modern':
            # Современный стиль - геометрические линии
            self.canv.setLineWidth(3)
            self.canv.line(center - 100, 15, center - 10, 15)
            self.canv.line(center + 10, 15, center + 100, 15)
            self.canv.rect(center - 8, 7, 16, 16, fill=1)

        elif self.style_type == 'vintage':
            # Винтажный стиль - завитки
            self.canv.setLineWidth(1)
            # Центральный цветок
            for i in range(8):
                angle = i * 45
                self.canv.saveState()
                self.canv.translate(center, 15)
                self.canv.rotate(angle)
                self.canv.ellipse(-3, 5, 3, 12, fill=1)
                self.canv.restoreState()
            self.canv.circle(center, 15, 5, fill=1)
            # Боковые линии с завитками
            self.canv.line(center - 120, 15, center - 25, 15)
            self.canv.line(center + 25, 15, center + 120, 15)


class RelativeCard(Flowable):
    """Карточка родственника для семейного древа"""
    def __init__(self, name, dates, gender, color_scheme, photo_url=None, bold_font="Helvetica-Bold", regular_font="Helvetica"):
        Flowable.__init__(self)
        self.name = name
        self.dates = dates
        self.gender = gender
        self.color_scheme = color_scheme
        self.photo_url = photo_url
        self.bold_font = bold_font
        self.regular_font = regular_font
        self.width = 180
        self.height = 70

    def draw(self):
        # Фон карточки — берём из конфига для поддержки тёмной темы
        if self.gender == 'male':
            bg_color = self.color_scheme.get("card_male_bg", HexColor("#E3F2FD"))
            border_color = self.color_scheme.get("card_male_border", HexColor("#1976D2"))
            icon = "M"
        elif self.gender == 'female':
            bg_color = self.color_scheme.get("card_female_bg", HexColor("#FCE4EC"))
            border_color = self.color_scheme.get("card_female_border", HexColor("#C2185B"))
            icon = "F"
        else:
            bg_color = self.color_scheme.get("card_other_bg", HexColor("#F5F5F5"))
            border_color = self.color_scheme["secondary"]
            icon = "?"

        # Рисуем карточку
        self.canv.setFillColor(bg_color)
        self.canv.setStrokeColor(border_color)
        self.canv.setLineWidth(2)
        self.canv.roundRect(0, 0, self.width, self.height, 10, fill=1, stroke=1)

        # Пытаемся загрузить и отобразить фото
        photo_drawn = False
        if self.photo_url:
            try:
                import httpx
                from reportlab.lib.utils import ImageReader

                response = httpx.get(self.photo_url, timeout=5, follow_redirects=True)
                if response.status_code == 200:
                    img = ImageReader(BytesIO(response.content))
                    # Фото в круглой области слева
                    self.canv.saveState()
                    # Создаем круглую маску через clip
                    path = self.canv.beginPath()
                    path.circle(25, self.height - 25, 15)
                    self.canv.clipPath(path, stroke=0)
                    # Рисуем изображение (немного больше чтобы заполнить круг)
                    self.canv.drawImage(img, 10, self.height - 40, width=30, height=30, mask='auto')
                    self.canv.restoreState()
                    # Рисуем границу круга
                    self.canv.setStrokeColor(border_color)
                    self.canv.setLineWidth(2)
                    self.canv.circle(25, self.height - 25, 15, fill=0, stroke=1)
                    photo_drawn = True
            except Exception:
                pass  # Fallback на иконку если фото недоступно

        if not photo_drawn:
            # Иконка пола (если фото не загружено)
            self.canv.setFillColor(border_color)
            self.canv.circle(25, self.height - 25, 15, fill=1)
            self.canv.setFillColor(white)
            self.canv.setFont(self.bold_font, 14)
            self.canv.drawCentredString(25, self.height - 30, icon)

        # Имя
        self.canv.setFillColor(self.color_scheme["text"])
        self.canv.setFont(self.bold_font, 11)
        # Обрезаем имя если слишком длинное
        display_name = self.name[:20] + "..." if len(self.name) > 20 else self.name
        self.canv.drawString(50, self.height - 25, display_name)

        # Даты
        self.canv.setFont(self.regular_font, 9)
        self.canv.setFillColor(self.color_scheme["secondary"])
        self.canv.drawString(50, self.height - 45, self.dates)


class InlinePhoto(Flowable):
    """Фотография, встроенная в текст главы — центрированная с тенью и подписью"""
    def __init__(self, image_data, caption="", max_width=14*cm, border_width=0,
                 border_color=None, caption_style="italic", base_font="DejaVuSans",
                 shadow=True, bg_color=None, caption_color=None, page_width=17*cm):
        Flowable.__init__(self)
        self.image_data = image_data
        self.caption = caption
        self.max_width = max_width
        self.border_width = border_width
        self.border_color = border_color or HexColor("#CCCCCC")
        self.caption_style = caption_style
        self.base_font = base_font
        self.shadow = shadow
        self.bg_color = bg_color
        self.caption_color = caption_color or HexColor("#666666")
        self.page_width = page_width

        # Calculate dimensions
        from reportlab.lib.utils import ImageReader
        try:
            img_reader = ImageReader(BytesIO(image_data))
            iw, ih = img_reader.getSize()
            aspect = ih / iw
            self.img_width = min(max_width, iw)
            self.img_height = self.img_width * aspect
            # Cap height
            if self.img_height > 14 * cm:
                self.img_height = 14 * cm
                self.img_width = self.img_height / aspect
            # Total dimensions — use full page width for centering
            self.width = self.page_width
            padding = 12
            caption_height = 22 if caption else 0
            shadow_pad = 6 if shadow else 0
            self.height = self.img_height + padding * 2 + caption_height + shadow_pad
            self.valid = True
        except Exception:
            self.width = 0
            self.height = 0
            self.valid = False

    def draw(self):
        if not self.valid:
            return

        from reportlab.lib.utils import ImageReader

        padding = 12
        shadow_pad = 6 if self.shadow else 0

        # Center the image frame on the page
        frame_width = self.img_width + padding * 2
        frame_height = self.img_height + padding * 2
        x_frame = (self.width - frame_width) / 2
        y_caption = 22 if self.caption else 0
        y_frame = y_caption + shadow_pad

        # Shadow
        if self.shadow:
            self.canv.setFillColor(HexColor("#00000020"))
            self.canv.roundRect(
                x_frame + 3, y_frame - 3,
                frame_width, frame_height,
                6, fill=1, stroke=0
            )

        # Background frame
        if self.bg_color:
            self.canv.setFillColor(self.bg_color)
        else:
            self.canv.setFillColor(white)
        self.canv.setStrokeColor(self.border_color)
        self.canv.setLineWidth(max(self.border_width, 0.5))
        self.canv.roundRect(
            x_frame, y_frame,
            frame_width, frame_height,
            6, fill=1, stroke=1
        )

        # Image
        img_reader = ImageReader(BytesIO(self.image_data))
        self.canv.drawImage(
            img_reader,
            x_frame + padding,
            y_frame + padding,
            width=self.img_width, height=self.img_height,
            mask='auto'
        )

        # Caption
        if self.caption:
            self.canv.setFillColor(self.caption_color)
            font_size = 9
            try:
                self.canv.setFont(self.base_font, font_size)
            except Exception:
                self.canv.setFont("Helvetica", font_size)
            display_caption = self.caption[:80] + "..." if len(self.caption) > 80 else self.caption
            self.canv.drawCentredString(self.width / 2, 5, display_caption)


class PDFBookGenerator:
    """Генератор PDF книги о семейной истории с поддержкой кириллицы"""

    # Light theme configs per style
    STYLE_CONFIGS_LIGHT = {
        BookStyle.CLASSIC: {
            "primary": HexColor("#2C3E50"),
            "secondary": HexColor("#7F8C8D"),
            "accent": HexColor("#8E44AD"),
            "text": HexColor("#2C3E50"),
            "background": HexColor("#FDFEFE"),
            "page_bg": None,  # None = white (default)
            "header_bg": HexColor("#F8F9FA"),
            "border": HexColor("#BDC3C7"),
            "photo_frame_bg": white,
            "photo_shadow": True,
            "photo_caption_color": HexColor("#666666"),
            "title_font_size": 36,
            "heading_font_size": 20,
            "body_font_size": 11,
            "ornament_style": "classic",
            "body_first_indent": 25,
            "body_alignment": TA_JUSTIFY,
            "photo_border_width": 1,
            "photo_border_color": HexColor("#BDC3C7"),
            "photo_max_width": 14 * cm,
            "chapter_spacing": 0.5 * cm,
            "card_male_bg": HexColor("#E3F2FD"),
            "card_male_border": HexColor("#1976D2"),
            "card_female_bg": HexColor("#FCE4EC"),
            "card_female_border": HexColor("#C2185B"),
            "card_other_bg": HexColor("#F5F5F5"),
            "gen_title_color": white,
        },
        BookStyle.MODERN: {
            "primary": HexColor("#1A1A2E"),
            "secondary": HexColor("#4A4A6A"),
            "accent": HexColor("#E94560"),
            "text": HexColor("#1A1A2E"),
            "background": HexColor("#FFFFFF"),
            "page_bg": None,
            "header_bg": HexColor("#F0F0F5"),
            "border": HexColor("#CCCCDD"),
            "photo_frame_bg": white,
            "photo_shadow": True,
            "photo_caption_color": HexColor("#666666"),
            "title_font_size": 40,
            "heading_font_size": 22,
            "body_font_size": 11,
            "ornament_style": "modern",
            "body_first_indent": 0,
            "body_alignment": TA_LEFT,
            "photo_border_width": 0,
            "photo_border_color": HexColor("#CCCCDD"),
            "photo_max_width": 14 * cm,
            "chapter_spacing": 1 * cm,
            "card_male_bg": HexColor("#E3F2FD"),
            "card_male_border": HexColor("#1976D2"),
            "card_female_bg": HexColor("#FCE4EC"),
            "card_female_border": HexColor("#C2185B"),
            "card_other_bg": HexColor("#F5F5F5"),
            "gen_title_color": white,
        },
        BookStyle.VINTAGE: {
            "primary": HexColor("#5D4037"),
            "secondary": HexColor("#8D6E63"),
            "accent": HexColor("#A1887F"),
            "text": HexColor("#3E2723"),
            "background": HexColor("#FFF8E1"),
            "page_bg": HexColor("#FFF8E1"),
            "header_bg": HexColor("#FFECB3"),
            "border": HexColor("#BCAAA4"),
            "photo_frame_bg": HexColor("#FFF8E1"),
            "photo_shadow": True,
            "photo_caption_color": HexColor("#5D4037"),
            "title_font_size": 32,
            "heading_font_size": 18,
            "body_font_size": 11,
            "ornament_style": "vintage",
            "body_first_indent": 30,
            "body_alignment": TA_JUSTIFY,
            "photo_border_width": 2,
            "photo_border_color": HexColor("#8D6E63"),
            "photo_max_width": 13 * cm,
            "chapter_spacing": 0.5 * cm,
            "card_male_bg": HexColor("#E3F2FD"),
            "card_male_border": HexColor("#1976D2"),
            "card_female_bg": HexColor("#FCE4EC"),
            "card_female_border": HexColor("#C2185B"),
            "card_other_bg": HexColor("#F5F5F5"),
            "gen_title_color": white,
        },
        BookStyle.CUSTOM: {
            "primary": HexColor("#2C3E50"),
            "secondary": HexColor("#7F8C8D"),
            "accent": HexColor("#8E44AD"),
            "text": HexColor("#2C3E50"),
            "background": HexColor("#FDFEFE"),
            "page_bg": None,
            "header_bg": HexColor("#F8F9FA"),
            "border": HexColor("#BDC3C7"),
            "photo_frame_bg": white,
            "photo_shadow": True,
            "photo_caption_color": HexColor("#666666"),
            "title_font_size": 36,
            "heading_font_size": 20,
            "body_font_size": 11,
            "ornament_style": "classic",
            "body_first_indent": 25,
            "body_alignment": TA_JUSTIFY,
            "photo_border_width": 1,
            "photo_border_color": HexColor("#BDC3C7"),
            "photo_max_width": 14 * cm,
            "chapter_spacing": 0.5 * cm,
            "card_male_bg": HexColor("#E3F2FD"),
            "card_male_border": HexColor("#1976D2"),
            "card_female_bg": HexColor("#FCE4EC"),
            "card_female_border": HexColor("#C2185B"),
            "card_other_bg": HexColor("#F5F5F5"),
            "gen_title_color": white,
        },
    }

    # Dark theme overrides — merged on top of light config
    DARK_THEME_OVERRIDES = {
        BookStyle.CLASSIC: {
            "primary": HexColor("#E0E0E0"),
            "secondary": HexColor("#9E9E9E"),
            "accent": HexColor("#BB86FC"),
            "text": HexColor("#E0E0E0"),
            "background": HexColor("#1E1E2E"),
            "page_bg": HexColor("#1E1E2E"),
            "header_bg": HexColor("#2A2A3E"),
            "border": HexColor("#444466"),
            "photo_frame_bg": HexColor("#2A2A3E"),
            "photo_shadow": False,
            "photo_caption_color": HexColor("#9E9E9E"),
            "photo_border_color": HexColor("#444466"),
            "card_male_bg": HexColor("#1A2744"),
            "card_male_border": HexColor("#5C9CE6"),
            "card_female_bg": HexColor("#3D1A2E"),
            "card_female_border": HexColor("#E06090"),
            "card_other_bg": HexColor("#2A2A3E"),
            "gen_title_color": HexColor("#E0E0E0"),
        },
        BookStyle.MODERN: {
            "primary": HexColor("#E8E8F0"),
            "secondary": HexColor("#A0A0C0"),
            "accent": HexColor("#FF6B8A"),
            "text": HexColor("#E8E8F0"),
            "background": HexColor("#121220"),
            "page_bg": HexColor("#121220"),
            "header_bg": HexColor("#1C1C30"),
            "border": HexColor("#333355"),
            "photo_frame_bg": HexColor("#1C1C30"),
            "photo_shadow": False,
            "photo_caption_color": HexColor("#A0A0C0"),
            "photo_border_color": HexColor("#333355"),
            "card_male_bg": HexColor("#1A2744"),
            "card_male_border": HexColor("#5C9CE6"),
            "card_female_bg": HexColor("#3D1A2E"),
            "card_female_border": HexColor("#E06090"),
            "card_other_bg": HexColor("#1C1C30"),
            "gen_title_color": HexColor("#E8E8F0"),
        },
        BookStyle.VINTAGE: {
            "primary": HexColor("#D7CCC8"),
            "secondary": HexColor("#A1887F"),
            "accent": HexColor("#BCAAA4"),
            "text": HexColor("#D7CCC8"),
            "background": HexColor("#2C2418"),
            "page_bg": HexColor("#2C2418"),
            "header_bg": HexColor("#3E3428"),
            "border": HexColor("#5D4037"),
            "photo_frame_bg": HexColor("#3E3428"),
            "photo_shadow": False,
            "photo_caption_color": HexColor("#A1887F"),
            "photo_border_color": HexColor("#5D4037"),
            "card_male_bg": HexColor("#1A2744"),
            "card_male_border": HexColor("#5C9CE6"),
            "card_female_bg": HexColor("#3D1A2E"),
            "card_female_border": HexColor("#E06090"),
            "card_other_bg": HexColor("#3E3428"),
            "gen_title_color": HexColor("#D7CCC8"),
        },
        BookStyle.CUSTOM: {
            "primary": HexColor("#E0E0E0"),
            "secondary": HexColor("#9E9E9E"),
            "accent": HexColor("#BB86FC"),
            "text": HexColor("#E0E0E0"),
            "background": HexColor("#1E1E2E"),
            "page_bg": HexColor("#1E1E2E"),
            "header_bg": HexColor("#2A2A3E"),
            "border": HexColor("#444466"),
            "photo_frame_bg": HexColor("#2A2A3E"),
            "photo_shadow": False,
            "photo_caption_color": HexColor("#9E9E9E"),
            "photo_border_color": HexColor("#444466"),
            "card_male_bg": HexColor("#1A2744"),
            "card_male_border": HexColor("#5C9CE6"),
            "card_female_bg": HexColor("#3D1A2E"),
            "card_female_border": HexColor("#E06090"),
            "card_other_bg": HexColor("#2A2A3E"),
            "gen_title_color": HexColor("#E0E0E0"),
        },
    }

    def __init__(self, style: BookStyle = BookStyle.CLASSIC, theme: BookTheme = BookTheme.LIGHT):
        self.style = style
        self.theme = theme
        # Build config: start with light, overlay dark if needed
        self.config = dict(self.STYLE_CONFIGS_LIGHT[style])
        if theme == BookTheme.DARK:
            self.config.update(self.DARK_THEME_OVERRIDES.get(style, {}))
        self._register_fonts()
        self.styles = self._create_styles()
        self.story_photos: Optional[Dict[str, str]] = None

    def _prepare_text(self, text: str) -> str:
        """Подготовка текста для корректного отображения в PDF"""
        if not text:
            return ""
        # Убеждаемся, что текст в UTF-8
        if isinstance(text, bytes):
            text = text.decode('utf-8', errors='replace')
        # Убираем невидимые символы и нормализуем пробелы
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        # Заменяем проблемные символы
        text = text.replace('\u200b', '')  # Zero-width space
        text = text.replace('\ufeff', '')  # BOM
        return text.strip()

    def _register_fonts(self):
        """Регистрация шрифтов с поддержкой кириллицы"""
        import platform

        registered_fonts = {}

        # Проверяем, какие шрифты уже зарегистрированы
        def is_font_registered(font_name):
            try:
                pdfmetrics.getFont(font_name)
                return True
            except:
                return False

        # Определяем систему
        system = platform.system()
        windows_fonts_dir = "C:/Windows/Fonts/"

        # Список шрифтов для поиска (в порядке приоритета)
        font_candidates = []

        # Локальные папки для шрифтов (приоритет выше системных)
        local_fonts_dir = os.path.join(os.path.dirname(__file__), "fonts/")
        backend_fonts_dir = os.path.join(os.path.dirname(__file__), "../../../fonts/")

        if system == "Windows":
            # Сначала проверяем локальные папки проекта (DejaVu)
            dejavu_files = {
                "DejaVuSans": "DejaVuSans.ttf",
                "DejaVuSans-Bold": "DejaVuSans-Bold.ttf",
            }
            for font_name, font_file in dejavu_files.items():
                font_candidates.append((font_name, font_file, local_fonts_dir))
                font_candidates.append((font_name, font_file, backend_fonts_dir))

            # Затем системные Windows шрифты с поддержкой кириллицы
            font_candidates.extend([
                ("DejaVuSans", "arial.ttf", windows_fonts_dir),
                ("DejaVuSans-Bold", "arialbd.ttf", windows_fonts_dir),
                ("DejaVuSans", "calibri.ttf", windows_fonts_dir),
                ("DejaVuSans-Bold", "calibrib.ttf", windows_fonts_dir),
                ("DejaVuSans", "times.ttf", windows_fonts_dir),
                ("DejaVuSans-Bold", "timesbd.ttf", windows_fonts_dir),
            ])
        else:
            # Linux/Mac - ищем DejaVu
            possible_paths = [
                "/usr/share/fonts/truetype/dejavu/",
                "/usr/share/fonts/dejavu/",
                "/usr/share/fonts/TTF/",
                os.path.join(os.path.dirname(__file__), "fonts/"),
                os.path.join(os.path.dirname(__file__), "../../../fonts/"),
            ]

            dejavu_files = {
                "DejaVuSans": "DejaVuSans.ttf",
                "DejaVuSans-Bold": "DejaVuSans-Bold.ttf",
            }

            for font_name, font_file in dejavu_files.items():
                for path in possible_paths:
                    font_candidates.append((font_name, font_file, path))

        # Регистрируем шрифты
        for font_name, font_file, base_path in font_candidates:
            if font_name in registered_fonts:
                continue

            if is_font_registered(font_name):
                registered_fonts[font_name] = True
                logger.info(f"Шрифт {font_name} уже зарегистрирован")
                continue

            font_path = os.path.join(base_path, font_file)
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                    registered_fonts[font_name] = True
                    logger.info(f"Успешно зарегистрирован шрифт {font_name} из {font_path}")
                except Exception as e:
                    logger.warning(f"Не удалось зарегистрировать {font_name} из {font_path}: {e}")
                    continue

        # Если не нашли шрифты, пробуем зарегистрировать любые доступные Windows шрифты
        if not registered_fonts and system == "Windows":
            windows_fonts = [
                ("DejaVuSans", "arial.ttf"),
                ("DejaVuSans-Bold", "arialbd.ttf"),
                ("DejaVuSans", "calibri.ttf"),
                ("DejaVuSans-Bold", "calibrib.ttf"),
                ("DejaVuSans", "tahoma.ttf"),
                ("DejaVuSans-Bold", "tahomabd.ttf"),
            ]

            for font_name, font_file in windows_fonts:
                if font_name in registered_fonts:
                    continue
                font_path = os.path.join(windows_fonts_dir, font_file)
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont(font_name, font_path))
                        registered_fonts[font_name] = True
                        logger.info(f"Зарегистрирован {font_name} из {font_path}")
                        break
                    except Exception as e:
                        logger.warning(f"Ошибка регистрации {font_name}: {e}")

        # Устанавливаем доступные шрифты
        if registered_fonts.get("DejaVuSans"):
            self.base_font = "DejaVuSans"
            self.bold_font = "DejaVuSans-Bold" if registered_fonts.get("DejaVuSans-Bold") else "DejaVuSans"
        else:
            logger.warning("Кириллические шрифты не найдены! Используется Times-Roman (может не поддерживать все символы)")
            self.base_font = "Times-Roman"
            self.bold_font = "Times-Bold"

        self.fonts_available = bool(registered_fonts)

        logger.info(f"Итоговые шрифты: base_font={self.base_font}, bold_font={self.bold_font}, fonts_available={self.fonts_available}")

    def _create_styles(self) -> Dict[str, ParagraphStyle]:
        """Создание стилей с кириллическими шрифтами"""
        base_font = self.base_font
        bold_font = self.bold_font

        return {
            "title": ParagraphStyle(
                "BookTitle",
                fontName=bold_font,
                fontSize=self.config["title_font_size"],
                textColor=self.config["primary"],
                alignment=TA_CENTER,
                spaceAfter=20,
                spaceBefore=40,
                leading=self.config["title_font_size"] * 1.3,
            ),
            "subtitle": ParagraphStyle(
                "BookSubtitle",
                fontName=base_font,
                fontSize=16,
                textColor=self.config["secondary"],
                alignment=TA_CENTER,
                spaceAfter=40,
            ),
            "chapter_title": ParagraphStyle(
                "ChapterTitle",
                fontName=bold_font,
                fontSize=self.config["heading_font_size"],
                textColor=self.config["primary"],
                alignment=TA_LEFT,
                spaceBefore=30,
                spaceAfter=20,
                leading=self.config["heading_font_size"] * 1.4,
                borderPadding=10,
            ),
            "section_title": ParagraphStyle(
                "SectionTitle",
                fontName=bold_font,
                fontSize=14,
                textColor=self.config["accent"],
                alignment=TA_LEFT,
                spaceBefore=20,
                spaceAfter=12,
                leading=18,
            ),
            "body": ParagraphStyle(
                "BookBody",
                fontName=base_font,
                fontSize=self.config["body_font_size"],
                textColor=self.config["text"],
                alignment=self.config.get("body_alignment", TA_JUSTIFY),
                spaceBefore=6,
                spaceAfter=8,
                leading=self.config["body_font_size"] * 1.6,
                firstLineIndent=self.config.get("body_first_indent", 25),
            ),
            "intro": ParagraphStyle(
                "Introduction",
                fontName=base_font,
                fontSize=12,
                textColor=self.config["text"],
                alignment=TA_JUSTIFY,
                spaceBefore=10,
                spaceAfter=12,
                leading=20,
                leftIndent=20,
                rightIndent=20,
            ),
            "toc_entry": ParagraphStyle(
                "TOCEntry",
                fontName=base_font,
                fontSize=12,
                textColor=self.config["text"],
                alignment=TA_LEFT,
                spaceBefore=10,
                spaceAfter=10,
                leftIndent=20,
            ),
            "toc_chapter": ParagraphStyle(
                "TOCChapter",
                fontName=bold_font,
                fontSize=12,
                textColor=self.config["primary"],
                alignment=TA_LEFT,
                spaceBefore=8,
                spaceAfter=8,
                leftIndent=30,
            ),
            "timeline_year": ParagraphStyle(
                "TimelineYear",
                fontName=bold_font,
                fontSize=14,
                textColor=self.config["accent"],
                alignment=TA_LEFT,
                spaceBefore=12,
            ),
            "timeline_event": ParagraphStyle(
                "TimelineEvent",
                fontName=base_font,
                fontSize=11,
                textColor=self.config["text"],
                alignment=TA_LEFT,
                leftIndent=40,
                spaceAfter=8,
                leading=16,
            ),
            "generation_title": ParagraphStyle(
                "GenerationTitle",
                fontName=bold_font,
                fontSize=14,
                textColor=self.config.get("gen_title_color", white),
                alignment=TA_CENTER,
                spaceBefore=15,
                spaceAfter=15,
            ),
            "relative_name": ParagraphStyle(
                "RelativeName",
                fontName=bold_font,
                fontSize=12,
                textColor=self.config["primary"],
            ),
            "relative_info": ParagraphStyle(
                "RelativeInfo",
                fontName=base_font,
                fontSize=10,
                textColor=self.config["secondary"],
                leftIndent=15,
            ),
            "quote": ParagraphStyle(
                "Quote",
                fontName=base_font,
                fontSize=11,
                textColor=self.config["secondary"],
                alignment=TA_CENTER,
                leftIndent=40,
                rightIndent=40,
                spaceBefore=20,
                spaceAfter=20,
                leading=18,
            ),
            "footer": ParagraphStyle(
                "Footer",
                fontName=base_font,
                fontSize=9,
                textColor=self.config["secondary"],
                alignment=TA_CENTER,
            ),
        }

    def generate(
        self,
        title: str,
        introduction: str,
        chapters: List[Dict[str, str]],
        conclusion: str,
        timeline: Optional[List[Dict]] = None,
        relatives: Optional[List] = None,
        relationships: Optional[List] = None,
        relative_photos: Optional[Dict[int, str]] = None,
        story_photos: Optional[Dict[str, str]] = None,
    ) -> bytes:
        """Генерация PDF книги"""
        self.story_photos = story_photos
        self.used_photo_keys = set()  # Отслеживание вставленных фото (без повторов)

        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        story = []

        # 1. Титульная страница
        story.extend(self._create_title_page(title))

        # 2. Оглавление
        story.extend(self._create_table_of_contents(chapters, timeline is not None, relatives is not None))

        # 3. Введение
        story.extend(self._create_introduction(introduction))

        # 4. Семейное древо
        if relatives:
            story.extend(self._create_family_tree_section(relatives, relationships, relative_photos))

        # 5. Хронология
        if timeline:
            story.extend(self._create_timeline_section(timeline))

        # 6. Главы
        for i, chapter in enumerate(chapters, 1):
            story.extend(self._create_chapter(
                i, chapter["title"], chapter["content"],
                fallback_photo_keys=chapter.get("photo_keys"),
            ))

        # 7. Заключение
        story.extend(self._create_conclusion(conclusion))

        # 8. Финальная страница
        story.extend(self._create_final_page())

        # Page background callback for dark theme
        page_bg = self.config.get("page_bg")
        if page_bg:
            def on_page(canvas, doc_obj):
                canvas.saveState()
                canvas.setFillColor(page_bg)
                canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
                canvas.restoreState()
            doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
        else:
            doc.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _create_title_page(self, title: str) -> List:
        """Создание титульной страницы"""
        elements = []

        # Верхний отступ
        elements.append(Spacer(1, 4 * cm))

        # Верхний декоративный элемент
        elements.append(DecorativeHeader(450, self.config["accent"], self.config["ornament_style"]))
        elements.append(Spacer(1, 1.5 * cm))

        # Заголовок книги
        elements.append(Paragraph(self._prepare_text(title), self.styles["title"]))

        # Подзаголовок в зависимости от стиля
        subtitles = {
            BookStyle.CLASSIC: "История нашего рода",
            BookStyle.MODERN: "Семейная хроника",
            BookStyle.VINTAGE: "Летопись семьи",
            BookStyle.CUSTOM: "История нашего рода",
        }
        elements.append(Paragraph(self._prepare_text(subtitles[self.style]), self.styles["subtitle"]))

        # Нижний декоративный элемент
        elements.append(Spacer(1, 1 * cm))
        elements.append(DecorativeHeader(450, self.config["accent"], self.config["ornament_style"]))

        # Дерево/орнамент в центре
        elements.append(Spacer(1, 2 * cm))
        elements.append(self._create_tree_icon())

        # Дата создания внизу
        elements.append(Spacer(1, 3 * cm))
        today = date.today().strftime("%d.%m.%Y")
        elements.append(Paragraph(self._prepare_text(f"Создано {today}"), self.styles["footer"]))

        elements.append(PageBreak())
        return elements

    def _create_tree_icon(self) -> Flowable:
        """Создание иконки дерева"""
        class TreeIcon(Flowable):
            def __init__(self, color):
                Flowable.__init__(self)
                self.color = color
                self.width = 100
                self.height = 100

            def draw(self):
                center_x = self.width / 2
                self.canv.setFillColor(self.color)
                self.canv.setStrokeColor(self.color)

                # Ствол
                self.canv.setLineWidth(8)
                self.canv.line(center_x, 0, center_x, 40)

                # Крона (круги)
                self.canv.circle(center_x, 60, 25, fill=1)
                self.canv.circle(center_x - 20, 50, 18, fill=1)
                self.canv.circle(center_x + 20, 50, 18, fill=1)
                self.canv.circle(center_x - 10, 75, 15, fill=1)
                self.canv.circle(center_x + 10, 75, 15, fill=1)

        return TreeIcon(self.config["accent"])

    def _create_table_of_contents(self, chapters: List[Dict], has_timeline: bool, has_tree: bool) -> List:
        """Создание оглавления"""
        elements = []

        elements.append(Paragraph(self._prepare_text("Содержание"), self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Пункты оглавления с номерами страниц (условные)
        toc_items = [
            ("Введение", "3"),
        ]

        if has_tree:
            toc_items.append(("Семейное древо", "4"))

        if has_timeline:
            toc_items.append(("Хронология событий", "5"))

        page_num = 6
        for i, chapter in enumerate(chapters, 1):
            toc_items.append((f"Глава {i}. {chapter['title']}", str(page_num)))
            page_num += 1

        toc_items.append(("Заключение", str(page_num)))

        # Создаём таблицу для оглавления
        toc_data = []
        for title, page in toc_items:
            dots = "." * (60 - len(title))
            toc_data.append([
                Paragraph(self._prepare_text(title), self.styles["toc_entry"]),
                Paragraph(self._prepare_text(dots), self.styles["toc_entry"]),
                Paragraph(self._prepare_text(page), self.styles["toc_entry"]),
            ])

        toc_table = Table(toc_data, colWidths=[300, 100, 50])
        toc_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ]))
        elements.append(toc_table)

        elements.append(PageBreak())
        return elements

    def _create_introduction(self, text: str) -> List:
        """Создание введения"""
        elements = []

        elements.append(Paragraph(self._prepare_text("Введение"), self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Эпиграф
        epigraphs = {
            BookStyle.CLASSIC: "«Семья — это не главное, это всё»",
            BookStyle.MODERN: "Family is not an important thing. It's everything.",
            BookStyle.VINTAGE: "«В семье и каша гуще»",
            BookStyle.CUSTOM: "«Семья — это не главное, это всё»",
        }
        elements.append(Paragraph(self._prepare_text(epigraphs[self.style]), self.styles["quote"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Текст введения
        paragraphs = text.split("\n\n") if "\n\n" in text else [text]
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(self._prepare_text(para.strip()), self.styles["intro"]))

        elements.append(PageBreak())
        return elements

    def _create_family_tree_section(self, relatives: List, relationships: Optional[List], relative_photos: Optional[Dict[int, str]] = None) -> List:
        """Создание раздела с семейным древом"""
        elements = []

        elements.append(Paragraph(self._prepare_text("Семейное древо"), self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Группируем по поколениям
        generations = {}
        for r in relatives:
            gen = r.generation if r.generation is not None else 0
            if gen not in generations:
                generations[gen] = []
            generations[gen].append(r)

        # Выводим по поколениям
        for gen in sorted(generations.keys()):
            gen_label = self._get_generation_label(gen)

            # Заголовок поколения в цветной рамке
            gen_header = self._create_generation_header(gen_label)
            elements.append(gen_header)
            elements.append(Spacer(1, 0.3 * cm))

            # Карточки родственников в этом поколении
            relatives_in_gen = generations[gen]

            # Создаём таблицу с карточками (по 2 в ряд)
            cards_data = []
            row = []
            for i, r in enumerate(relatives_in_gen):
                name = f"{r.first_name} {r.middle_name or ''} {r.last_name}".strip()
                birth = r.birth_date.strftime("%d.%m.%Y") if r.birth_date else "?"
                death = r.death_date.strftime("%d.%m.%Y") if r.death_date else None
                dates = f"{birth}" + (f" — {death}" if death else "")
                gender = r.gender.value if r.gender else "other"
                # Получаем фото из переданного словаря или из объекта
                photo_url = None
                if relative_photos and r.id in relative_photos:
                    photo_url = relative_photos[r.id]
                elif hasattr(r, 'image_url') and r.image_url:
                    photo_url = r.image_url

                card = RelativeCard(name, dates, gender, self.config, photo_url, self.bold_font, self.base_font)
                row.append(card)

                if len(row) == 2:
                    cards_data.append(row)
                    row = []

            if row:  # Добавляем оставшиеся карточки
                while len(row) < 2:
                    row.append(Spacer(180, 70))
                cards_data.append(row)

            if cards_data:
                cards_table = Table(cards_data, colWidths=[200, 200])
                cards_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('TOPPADDING', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ]))
                elements.append(cards_table)

            elements.append(Spacer(1, 0.5 * cm))

        elements.append(PageBreak())
        return elements

    def _create_generation_header(self, label: str) -> Table:
        """Создание заголовка поколения"""
        data = [[Paragraph(self._prepare_text(label), self.styles["generation_title"])]]
        table = Table(data, colWidths=[400])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.config["accent"]),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 20),
            ('RIGHTPADDING', (0, 0), (-1, -1), 20),
            ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ]))
        return table

    def _get_generation_label(self, gen: int) -> str:
        """Название поколения"""
        labels = {
            -4: "Прапрапрадеды",
            -3: "Прапрадеды",
            -2: "Прадеды",
            -1: "Деды и бабушки",
            0: "Родители",
            1: "Наше поколение",
            2: "Дети",
            3: "Внуки",
            4: "Правнуки",
        }
        return labels.get(gen, f"Поколение {gen}")

    def _create_timeline_section(self, timeline: List[Dict]) -> List:
        """Создание хронологии"""
        elements = []

        elements.append(Paragraph(self._prepare_text("Хронология событий"), self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        sorted_timeline = sorted(timeline, key=lambda x: x.get("year", 0))

        for event in sorted_timeline:
            year = event.get("year", "?")
            description = event.get("event", "")

            # Год с маркером
            year_text = f"● {year}"
            elements.append(Paragraph(self._prepare_text(year_text), self.styles["timeline_year"]))

            # Описание события
            elements.append(Paragraph(self._prepare_text(description), self.styles["timeline_event"]))

            # Соединительная линия
            elements.append(TreeBranchLine(100, self.config["border"], 'dashed'))

        elements.append(PageBreak())
        return elements

    def _download_image(self, url: str) -> Optional[bytes]:
        """Скачивание изображения по URL с обработкой ошибок"""
        try:
            import httpx
            logger.info(f"Скачивание изображения: {url[:100]}...")
            response = httpx.get(url, timeout=15, follow_redirects=True)
            if response.status_code == 200 and len(response.content) > 0:
                logger.info(f"Изображение скачано: {len(response.content)} байт")
                return response.content
            else:
                logger.warning(f"Ошибка скачивания изображения: status={response.status_code}, size={len(response.content)}, url={url[:100]}")
        except Exception as e:
            logger.error(f"Исключение при скачивании изображения {url[:100]}: {type(e).__name__}: {e}")
        return None

    def _create_inline_photo(self, photo_key: str, caption: str = "") -> Optional[Flowable]:
        """Создание встроенной фотографии из маркера"""
        if not self.story_photos:
            logger.warning(f"story_photos is None/empty, cannot create photo for key='{photo_key}'")
            return None
        if photo_key not in self.story_photos:
            logger.warning(f"photo_key='{photo_key}' not found in story_photos keys: {list(self.story_photos.keys())[:10]}")
            return None

        url = self.story_photos[photo_key]
        image_data = self._download_image(url)
        if not image_data:
            logger.warning(f"Не удалось скачать изображение для key='{photo_key}', url={url[:80]}")
            return None

        # Calculate available page width (A4 width minus margins)
        page_content_width = A4[0] - 4 * cm  # 2cm margin each side

        photo = InlinePhoto(
            image_data=image_data,
            caption=caption,
            max_width=self.config.get("photo_max_width", 14 * cm),
            border_width=self.config.get("photo_border_width", 0.5),
            border_color=self.config.get("photo_border_color", HexColor("#CCCCCC")),
            caption_style="italic",
            base_font=self.base_font,
            shadow=self.config.get("photo_shadow", True),
            bg_color=self.config.get("photo_frame_bg"),
            caption_color=self.config.get("photo_caption_color", HexColor("#666666")),
            page_width=page_content_width,
        )

        if photo.valid:
            logger.info(f"Фото создано успешно: key='{photo_key}', size={photo.img_width:.0f}x{photo.img_height:.0f}")
            return photo

        logger.warning(f"InlinePhoto невалидно для key='{photo_key}'")
        return None

    def _create_chapter(self, number: int, title: str, content: str,
                        fallback_photo_keys: Optional[List[str]] = None) -> List:
        """Создание главы с поддержкой встроенных фотографий"""
        elements = []

        chapter_title = f"Глава {number}. {title}"
        elements.append(Paragraph(self._prepare_text(chapter_title), self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, self.config.get("chapter_spacing", 0.5 * cm)))

        # Split content by photo markers
        markers_found = PHOTO_MARKER_RE.findall(content)
        parts = PHOTO_MARKER_RE.split(content)
        # parts structure: [text, rid, story_key, media_idx, text, rid, story_key, media_idx, ...]

        photos_inserted = 0

        logger.info(f"Глава {number}: найдено {len(markers_found)} маркеров фото в тексте AI")
        if markers_found:
            logger.info(f"Глава {number}: маркеры: {markers_found}")

        i = 0
        while i < len(parts):
            if i % 4 == 0:
                # Text segment
                text_segment = parts[i]
                paragraphs = text_segment.split("\n\n") if "\n\n" in text_segment else text_segment.split("\n")
                for para in paragraphs:
                    clean_para = para.strip()
                    if clean_para:
                        # Очищаем от markdown
                        clean_para = clean_para.replace("**", "")
                        clean_para = clean_para.replace("*", "")
                        clean_para = clean_para.replace("#", "")
                        elements.append(Paragraph(self._prepare_text(clean_para), self.styles["body"]))
            elif i % 4 == 1:
                # Photo marker group: rid at i, story_key at i+1, media_idx at i+2
                if i + 2 < len(parts):
                    rid = parts[i]
                    story_key = parts[i + 1]
                    media_idx = parts[i + 2]
                    photo_key = f"{rid}:{story_key}:{media_idx}"

                    logger.info(f"Глава {number}: обработка маркера фото key='{photo_key}'")

                    # Skip duplicates across chapters
                    if photo_key in self.used_photo_keys:
                        logger.info(f"Глава {number}: пропуск дубликата фото key='{photo_key}'")
                        i += 1
                        continue

                    # Build caption
                    caption = ""
                    if self.story_photos and photo_key in self.story_photos:
                        if story_key == "profile":
                            caption = ""
                        else:
                            caption = story_key.replace("_", " ").title()
                    else:
                        logger.warning(f"Глава {number}: ключ '{photo_key}' НЕ найден в story_photos (доступно: {list(self.story_photos.keys()) if self.story_photos else 'None'})")

                    photo_flowable = self._create_inline_photo(photo_key, caption)
                    if photo_flowable:
                        elements.append(Spacer(1, 0.3 * cm))
                        elements.append(photo_flowable)
                        elements.append(Spacer(1, 0.3 * cm))
                        photos_inserted += 1
                        self.used_photo_keys.add(photo_key)
                        logger.info(f"Глава {number}: фото вставлено key='{photo_key}'")
                    else:
                        logger.warning(f"Глава {number}: не удалось создать фото для key='{photo_key}'")
            i += 1

        # Fallback: если AI не вставил маркеры, но есть доступные фото для этой главы
        if photos_inserted == 0 and fallback_photo_keys and self.story_photos:
            logger.info(f"Глава {number}: AI не вставил фото, используем fallback ({len(fallback_photo_keys)} доступных)")
            elements.append(Spacer(1, 0.5 * cm))

            fallback_count = 0
            for photo_key in fallback_photo_keys:
                if fallback_count >= 4:
                    break
                if photo_key in self.used_photo_keys:
                    logger.info(f"Глава {number}: fallback пропуск дубликата key='{photo_key}'")
                    continue
                if photo_key not in self.story_photos:
                    logger.warning(f"Глава {number}: fallback ключ '{photo_key}' не найден в story_photos")
                    continue

                # Build caption
                key_parts = photo_key.split(":", 2)
                story_key = key_parts[1] if len(key_parts) > 1 else ""
                caption = "" if story_key == "profile" else story_key.replace("_", " ").title()

                photo_flowable = self._create_inline_photo(photo_key, caption)
                if photo_flowable:
                    elements.append(photo_flowable)
                    elements.append(Spacer(1, 0.3 * cm))
                    fallback_count += 1
                    self.used_photo_keys.add(photo_key)
                    logger.info(f"Глава {number}: fallback фото вставлено key='{photo_key}'")

            logger.info(f"Глава {number}: всего вставлено {fallback_count} fallback фото")

        elements.append(PageBreak())
        return elements

    def _create_conclusion(self, text: str) -> List:
        """Создание заключения"""
        elements = []

        elements.append(Paragraph(self._prepare_text("Заключение"), self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        paragraphs = text.split("\n\n") if "\n\n" in text else [text]
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(self._prepare_text(para.strip()), self.styles["intro"]))

        elements.append(PageBreak())
        return elements

    def _create_final_page(self) -> List:
        """Создание финальной страницы"""
        elements = []

        elements.append(Spacer(1, 6 * cm))
        elements.append(DecorativeHeader(450, self.config["accent"], self.config["ornament_style"]))
        elements.append(Spacer(1, 1 * cm))

        final_quotes = {
            BookStyle.CLASSIC: "Помните о своих корнях,\nи ваши ветви будут крепки.",
            BookStyle.MODERN: "The love of family is life's greatest blessing.",
            BookStyle.VINTAGE: "Род силен не числом,\nа согласием и любовью.",
            BookStyle.CUSTOM: "Помните о своих корнях,\nи ваши ветви будут крепки.",
        }

        elements.append(Paragraph(self._prepare_text(final_quotes[self.style]), self.styles["quote"]))
        elements.append(Spacer(1, 1 * cm))
        elements.append(DecorativeHeader(450, self.config["accent"], self.config["ornament_style"]))

        # Логотип/название внизу
        elements.append(Spacer(1, 3 * cm))
        elements.append(Paragraph("GeneticTree", self.styles["footer"]))
        elements.append(Paragraph("Сохраняем историю вашей семьи", self.styles["footer"]))

        return elements
