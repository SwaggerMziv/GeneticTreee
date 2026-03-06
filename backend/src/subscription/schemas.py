from pydantic import BaseModel, Field
from datetime import datetime
from src.subscription.enums import (
    PlanType, SubscriptionStatus, PaymentStatus, BillingPeriod, QuotaResource
)


# === Тарифные планы ===

class PlanLimitsSchema(BaseModel):
    max_relatives: int
    max_ai_requests_month: int
    max_ai_smart_requests_month: int
    max_tree_generations_month: int
    max_book_generations_month: int
    max_telegram_invitations: int
    max_telegram_sessions_month: int
    max_storage_mb: int
    max_tts_month: int
    has_gedcom_export: bool
    has_priority_support: bool


class PlanOutputSchema(BaseModel):
    id: int
    name: PlanType
    display_name: str
    description: str | None = None
    price_monthly_kop: int
    price_yearly_kop: int
    limits: PlanLimitsSchema
    sort_order: int

    @classmethod
    def from_model(cls, model) -> "PlanOutputSchema":
        return cls(
            id=model.id,
            name=model.name,
            display_name=model.display_name,
            description=model.description,
            price_monthly_kop=model.price_monthly_kop,
            price_yearly_kop=model.price_yearly_kop,
            limits=PlanLimitsSchema(
                max_relatives=model.max_relatives,
                max_ai_requests_month=model.max_ai_requests_month,
                max_ai_smart_requests_month=model.max_ai_smart_requests_month,
                max_tree_generations_month=model.max_tree_generations_month,
                max_book_generations_month=model.max_book_generations_month,
                max_telegram_invitations=model.max_telegram_invitations,
                max_telegram_sessions_month=model.max_telegram_sessions_month,
                max_storage_mb=model.max_storage_mb,
                max_tts_month=model.max_tts_month,
                has_gedcom_export=model.has_gedcom_export,
                has_priority_support=model.has_priority_support,
            ),
            sort_order=model.sort_order,
        )


# === Подписки ===

class SubscriptionOutputSchema(BaseModel):
    id: int
    plan: PlanOutputSchema
    status: SubscriptionStatus
    billing_period: BillingPeriod | None = None
    started_at: datetime
    expires_at: datetime | None = None
    cancelled_at: datetime | None = None
    auto_renew: bool


class CheckoutRequestSchema(BaseModel):
    plan_name: PlanType = Field(..., description="Название тарифа (pro/premium)")
    billing_period: BillingPeriod = Field(
        default=BillingPeriod.MONTHLY, description="Период оплаты"
    )
    return_url: str = Field(..., description="URL возврата после оплаты")


class CheckoutResponseSchema(BaseModel):
    payment_id: str
    confirmation_url: str
    amount_kop: int


# === Использование / квоты ===

class QuotaItemSchema(BaseModel):
    resource: str
    display_name: str
    used: int
    limit: int  # -1 = безлимит
    is_unlimited: bool = False


class UsageSummarySchema(BaseModel):
    plan: PlanOutputSchema
    quotas: list[QuotaItemSchema]
    period_start: datetime
    period_end: datetime


# === Платежи ===

class PaymentOutputSchema(BaseModel):
    id: int
    amount_kop: int
    currency: str
    status: PaymentStatus
    payment_method_type: str | None = None
    description: str | None = None
    paid_at: datetime | None = None
    created_at: datetime


# === Webhook ===

class YookassaWebhookSchema(BaseModel):
    type: str
    event: str
    object: dict


# === Bot quota check ===

class BotQuotaCheckSchema(BaseModel):
    allowed: bool
    resource: str
    used: int
    limit: int
    message: str | None = None
