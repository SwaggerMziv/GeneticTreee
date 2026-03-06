"""Сервис управления подписками"""

from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

from src.subscription.models import UserSubscriptionModel, PaymentModel
from src.subscription.repository import (
    SubscriptionPlanRepository,
    UserSubscriptionRepository,
    PaymentRepository,
)
from src.subscription.enums import (
    PlanType, SubscriptionStatus, PaymentStatus, BillingPeriod
)
from src.subscription.exceptions import (
    PlanNotFoundError, SubscriptionNotFoundError, AlreadySubscribedError
)
from src.subscription.schemas import (
    SubscriptionOutputSchema, PlanOutputSchema, PaymentOutputSchema
)
from src.core.logger import get_logger

logger = get_logger(__name__)


class SubscriptionService:
    def __init__(
        self,
        plan_repo: SubscriptionPlanRepository,
        subscription_repo: UserSubscriptionRepository,
        payment_repo: PaymentRepository,
    ):
        self.plan_repo = plan_repo
        self.subscription_repo = subscription_repo
        self.payment_repo = payment_repo

    async def get_plans(self) -> list[PlanOutputSchema]:
        """Получить все активные тарифы"""
        plans = await self.plan_repo.get_all_active()
        return [PlanOutputSchema.from_model(p) for p in plans]

    async def get_user_subscription(self, user_id: int) -> SubscriptionOutputSchema | None:
        """Получить текущую подписку пользователя"""
        sub = await self.subscription_repo.get_active_by_user(user_id)
        if not sub:
            return None
        return self._sub_to_schema(sub)

    async def activate_subscription(
        self,
        user_id: int,
        plan_name: PlanType,
        billing_period: BillingPeriod,
        yookassa_payment_method_id: str | None = None,
    ) -> UserSubscriptionModel:
        """Активировать или обновить подписку после успешной оплаты"""
        plan = await self.plan_repo.get_by_name(plan_name)
        if not plan:
            raise PlanNotFoundError(plan_name=plan_name.value)

        # Деактивируем текущую подписку
        current = await self.subscription_repo.get_active_by_user(user_id)
        if current:
            await self.subscription_repo.update(
                current,
                status=SubscriptionStatus.EXPIRED,
                cancelled_at=datetime.now(timezone.utc),
            )

        # Вычисляем дату истечения
        now = datetime.now(timezone.utc)
        if billing_period == BillingPeriod.YEARLY:
            expires_at = now + relativedelta(years=1)
        else:
            expires_at = now + relativedelta(months=1)

        subscription = await self.subscription_repo.create(
            user_id=user_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            billing_period=billing_period,
            started_at=now,
            expires_at=expires_at,
            yookassa_payment_method_id=yookassa_payment_method_id,
            auto_renew=True,
        )

        logger.info(
            f"Подписка активирована: user={user_id}, plan={plan_name.value}, "
            f"expires={expires_at.isoformat()}"
        )
        return subscription

    async def cancel_subscription(self, user_id: int) -> SubscriptionOutputSchema:
        """Отменить подписку (действует до конца оплаченного периода)"""
        sub = await self.subscription_repo.get_active_by_user(user_id)
        if not sub:
            raise SubscriptionNotFoundError(user_id)

        sub = await self.subscription_repo.update(
            sub,
            status=SubscriptionStatus.CANCELLED,
            cancelled_at=datetime.now(timezone.utc),
            auto_renew=False,
        )

        logger.info(f"Подписка отменена: user={user_id}, действует до {sub.expires_at}")
        return self._sub_to_schema(sub)

    async def get_payment_history(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> list[PaymentOutputSchema]:
        """История платежей пользователя"""
        payments = await self.payment_repo.get_by_user(user_id, skip, limit)
        return [
            PaymentOutputSchema(
                id=p.id,
                amount_kop=p.amount_kop,
                currency=p.currency,
                status=p.status,
                payment_method_type=p.payment_method_type,
                description=p.description,
                paid_at=p.paid_at,
                created_at=p.created_at,
            )
            for p in payments
        ]

    async def record_payment(
        self,
        user_id: int,
        amount_kop: int,
        yookassa_payment_id: str,
        subscription_id: int | None = None,
        description: str | None = None,
        extra_data: dict | None = None,
    ) -> PaymentModel:
        """Создать запись о платеже"""
        return await self.payment_repo.create(
            user_id=user_id,
            subscription_id=subscription_id,
            amount_kop=amount_kop,
            yookassa_payment_id=yookassa_payment_id,
            description=description,
            extra_data=extra_data,
        )

    async def mark_payment_succeeded(
        self,
        yookassa_payment_id: str,
        payment_method_type: str | None = None,
    ) -> PaymentModel | None:
        """Пометить платёж как успешный"""
        payment = await self.payment_repo.get_by_yookassa_id(yookassa_payment_id)
        if not payment:
            logger.warning(f"Платёж не найден: {yookassa_payment_id}")
            return None

        return await self.payment_repo.update(
            payment,
            status=PaymentStatus.SUCCEEDED,
            yookassa_status="succeeded",
            payment_method_type=payment_method_type,
            paid_at=datetime.now(timezone.utc),
        )

    def _sub_to_schema(self, sub: UserSubscriptionModel) -> SubscriptionOutputSchema:
        return SubscriptionOutputSchema(
            id=sub.id,
            plan=PlanOutputSchema.from_model(sub.plan),
            status=sub.status,
            billing_period=sub.billing_period,
            started_at=sub.started_at,
            expires_at=sub.expires_at,
            cancelled_at=sub.cancelled_at,
            auto_renew=sub.auto_renew,
        )
