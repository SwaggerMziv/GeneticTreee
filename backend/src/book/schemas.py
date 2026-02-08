# -*- coding: utf-8 -*-
"""Схемы для модуля генерации книги"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class BookStyle(str, Enum):
    """Стиль оформления книги"""
    CLASSIC = "classic"
    MODERN = "modern"
    VINTAGE = "vintage"
    CUSTOM = "custom"


class BookTheme(str, Enum):
    """Цветовая тема книги"""
    LIGHT = "light"
    DARK = "dark"


class BookGenerateRequestSchema(BaseModel):
    """Запрос на генерацию книги"""
    style: BookStyle = Field(default=BookStyle.CLASSIC, description="Стиль оформления книги")
    theme: BookTheme = Field(default=BookTheme.LIGHT, description="Цветовая тема книги (light/dark)")
    custom_style_description: Optional[str] = Field(None, max_length=500, description="Описание пользовательского стиля (для стиля custom)")
    include_photos: bool = Field(default=True, description="Включить фотографии")
    include_stories: bool = Field(default=True, description="Включить семейные истории")
    include_timeline: bool = Field(default=True, description="Включить хронологию")
    language: str = Field(default="ru", description="Язык книги (ru/en)")


class BookChapterInfoSchema(BaseModel):
    """Информация о главе (от AI)"""
    title: str
    theme: str
    relatives_to_include: List[int] = []
    key_events: List[str] = []
    narrative_arc: str = ""


class BookOutlineSchema(BaseModel):
    """Структура книги (от AI)"""
    title: str
    introduction: str
    chapters: List[BookChapterInfoSchema]
    conclusion_theme: str = ""


class BookChapterContentSchema(BaseModel):
    """Глава с контентом"""
    title: str
    content: str


class BookProgressSchema(BaseModel):
    """Прогресс генерации книги"""
    type: str = "progress"
    stage: str  # fetching_data, generating_outline, writing_chapters, generating_pdf
    progress: int  # 0-100
    current_chapter: Optional[str] = None
    message: str


class BookResultSchema(BaseModel):
    """Результат генерации книги"""
    type: str = "result"
    pdf_base64: str
    filename: str


class BookErrorSchema(BaseModel):
    """Ошибка генерации"""
    type: str = "error"
    message: str
