# -*- coding: utf-8 -*-
"""Модели для AI-модуля"""

from __future__ import annotations

from src.database.base import Base
from sqlalchemy import Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, MappedAsDataclass
from datetime import datetime, timezone


class AIChatSessionModel(Base, MappedAsDataclass):
    """Сессия чата AI-ассистента (одна на пользователя)"""
    __tablename__ = "ai_chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    messages: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
