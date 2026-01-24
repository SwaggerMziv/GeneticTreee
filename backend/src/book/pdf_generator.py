# -*- coding: utf-8 -*-
"""Генератор PDF для семейной книги с поддержкой кириллицы и красивым дизайном"""

import os
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

from src.book.schemas import BookStyle


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
        # Фон карточки
        if self.gender == 'male':
            bg_color = HexColor("#E3F2FD")  # Светло-голубой
            border_color = HexColor("#1976D2")
            icon = "M"
        elif self.gender == 'female':
            bg_color = HexColor("#FCE4EC")  # Светло-розовый
            border_color = HexColor("#C2185B")
            icon = "F"
        else:
            bg_color = HexColor("#F5F5F5")
            border_color = self.color_scheme["secondary"]
            icon = "?"

        # Рисуем карточку
        self.canv.setFillColor(bg_color)
        self.canv.setStrokeColor(border_color)
        self.canv.setLineWidth(2)
        self.canv.roundRect(0, 0, self.width, self.height, 10, fill=1, stroke=1)

        # Иконка пола
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


class PDFBookGenerator:
    """Генератор PDF книги о семейной истории с поддержкой кириллицы"""

    STYLE_CONFIGS = {
        BookStyle.CLASSIC: {
            "primary": HexColor("#2C3E50"),
            "secondary": HexColor("#7F8C8D"),
            "accent": HexColor("#8E44AD"),
            "text": HexColor("#2C3E50"),
            "background": HexColor("#FDFEFE"),
            "header_bg": HexColor("#F8F9FA"),
            "border": HexColor("#BDC3C7"),
            "title_font_size": 36,
            "heading_font_size": 20,
            "body_font_size": 11,
            "ornament_style": "classic",
        },
        BookStyle.MODERN: {
            "primary": HexColor("#1A1A2E"),
            "secondary": HexColor("#4A4A6A"),
            "accent": HexColor("#E94560"),
            "text": HexColor("#1A1A2E"),
            "background": HexColor("#FFFFFF"),
            "header_bg": HexColor("#F0F0F5"),
            "border": HexColor("#CCCCDD"),
            "title_font_size": 40,
            "heading_font_size": 22,
            "body_font_size": 11,
            "ornament_style": "modern",
        },
        BookStyle.VINTAGE: {
            "primary": HexColor("#5D4037"),
            "secondary": HexColor("#8D6E63"),
            "accent": HexColor("#A1887F"),
            "text": HexColor("#3E2723"),
            "background": HexColor("#FFF8E1"),
            "header_bg": HexColor("#FFECB3"),
            "border": HexColor("#BCAAA4"),
            "title_font_size": 32,
            "heading_font_size": 18,
            "body_font_size": 11,
            "ornament_style": "vintage",
        },
    }

    def __init__(self, style: BookStyle = BookStyle.CLASSIC):
        self.style = style
        self.config = self.STYLE_CONFIGS[style]
        self._register_fonts()
        self.styles = self._create_styles()

    def _register_fonts(self):
        """Регистрация шрифтов с поддержкой кириллицы"""
        import logging
        logger = logging.getLogger(__name__)

        registered_fonts = {}

        # Проверяем, какие шрифты уже зарегистрированы
        def is_font_registered(font_name):
            try:
                pdfmetrics.getFont(font_name)
                return True
            except:
                return False

        # Пути для поиска шрифтов DejaVu
        possible_paths = [
            # Linux
            "/usr/share/fonts/truetype/dejavu/",
            "/usr/share/fonts/dejavu/",
            # Windows
            "C:/Windows/Fonts/",
            # Локальная папка проекта
            os.path.join(os.path.dirname(__file__), "fonts/"),
            # Относительно backend
            os.path.join(os.path.dirname(__file__), "../../../fonts/"),
        ]

        dejavu_files = {
            "DejaVuSans": "DejaVuSans.ttf",
            "DejaVuSans-Bold": "DejaVuSans-Bold.ttf",
            "DejaVuSans-Oblique": "DejaVuSans-Oblique.ttf",
            "DejaVuSerif": "DejaVuSerif.ttf",
            "DejaVuSerif-Bold": "DejaVuSerif-Bold.ttf",
        }

        for font_name, font_file in dejavu_files.items():
            # Проверяем, не зарегистрирован ли уже
            if is_font_registered(font_name):
                registered_fonts[font_name] = True
                logger.info(f"Шрифт {font_name} уже зарегистрирован")
                continue

            for path in possible_paths:
                font_path = os.path.join(path, font_file)
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont(font_name, font_path))
                        registered_fonts[font_name] = True
                        logger.info(f"Успешно зарегистрирован шрифт {font_name} из {font_path}")
                        break
                    except Exception as e:
                        logger.warning(f"Не удалось зарегистрировать {font_name} из {font_path}: {e}")
                        continue

        # Fallback: используем Arial/Helvetica если DejaVu не найден
        if not registered_fonts:
            logger.info("DejaVu шрифты не найдены, пробуем Arial...")
            # Пробуем Arial на Windows
            arial_path = "C:/Windows/Fonts/arial.ttf"
            arial_bold_path = "C:/Windows/Fonts/arialbd.ttf"

            if os.path.exists(arial_path):
                try:
                    if not is_font_registered("DejaVuSans"):
                        pdfmetrics.registerFont(TTFont("DejaVuSans", arial_path))
                        registered_fonts["DejaVuSans"] = True
                        logger.info("Зарегистрирован DejaVuSans как Arial")
                    if os.path.exists(arial_bold_path):
                        if not is_font_registered("DejaVuSans-Bold"):
                            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", arial_bold_path))
                            registered_fonts["DejaVuSans-Bold"] = True
                            logger.info("Зарегистрирован DejaVuSans-Bold как Arial Bold")
                    else:
                        if not is_font_registered("DejaVuSans-Bold"):
                            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", arial_path))
                            registered_fonts["DejaVuSans-Bold"] = True
                            logger.info("Зарегистрирован DejaVuSans-Bold как Arial (regular)")
                except Exception as e:
                    logger.error(f"Не удалось зарегистрировать Arial: {e}")

        # Устанавливаем доступные шрифты с fallback
        self.base_font = "DejaVuSans" if registered_fonts.get("DejaVuSans") else "Helvetica"
        self.bold_font = "DejaVuSans-Bold" if registered_fonts.get("DejaVuSans-Bold") else "Helvetica-Bold"
        self.fonts_available = bool(registered_fonts)

        logger.info(f"Итоговые шрифты: base_font={self.base_font}, bold_font={self.bold_font}")

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
                alignment=TA_JUSTIFY,
                spaceBefore=6,
                spaceAfter=8,
                leading=self.config["body_font_size"] * 1.6,
                firstLineIndent=25,
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
                textColor=white,
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
    ) -> bytes:
        """Генерация PDF книги"""
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
            story.extend(self._create_family_tree_section(relatives, relationships))

        # 5. Хронология
        if timeline:
            story.extend(self._create_timeline_section(timeline))

        # 6. Главы
        for i, chapter in enumerate(chapters, 1):
            story.extend(self._create_chapter(i, chapter["title"], chapter["content"]))

        # 7. Заключение
        story.extend(self._create_conclusion(conclusion))

        # 8. Финальная страница
        story.extend(self._create_final_page())

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
        elements.append(Paragraph(title, self.styles["title"]))

        # Подзаголовок в зависимости от стиля
        subtitles = {
            BookStyle.CLASSIC: "История нашего рода",
            BookStyle.MODERN: "Семейная хроника",
            BookStyle.VINTAGE: "Летопись семьи",
        }
        elements.append(Paragraph(subtitles[self.style], self.styles["subtitle"]))

        # Нижний декоративный элемент
        elements.append(Spacer(1, 1 * cm))
        elements.append(DecorativeHeader(450, self.config["accent"], self.config["ornament_style"]))

        # Дерево/орнамент в центре
        elements.append(Spacer(1, 2 * cm))
        elements.append(self._create_tree_icon())

        # Дата создания внизу
        elements.append(Spacer(1, 3 * cm))
        today = date.today().strftime("%d.%m.%Y")
        elements.append(Paragraph(f"Создано {today}", self.styles["footer"]))

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

        elements.append(Paragraph("Содержание", self.styles["chapter_title"]))
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
                Paragraph(title, self.styles["toc_entry"]),
                Paragraph(dots, self.styles["toc_entry"]),
                Paragraph(page, self.styles["toc_entry"]),
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

        elements.append(Paragraph("Введение", self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Эпиграф
        epigraphs = {
            BookStyle.CLASSIC: "«Семья — это не главное, это всё»",
            BookStyle.MODERN: "Family is not an important thing. It's everything.",
            BookStyle.VINTAGE: "«В семье и каша гуще»",
        }
        elements.append(Paragraph(epigraphs[self.style], self.styles["quote"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Текст введения
        paragraphs = text.split("\n\n") if "\n\n" in text else [text]
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.strip(), self.styles["intro"]))

        elements.append(PageBreak())
        return elements

    def _create_family_tree_section(self, relatives: List, relationships: Optional[List]) -> List:
        """Создание раздела с семейным древом"""
        elements = []

        elements.append(Paragraph("Семейное древо", self.styles["chapter_title"]))
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
                photo_url = r.image_url if hasattr(r, 'image_url') else None

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
        data = [[Paragraph(label, self.styles["generation_title"])]]
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

        elements.append(Paragraph("Хронология событий", self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        sorted_timeline = sorted(timeline, key=lambda x: x.get("year", 0))

        for event in sorted_timeline:
            year = event.get("year", "?")
            description = event.get("event", "")

            # Год с маркером
            year_text = f"● {year}"
            elements.append(Paragraph(year_text, self.styles["timeline_year"]))

            # Описание события
            elements.append(Paragraph(description, self.styles["timeline_event"]))

            # Соединительная линия
            elements.append(TreeBranchLine(100, self.config["border"], 'dashed'))

        elements.append(PageBreak())
        return elements

    def _create_chapter(self, number: int, title: str, content: str) -> List:
        """Создание главы"""
        elements = []

        chapter_title = f"Глава {number}. {title}"
        elements.append(Paragraph(chapter_title, self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Разбиваем на абзацы
        paragraphs = content.split("\n\n") if "\n\n" in content else content.split("\n")
        for para in paragraphs:
            clean_para = para.strip()
            if clean_para:
                # Очищаем от markdown
                clean_para = clean_para.replace("**", "")
                clean_para = clean_para.replace("*", "")
                clean_para = clean_para.replace("#", "")
                elements.append(Paragraph(clean_para, self.styles["body"]))

        elements.append(PageBreak())
        return elements

    def _create_conclusion(self, text: str) -> List:
        """Создание заключения"""
        elements = []

        elements.append(Paragraph("Заключение", self.styles["chapter_title"]))
        elements.append(DecorativeHeader(450, self.config["border"], self.config["ornament_style"]))
        elements.append(Spacer(1, 0.5 * cm))

        paragraphs = text.split("\n\n") if "\n\n" in text else [text]
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.strip(), self.styles["intro"]))

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
        }

        elements.append(Paragraph(final_quotes[self.style], self.styles["quote"]))
        elements.append(Spacer(1, 1 * cm))
        elements.append(DecorativeHeader(450, self.config["accent"], self.config["ornament_style"]))

        # Логотип/название внизу
        elements.append(Spacer(1, 3 * cm))
        elements.append(Paragraph("GeneticTree", self.styles["footer"]))
        elements.append(Paragraph("Сохраняем историю вашей семьи", self.styles["footer"]))

        return elements
