"""Обработка вебхуков ЮKassa"""

import json
import hmac
import hashlib
from fastapi import Request

from src.config import settings
from src.subscription.service import SubscriptionService
from src.subscription.enums import PlanType, BillingPeriod
from src.subscription.exceptions import InvalidWebhookError
from src.core.logger import get_logger

logger = get_logger(__name__)


async def verify_webhook_signature(request: Request, body: bytes) -> bool:
    """Проверка подписи webhook от ЮKassa (если настроен секрет)"""
    secret = settings.yookassa_webhook_secret
    if not secret:
        return True  # Пропускаем проверку если секрет не настроен

    signature = request.headers.get("Content-Hmac")
    if not signature:
        return False

    expected = hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)


async def handle_webhook(
    event_type: str,
    event_object: dict,
    subscription_service: SubscriptionService,
) -> dict:
    """Обработать webhook событие от ЮKassa"""

    if event_type == "payment.succeeded":
        return await _handle_payment_succeeded(event_object, subscription_service)
    elif event_type == "payment.canceled":
        return await _handle_payment_cancelled(event_object, subscription_service)
    elif event_type == "refund.succeeded":
        return await _handle_refund(event_object, subscription_service)
    else:
        logger.info(f"Необработанный тип webhook: {event_type}")
        return {"status": "ignored", "event": event_type}


async def _handle_payment_succeeded(
    payment_data: dict,
    subscription_service: SubscriptionService,
) -> dict:
    """Обработка успешного платежа"""
    yookassa_payment_id = payment_data.get("id")
    metadata = payment_data.get("metadata", {})
    user_id = int(metadata.get("user_id", 0))
    plan_name_str = metadata.get("plan_name", "")
    billing_period_str = metadata.get("billing_period", "monthly")

    if not user_id or not plan_name_str:
        logger.error(f"Webhook payment.succeeded без metadata: {yookassa_payment_id}")
        return {"status": "error", "reason": "missing metadata"}

    plan_name = PlanType(plan_name_str)
    billing_period = BillingPeriod(billing_period_str)

    # Извлекаем payment_method_id для рекуррентных платежей
    payment_method = payment_data.get("payment_method", {})
    payment_method_id = payment_method.get("id")
    payment_method_type = payment_method.get("type")

    # Помечаем платёж как успешный
    await subscription_service.mark_payment_succeeded(
        yookassa_payment_id=yookassa_payment_id,
        payment_method_type=payment_method_type,
    )

    # Активируем / продлеваем подписку
    await subscription_service.activate_subscription(
        user_id=user_id,
        plan_name=plan_name,
        billing_period=billing_period,
        yookassa_payment_method_id=payment_method_id,
    )

    logger.info(
        f"Webhook: подписка активирована user={user_id}, "
        f"plan={plan_name.value}, payment={yookassa_payment_id}"
    )
    return {"status": "ok", "action": "subscription_activated"}


async def _handle_payment_cancelled(
    payment_data: dict,
    subscription_service: SubscriptionService,
) -> dict:
    """Обработка отменённого платежа"""
    yookassa_payment_id = payment_data.get("id")
    payment = await subscription_service.payment_repo.get_by_yookassa_id(yookassa_payment_id)
    if payment:
        from src.subscription.enums import PaymentStatus
        await subscription_service.payment_repo.update(
            payment,
            status=PaymentStatus.CANCELLED,
            yookassa_status="canceled",
        )

    logger.info(f"Webhook: платёж отменён {yookassa_payment_id}")
    return {"status": "ok", "action": "payment_cancelled"}


async def _handle_refund(
    refund_data: dict,
    subscription_service: SubscriptionService,
) -> dict:
    """Обработка возврата"""
    payment_id = refund_data.get("payment_id")
    logger.info(f"Webhook: возврат по платежу {payment_id}")
    return {"status": "ok", "action": "refund_processed"}
