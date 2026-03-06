from __future__ import annotations

from src.database.base import Base
from sqlalchemy import String, Integer, BigInteger, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, MappedAsDataclass
from datetime import datetime, timezone


class AdminAuditLogModel(Base, MappedAsDataclass):
    """Лог действий администратора"""
    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admin_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None
    )
    action: Mapped[str] = mapped_column(String(128))
    target_type: Mapped[str] = mapped_column(String(64))
    target_id: Mapped[str] = mapped_column(String(64))
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AIUsageLogModel(Base, MappedAsDataclass):
    """Лог использования AI токенов"""
    __tablename__ = "ai_usage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None
    )
    model: Mapped[str] = mapped_column(String(128))
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    endpoint_type: Mapped[str] = mapped_column(String(64))  # ai_assistant / book / tree_generation
    error_message: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class BookGenerationModel(Base, MappedAsDataclass):
    """Трекинг генерации книг"""
    __tablename__ = "book_generations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None
    )
    status: Mapped[str] = mapped_column(String(32), default="generating")  # generating / completed / failed
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)
    s3_url: Mapped[str | None] = mapped_column(String(1024), nullable=True, default=None)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=None)
    error_message: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
