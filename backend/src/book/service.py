# -*- coding: utf-8 -*-
"""Сервис для генерации семейной книги"""

from typing import AsyncGenerator, List, Dict, Any
from openai import AsyncOpenAI
import json
import base64

from src.config import settings
from src.ai.utils import format_sse, extract_json_from_response
from src.book.schemas import BookGenerateRequestSchema, BookStyle
from src.book.prompts import (
    BOOK_OUTLINE_PROMPT,
    CHAPTER_WRITING_PROMPT,
    TIMELINE_PROMPT,
    CONCLUSION_PROMPT
)
from src.book.pdf_generator import PDFBookGenerator
from src.family.service import FamilyRelationService, FamilyRelationshipService


class BookService:
    """Сервис для генерации семейных книг с использованием AI"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"  # Используем более мощную модель для творческого письма

    async def generate_book_stream(
        self,
        user_id: int,
        request: BookGenerateRequestSchema,
        family_service: FamilyRelationService,
        relationship_service: FamilyRelationshipService,
    ) -> AsyncGenerator[str, None]:
        """
        Генерация семейной книги с потоковыми обновлениями прогресса.
        Возвращает SSE события с прогрессом и в конце PDF в base64.
        """
        try:
            # Этап 1: Загрузка данных семьи (0-10%)
            yield format_sse({
                "type": "progress",
                "stage": "fetching_data",
                "progress": 0,
                "message": "Загрузка данных семьи..."
            })

            relatives = await family_service.get_user_relatives(user_id)
            relationships = await relationship_service.get_user_relationships(user_id, with_details=False)

            if not relatives:
                yield format_sse({
                    "type": "error",
                    "message": "Нет родственников для создания книги"
                })
                yield format_sse({"type": "done"})
                return

            yield format_sse({
                "type": "progress",
                "stage": "fetching_data",
                "progress": 10,
                "message": f"Найдено {len(relatives)} родственников"
            })

            # Подготовка контекста для AI
            family_context = self._format_family_context(relatives, relationships, request.include_stories)

            # Этап 2: Генерация структуры книги (10-25%)
            yield format_sse({
                "type": "progress",
                "stage": "generating_outline",
                "progress": 15,
                "message": "Создание структуры книги..."
            })

            outline = await self._generate_outline(family_context, request.language)

            chapters_count = len(outline.get('chapters', []))
            yield format_sse({
                "type": "progress",
                "stage": "generating_outline",
                "progress": 25,
                "message": f"Структура готова: {chapters_count} глав"
            })

            # Этап 3: Генерация хронологии если нужно (25-30%)
            timeline = []
            if request.include_timeline:
                yield format_sse({
                    "type": "progress",
                    "stage": "generating_timeline",
                    "progress": 27,
                    "message": "Создание хронологии событий..."
                })
                timeline = await self._generate_timeline(family_context, request.language)
                yield format_sse({
                    "type": "progress",
                    "stage": "generating_timeline",
                    "progress": 30,
                    "message": f"Хронология: {len(timeline)} событий"
                })

            # Этап 4: Написание глав (30-80%)
            chapters_content = []
            total_chapters = len(outline.get('chapters', []))

            for i, chapter_info in enumerate(outline.get('chapters', [])):
                progress = 30 + int(((i + 1) / total_chapters) * 50) if total_chapters > 0 else 80
                chapter_title = chapter_info.get('title', f'Глава {i + 1}')

                yield format_sse({
                    "type": "progress",
                    "stage": "writing_chapters",
                    "progress": progress - 5,
                    "current_chapter": chapter_title,
                    "message": f"Написание: {chapter_title} ({i + 1}/{total_chapters})..."
                })

                chapter_content = await self._write_chapter(
                    chapter_info,
                    relatives,
                    relationships,
                    request.language,
                    request.style
                )
                chapters_content.append({
                    'title': chapter_title,
                    'content': chapter_content
                })

                yield format_sse({
                    "type": "progress",
                    "stage": "writing_chapters",
                    "progress": progress,
                    "current_chapter": chapter_title,
                    "message": f"Глава готова: {chapter_title}"
                })

            # Этап 5: Написание заключения (80-85%)
            yield format_sse({
                "type": "progress",
                "stage": "writing_conclusion",
                "progress": 82,
                "message": "Написание заключения..."
            })

            conclusion = await self._write_conclusion(
                outline.get('conclusion_theme', 'Семейные ценности и традиции'),
                family_context[:1000],
                request.language
            )

            yield format_sse({
                "type": "progress",
                "stage": "writing_conclusion",
                "progress": 85,
                "message": "Заключение готово"
            })

            # Этап 6: Генерация PDF (85-100%)
            yield format_sse({
                "type": "progress",
                "stage": "generating_pdf",
                "progress": 88,
                "message": "Генерация PDF документа..."
            })

            # Подготовка фотографий если нужно
            photos = {}
            if request.include_photos:
                photos = {r.id: r.image_url for r in relatives if r.image_url}

            pdf_generator = PDFBookGenerator(style=request.style)
            pdf_bytes = pdf_generator.generate(
                title=outline.get('title', 'Семейная история'),
                introduction=outline.get('introduction', ''),
                chapters=chapters_content,
                conclusion=conclusion,
                timeline=timeline if request.include_timeline else None,
                relatives=relatives,
                relationships=relationships,
            )

            yield format_sse({
                "type": "progress",
                "stage": "generating_pdf",
                "progress": 100,
                "message": "Книга готова!"
            })

            # Отправка PDF в base64
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            yield format_sse({
                "type": "result",
                "pdf_base64": pdf_base64,
                "filename": f"family_book_{user_id}.pdf"
            })

            yield format_sse({"type": "done"})

        except Exception as e:
            yield format_sse({
                "type": "error",
                "message": f"Ошибка генерации: {str(e)}"
            })
            yield format_sse({"type": "done"})

    def _format_family_context(
        self,
        relatives: List,
        relationships: List,
        include_stories: bool = True
    ) -> str:
        """Форматирование данных семьи для AI промптов"""
        lines = ["РОДСТВЕННИКИ:"]

        for r in relatives:
            name = f"{r.first_name} {r.middle_name or ''} {r.last_name}".strip()
            birth = r.birth_date.strftime('%Y') if r.birth_date else 'неизвестно'
            death = r.death_date.strftime('%Y') if r.death_date else None
            gender = r.gender.value if r.gender else 'неизвестно'
            gen = r.generation if r.generation is not None else 'неизвестно'

            stories = ""
            if include_stories and r.context:
                story_keys = list(r.context.keys())[:3]  # Макс 3 истории на человека для промпта
                if story_keys:
                    stories = f" | Истории: {story_keys}"

            death_str = f" - {death}" if death else ""
            lines.append(f"- ID:{r.id} | {name} | пол:{gender} | {birth}{death_str} | поколение:{gen}{stories}")

        lines.append("\nСВЯЗИ:")
        for rel in relationships:
            rel_type = rel.relationship_type.value if hasattr(rel.relationship_type, 'value') else str(rel.relationship_type)
            lines.append(f"- ID:{rel.from_relative_id} -> ID:{rel.to_relative_id} ({rel_type})")

        # Добавляем полные тексты историй если включено
        if include_stories:
            lines.append("\nИСТОРИИ:")
            for r in relatives:
                if r.context:
                    name = f"{r.first_name} {r.last_name}"
                    for key, value in list(r.context.items())[:2]:  # Макс 2 истории на человека
                        if isinstance(value, str) and len(value) > 10:
                            lines.append(f"- {name} ({key}): {value[:500]}...")

        return "\n".join(lines)

    async def _generate_outline(self, family_context: str, language: str) -> Dict[str, Any]:
        """Генерация структуры книги через AI"""
        prompt = BOOK_OUTLINE_PROMPT.format(
            family_context=family_context,
            language=language
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=2500,
        )

        try:
            return extract_json_from_response(response.choices[0].message.content)
        except Exception:
            # Возвращаем базовую структуру если AI не смог сгенерировать валидный JSON
            return {
                "title": "История нашей семьи",
                "introduction": "Эта книга рассказывает историю нашей семьи...",
                "chapters": [
                    {
                        "title": "Начало пути",
                        "theme": "Истоки семьи",
                        "relatives_to_include": [],
                        "key_events": [],
                        "narrative_arc": "История первых поколений"
                    },
                    {
                        "title": "Семейные традиции",
                        "theme": "Ценности и традиции",
                        "relatives_to_include": [],
                        "key_events": [],
                        "narrative_arc": "Что объединяет нашу семью"
                    }
                ],
                "conclusion_theme": "Наследие и будущее семьи"
            }

    async def _generate_timeline(self, family_context: str, language: str) -> List[Dict]:
        """Генерация хронологии семейных событий"""
        prompt = TIMELINE_PROMPT.format(
            family_context=family_context,
            language=language
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )

        try:
            result = extract_json_from_response(response.choices[0].message.content)
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and 'events' in result:
                return result['events']
            return []
        except Exception:
            return []

    async def _write_chapter(
        self,
        chapter_info: Dict,
        relatives: List,
        relationships: List,
        language: str,
        style: BookStyle
    ) -> str:
        """Написание одной главы"""
        # Получаем родственников для этой главы
        relative_ids = chapter_info.get('relatives_to_include', [])
        chapter_relatives = [r for r in relatives if r.id in relative_ids]

        if not chapter_relatives:
            # Используем первых 10 родственников если не указаны конкретные
            chapter_relatives = relatives[:10]

        # Форматируем данные родственников
        relatives_data = []
        for r in chapter_relatives:
            name = f"{r.first_name} {r.middle_name or ''} {r.last_name}".strip()
            birth = r.birth_date.strftime('%Y-%m-%d') if r.birth_date else 'неизвестно'
            gender = r.gender.value if r.gender else 'неизвестно'
            data = f"- {name}, род. {birth}, пол: {gender}"
            relatives_data.append(data)

        # Форматируем истории
        stories_context = []
        for r in chapter_relatives:
            if r.context:
                for key, value in r.context.items():
                    name = f"{r.first_name} {r.last_name}"
                    if isinstance(value, str):
                        stories_context.append(f"- История '{key}' о {name}: {value[:300]}")

        # Форматируем связи
        rel_ids = {r.id for r in chapter_relatives}
        relevant_rels = [r for r in relationships
                         if r.from_relative_id in rel_ids or r.to_relative_id in rel_ids]
        relationships_context = []
        for r in relevant_rels:
            rel_type = r.relationship_type.value if hasattr(r.relationship_type, 'value') else str(r.relationship_type)
            relationships_context.append(f"- ID:{r.from_relative_id} является {rel_type} для ID:{r.to_relative_id}")

        prompt = CHAPTER_WRITING_PROMPT.format(
            chapter_theme=chapter_info.get('theme', ''),
            chapter_title=chapter_info.get('title', ''),
            relatives_data="\n".join(relatives_data) or "Не указаны конкретные родственники",
            stories_context="\n".join(stories_context) or "Истории не доступны",
            relationships_context="\n".join(relationships_context) or "Связи не указаны",
            language=language,
            style=style.value
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=1500,
        )

        return response.choices[0].message.content

    async def _write_conclusion(self, theme: str, family_overview: str, language: str) -> str:
        """Написание заключения книги"""
        prompt = CONCLUSION_PROMPT.format(
            theme=theme,
            family_overview=family_overview,
            language=language
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=600,
        )

        return response.choices[0].message.content
