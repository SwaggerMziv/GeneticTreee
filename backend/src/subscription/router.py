"""API роутер подписок и платежей"""

from fastapi import APIRouter, Depends, Body, Request, Query
from fastapi import HTTPException
from typing import List

from src.auth.dependencies import get_current_user_id
from src.subscription.dependencies import (
    get_subscription_service,
    get_quota_service,
    get_payment_service,
)
from src.subscription.service import SubscriptionService
from src.subscription.quota_service import QuotaService
from src.subscription.payment_service import PaymentService
from src.subscription.schemas import (
    PlanOutputSchema,
    SubscriptionOutputSchema,
    CheckoutRequestSchema,
    CheckoutResponseSchema,
    UsageSummarySchema,
    PaymentOutputSchema,
    BotQuotaCheckSchema,
)
from src.subscription.webhooks import handle_webhook, verify_webhook_signature
from src.subscription.exceptions import InvalidWebhookError
from src.subscription.enums import QuotaResource

router = APIRouter(prefix="/api/v1/subscription", tags=["Subscription"])


@router.get("/plans", response_model=List[PlanOutputSchema])
async def get_plans(
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Получить все доступные тарифные планы (публичный)"""
    return await service.get_plans()


@router.get("/my", response_model=SubscriptionOutputSchema | None)
async def get_my_subscription(
    user_id: int = Depends(get_current_user_id),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Получить текущую подписку пользователя"""
    return await service.get_user_subscription(user_id)


@router.post("/checkout", response_model=CheckoutResponseSchema)
async def checkout(
    request: CheckoutRequestSchema = Body(...),
    user_id: int = Depends(get_current_user_id),
    payment_service: PaymentService = Depends(get_payment_service),
):
    """Создать платёж и получить ссылку для оплаты через ЮKassa"""
    result = await payment_service.create_checkout(
        user_id=user_id,
        plan_name=request.plan_name,
        billing_period=request.billing_period,
        return_url=request.return_url,
    )
    return CheckoutResponseSchema(**result)


@router.post("/cancel", response_model=SubscriptionOutputSchema)
async def cancel_subscription(
    user_id: int = Depends(get_current_user_id),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Отменить подписку (действует до конца оплаченного периода)"""
    return await service.cancel_subscription(user_id)


@router.get("/usage", response_model=UsageSummarySchema)
async def get_usage(
    user_id: int = Depends(get_current_user_id),
    quota_service: QuotaService = Depends(get_quota_service),
):
    """Получить сводку использования и квот"""
    return await quota_service.get_usage_summary(user_id)


@router.get("/payments", response_model=List[PaymentOutputSchema])
async def get_payments(
    user_id: int = Depends(get_current_user_id),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """История платежей пользователя"""
    return await service.get_payment_history(user_id, skip, limit)


@router.post("/sync-payment")
async def sync_payment(
    user_id: int = Depends(get_current_user_id),
    payment_service: PaymentService = Depends(get_payment_service),
    subscription_service: SubscriptionService = Depends(get_subscription_service),
):
    """Проверить статус последнего pending-платежа через API ЮKassa"""
    return await payment_service.sync_pending_payment(user_id, subscription_service)


@router.post("/webhooks/yookassa")
async def yookassa_webhook(
    request: Request,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Webhook от ЮKassa (публичный, верификация по HMAC)"""
    body = await request.body()

    if not await verify_webhook_signature(request, body):
        raise InvalidWebhookError("Неверная подпись")

    import json
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Malformed JSON")
    event_type = data.get("event", "")
    event_object = data.get("object", {})

    return await handle_webhook(event_type, event_object, service)


@router.get("/check-bot-quota/{telegram_user_id}", response_model=BotQuotaCheckSchema)
async def check_bot_quota(
    telegram_user_id: str,
    resource: str = Query(..., description="Ресурс для проверки"),
    quota_service: QuotaService = Depends(get_quota_service),
):
    """Проверить квоту для Telegram-бота по telegram_user_id владельца"""
    from sqlalchemy import select
    from src.users.models import UserModel

    # Находим user_id по telegram_id
    result = await quota_service.session.execute(
        select(UserModel.id).where(UserModel.telegram_id == telegram_user_id)
    )
    user_id_row = result.scalar_one_or_none()

    if not user_id_row:
        # Ищем через привязанного родственника
        from src.family.models import FamilyRelationModel
        result = await quota_service.session.execute(
            select(FamilyRelationModel.user_id).where(
                FamilyRelationModel.telegram_user_id == telegram_user_id,
                FamilyRelationModel.is_activated == True,
            ).limit(1)
        )
        user_id_row = result.scalar_one_or_none()

    if not user_id_row:
        return BotQuotaCheckSchema(
            allowed=False,
            resource=resource,
            used=0,
            limit=0,
            message="Пользователь не найден",
        )

    user_id = user_id_row

    try:
        quota_resource = QuotaResource(resource)
    except ValueError:
        return BotQuotaCheckSchema(
            allowed=False, resource=resource, used=0, limit=0,
            message=f"Неизвестный ресурс: {resource}",
        )

    allowed = await quota_service.check_quota(user_id, quota_resource)
    plan = await quota_service.get_user_plan(user_id)

    from src.subscription.quota_service import RESOURCE_TO_PLAN_LIMIT, RESOURCE_TO_QUOTA_FIELD
    limit_field = RESOURCE_TO_PLAN_LIMIT.get(quota_resource)
    limit_val = getattr(plan, limit_field, 0) if limit_field else 0

    used_val = 0
    quota_field = RESOURCE_TO_QUOTA_FIELD.get(quota_resource)
    if quota_field:
        quota = await quota_service.get_or_create_quota(user_id)
        used_val = getattr(quota, quota_field, 0)

    message = None if allowed else "Лимит исчерпан. Обновите тариф для продолжения."

    return BotQuotaCheckSchema(
        allowed=allowed,
        resource=resource,
        used=used_val,
        limit=limit_val,
        message=message,
    )
