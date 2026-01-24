from __future__ import annotations
from typing import Dict, Any

from src.database.base import Base
from sqlalchemy import String, Boolean, Integer, BigInteger, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, MappedAsDataclass, relationship
from datetime import datetime, timezone
from src.family.enums import Gender, RelationshipType


class FamilyRelationModel(Base, MappedAsDataclass):
    __tablename__ = "user_relatives"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    image_url: Mapped[str] = mapped_column(String(255), nullable=True, default=None)
    first_name: Mapped[str] = mapped_column(String(64), nullable=True, default=None)
    middle_name: Mapped[str] = mapped_column(String(64), nullable=True, default=None)
    last_name: Mapped[str] = mapped_column(String(64), nullable=True, default=None)
    birth_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    death_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    gender: Mapped[Gender] = mapped_column(SQLEnum(Gender), nullable=True, default=None)

    contact_info: Mapped[str] = mapped_column(String(255), nullable=True, default=None)
    telegram_id: Mapped[str] = mapped_column(String(255), nullable=True, default=None)

    # Invitation system fields
    invitation_token: Mapped[str] = mapped_column(String(64), nullable=True, default=None, unique=True, index=True)
    telegram_user_id: Mapped[int] = mapped_column(BigInteger, nullable=True, default=None, index=True)
    is_activated: Mapped[bool] = mapped_column(Boolean, default=False)
    activated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    context: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default={})

    generation: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    owner: Mapped["UserModel"] = relationship("UserModel", back_populates="relatives")

    # Связи где этот родственник является "откуда"
    relationships_from: Mapped[list["FamilyRelationshipModel"]] = relationship(
        "FamilyRelationshipModel",
        foreign_keys="[FamilyRelationshipModel.from_relative_id]",
        back_populates="from_relative",
        cascade="all, delete-orphan"
    )

    # Связи где этот родственник является "куда"
    relationships_to: Mapped[list["FamilyRelationshipModel"]] = relationship(
        "FamilyRelationshipModel",
        foreign_keys="[FamilyRelationshipModel.to_relative_id]",
        back_populates="to_relative",
        cascade="all, delete-orphan"
    )


class FamilyRelationshipModel(Base, MappedAsDataclass):
    """Связи между родственниками"""
    __tablename__ = "family_relationships"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    # От кого связь, например ванек
    from_relative_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_relatives.id", ondelete="CASCADE"))

    # К кому связь например галина
    to_relative_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_relatives.id", ondelete="CASCADE"))

    # Тип связи: ванек - отец галины
    relationship_type: Mapped[RelationshipType] = mapped_column(SQLEnum(RelationshipType))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    from_relative: Mapped["FamilyRelationModel"] = relationship(
        "FamilyRelationModel",
        foreign_keys=[from_relative_id],
        back_populates="relationships_from"
    )

    to_relative: Mapped["FamilyRelationModel"] = relationship(
        "FamilyRelationModel",
        foreign_keys=[to_relative_id],
        back_populates="relationships_to"
    )