from __future__ import annotations

from src.database.base import Base
from sqlalchemy import String, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, MappedAsDataclass, relationship
from datetime import datetime, timezone

class UserModel(Base, MappedAsDataclass):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    telegram_id: Mapped[str] = mapped_column(String(255), nullable=True, default=None, unique=True, index=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True, default=None, unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Обратная связь с родственниками
    relatives: Mapped[list["FamilyRelationModel"]] = relationship(
        "FamilyRelationModel",
        back_populates="owner",
        cascade="all, delete-orphan"
    )
