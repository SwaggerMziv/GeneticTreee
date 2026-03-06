from __future__ import annotations

from src.database.base import Base
from sqlalchemy import (
    String, Boolean, Integer, BigInteger, DateTime, ForeignKey,
    Enum as SQLEnum, JSON, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, MappedAsDataclass, relationship
from datetime import datetime, timezone

from src.subscription.enums import PlanType, SubscriptionStatus, PaymentStatus, BillingPeriod


class SubscriptionPlanModel(Base, MappedAsDataclass):
    """Справочник тарифных планов"""
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(SQLEnum(PlanType), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), nullable=True, default=None)

    # Цена в копейках (0 = бесплатно)
    price_monthly_kop: Mapped[int] = mapped_column(Integer, default=0)
    price_yearly_kop: Mapped[int] = mapped_column(Integer, default=0)

    # Лимиты (-1 = безлимит)
    max_relatives: Mapped[int] = mapped_column(Integer, default=15)
    max_ai_requests_month: Mapped[int] = mapped_column(Integer, default=10)
    max_ai_smart_requests_month: Mapped[int] = mapped_column(Integer, default=0)
    max_tree_generations_month: Mapped[int] = mapped_column(Integer, default=2)
    max_book_generations_month: Mapped[int] = mapped_column(Integer, default=0)
    max_telegram_invitations: Mapped[int] = mapped_column(Integer, default=3)
    max_telegram_sessions_month: Mapped[int] = mapped_column(Integer, default=5)
    max_storage_mb: Mapped[int] = mapped_column(Integer, default=50)
    max_tts_month: Mapped[int] = mapped_column(Integer, default=0)

    # Фичи (булевы флаги)
    has_gedcom_export: Mapped[bool] = mapped_column(Boolean, default=False)
    has_priority_support: Mapped[bool] = mapped_column(Boolean, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class UserSubscriptionModel(Base, MappedAsDataclass):
    """Подписки пользователей"""
    __tablename__ = "user_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("subscription_plans.id"), index=True
    )

    status: Mapped[str] = mapped_column(
        SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE
    )
    billing_period: Mapped[str] = mapped_column(
        SQLEnum(BillingPeriod), nullable=True, default=None
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    cancelled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # ЮKassa рекуррентные платежи
    yookassa_payment_method_id: Mapped[str] = mapped_column(
        String(255), nullable=True, default=None
    )
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Связи
    plan: Mapped["SubscriptionPlanModel"] = relationship(
        "SubscriptionPlanModel", lazy="joined"
    )


class PaymentModel(Base, MappedAsDataclass):
    """История платежей"""
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subscription_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_subscriptions.id", ondelete="SET NULL"),
        nullable=True, default=None
    )

    # Сумма в копейках
    amount_kop: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="RUB")

    status: Mapped[str] = mapped_column(
        SQLEnum(PaymentStatus), default=PaymentStatus.PENDING
    )

    # ЮKassa
    yookassa_payment_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=True, default=None, index=True
    )
    yookassa_status: Mapped[str] = mapped_column(
        String(50), nullable=True, default=None
    )
    payment_method_type: Mapped[str] = mapped_column(
        String(50), nullable=True, default=None
    )

    description: Mapped[str] = mapped_column(String(500), nullable=True, default=None)
    extra_data: Mapped[dict] = mapped_column(JSON, nullable=True, default=None)

    paid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    refunded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class UsageQuotaModel(Base, MappedAsDataclass):
    """Счётчики использования ресурсов за период"""
    __tablename__ = "usage_quotas"

    __table_args__ = (
        UniqueConstraint("user_id", "period_start", name="uq_user_period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Счётчики использования
    ai_requests_used: Mapped[int] = mapped_column(Integer, default=0)
    ai_smart_requests_used: Mapped[int] = mapped_column(Integer, default=0)
    tree_generations_used: Mapped[int] = mapped_column(Integer, default=0)
    book_generations_used: Mapped[int] = mapped_column(Integer, default=0)
    telegram_sessions_used: Mapped[int] = mapped_column(Integer, default=0)
    tts_used: Mapped[int] = mapped_column(Integer, default=0)
    storage_used_mb: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
