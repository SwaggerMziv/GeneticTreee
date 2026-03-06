"""Фоновые задачи для подписок (APScheduler)"""

from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.subscription.repository import (
    SubscriptionPlanRepository, UserSubscriptionRepository,
    PaymentRepository, UsageQuotaRepository,
)
from src.subscription.payment_service import PaymentService
from src.subscription.service import SubscriptionService
from src.subscription.enums import SubscriptionStatus, PlanType, BillingPeriod
from src.core.logger import get_logger

logger = get_logger(__name__)


async def check_expiring_subscriptions(session: AsyncSession) -> None:
    """Проверить подписки, истекающие в ближайшие сутки, и создать рекуррентные платежи"""
    plan_repo = SubscriptionPlanRepository(session)
    sub_repo = UserSubscriptionRepository(session)
    payment_repo = PaymentRepository(session)

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    expiring = await sub_repo.get_expiring(before=tomorrow)

    payment_service = PaymentService(plan_repo, payment_repo)

    for sub in expiring:
        if not sub.auto_renew or not sub.yookassa_payment_method_id:
            continue

        plan_name = sub.plan.name if sub.plan else PlanType.PRO
        billing_period = sub.billing_period or BillingPeriod.MONTHLY

        try:
            result = await payment_service.create_recurring_payment(
                user_id=sub.user_id,
                plan_name=plan_name,
                billing_period=billing_period,
                payment_method_id=sub.yookassa_payment_method_id,
            )
            if result:
                logger.info(
                    f"Рекуррентный платёж создан: user={sub.user_id}, "
                    f"payment={result['payment_id']}"
                )
        except Exception as e:
            logger.error(
                f"Ошибка рекуррентного платежа: user={sub.user_id}, error={e}"
            )
            # Помечаем подписку как past_due
            await sub_repo.update(sub, status=SubscriptionStatus.PAST_DUE)


async def expire_past_due_subscriptions(session: AsyncSession) -> None:
    """Деактивировать подписки с истёкшим сроком"""
    sub_repo = UserSubscriptionRepository(session)
    now = datetime.now(timezone.utc)

    # Получаем подписки, у которых expires_at прошёл
    from sqlalchemy import select
    from src.subscription.models import UserSubscriptionModel

    result = await session.execute(
        select(UserSubscriptionModel).where(
            UserSubscriptionModel.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.CANCELLED,
            ]),
            UserSubscriptionModel.expires_at != None,
            UserSubscriptionModel.expires_at < now,
        )
    )
    expired = list(result.scalars().all())

    for sub in expired:
        await sub_repo.update(sub, status=SubscriptionStatus.EXPIRED)
        logger.info(f"Подписка истекла: user={sub.user_id}, sub={sub.id}")

    if expired:
        logger.info(f"Истекло {len(expired)} подписок")


async def reset_monthly_quotas(session: AsyncSession) -> None:
    """Создать новые квоты для нового месяца (вызывается 1-го числа)"""
    # Новые квоты создаются автоматически при обращении через get_or_create_quota
    # Этот метод можно использовать для очистки старых квот
    logger.info("Сброс месячных квот выполнен (новые создадутся при обращении)")
