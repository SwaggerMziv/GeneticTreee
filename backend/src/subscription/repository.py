from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.exceptions import handle_database_errors
from src.subscription.models import (
    SubscriptionPlanModel,
    UserSubscriptionModel,
    PaymentModel,
    UsageQuotaModel,
)
from src.subscription.enums import (
    PlanType, SubscriptionStatus, PaymentStatus, BillingPeriod
)


class SubscriptionPlanRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @handle_database_errors
    async def get_all_active(self) -> list[SubscriptionPlanModel]:
        result = await self.session.execute(
            select(SubscriptionPlanModel)
            .where(SubscriptionPlanModel.is_active == True)
            .order_by(SubscriptionPlanModel.sort_order)
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_by_name(self, name: PlanType) -> Optional[SubscriptionPlanModel]:
        result = await self.session.execute(
            select(SubscriptionPlanModel)
            .where(SubscriptionPlanModel.name == name)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_by_id(self, plan_id: int) -> Optional[SubscriptionPlanModel]:
        result = await self.session.execute(
            select(SubscriptionPlanModel)
            .where(SubscriptionPlanModel.id == plan_id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def create(self, **kwargs) -> SubscriptionPlanModel:
        plan = SubscriptionPlanModel(**kwargs)
        self.session.add(plan)
        await self.session.flush()
        await self.session.refresh(plan)
        return plan


class UserSubscriptionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @handle_database_errors
    async def get_active_by_user(self, user_id: int) -> Optional[UserSubscriptionModel]:
        """Получить активную подписку пользователя"""
        result = await self.session.execute(
            select(UserSubscriptionModel)
            .options(joinedload(UserSubscriptionModel.plan))
            .where(
                UserSubscriptionModel.user_id == user_id,
                UserSubscriptionModel.status == SubscriptionStatus.ACTIVE,
            )
            .order_by(UserSubscriptionModel.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_by_user(self, user_id: int) -> list[UserSubscriptionModel]:
        """Все подписки пользователя"""
        result = await self.session.execute(
            select(UserSubscriptionModel)
            .options(joinedload(UserSubscriptionModel.plan))
            .where(UserSubscriptionModel.user_id == user_id)
            .order_by(UserSubscriptionModel.created_at.desc())
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def create(self, **kwargs) -> UserSubscriptionModel:
        subscription = UserSubscriptionModel(**kwargs)
        self.session.add(subscription)
        await self.session.flush()
        await self.session.refresh(subscription, attribute_names=["plan"])
        return subscription

    @handle_database_errors
    async def update(self, subscription: UserSubscriptionModel, **kwargs) -> UserSubscriptionModel:
        for key, value in kwargs.items():
            if hasattr(subscription, key):
                setattr(subscription, key, value)
        await self.session.flush()
        await self.session.refresh(subscription)
        return subscription

    @handle_database_errors
    async def get_expiring(self, before: datetime) -> list[UserSubscriptionModel]:
        """Подписки, истекающие до указанной даты"""
        result = await self.session.execute(
            select(UserSubscriptionModel)
            .options(joinedload(UserSubscriptionModel.plan))
            .where(
                UserSubscriptionModel.status == SubscriptionStatus.ACTIVE,
                UserSubscriptionModel.expires_at != None,
                UserSubscriptionModel.expires_at <= before,
                UserSubscriptionModel.auto_renew == True,
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_all_active(self, skip: int = 0, limit: int = 100) -> list[UserSubscriptionModel]:
        """Все активные подписки (для админки)"""
        result = await self.session.execute(
            select(UserSubscriptionModel)
            .options(joinedload(UserSubscriptionModel.plan))
            .where(UserSubscriptionModel.status == SubscriptionStatus.ACTIVE)
            .order_by(UserSubscriptionModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def count_by_plan(self) -> dict[str, int]:
        """Количество активных подписок по планам (для статистики)"""
        result = await self.session.execute(
            select(
                SubscriptionPlanModel.name,
                func.count(UserSubscriptionModel.id)
            )
            .join(SubscriptionPlanModel)
            .where(UserSubscriptionModel.status == SubscriptionStatus.ACTIVE)
            .group_by(SubscriptionPlanModel.name)
        )
        return {str(row[0].value): row[1] for row in result.all()}


class PaymentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @handle_database_errors
    async def create(self, **kwargs) -> PaymentModel:
        payment = PaymentModel(**kwargs)
        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    @handle_database_errors
    async def get_by_yookassa_id(self, yookassa_payment_id: str) -> Optional[PaymentModel]:
        result = await self.session.execute(
            select(PaymentModel)
            .where(PaymentModel.yookassa_payment_id == yookassa_payment_id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_by_user(
        self, user_id: int, skip: int = 0, limit: int = 50
    ) -> list[PaymentModel]:
        result = await self.session.execute(
            select(PaymentModel)
            .where(PaymentModel.user_id == user_id)
            .order_by(PaymentModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def update(self, payment: PaymentModel, **kwargs) -> PaymentModel:
        for key, value in kwargs.items():
            if hasattr(payment, key):
                setattr(payment, key, value)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    @handle_database_errors
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[PaymentModel]:
        result = await self.session.execute(
            select(PaymentModel)
            .order_by(PaymentModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_revenue_stats(self, since: datetime) -> dict:
        """Статистика выручки с указанной даты"""
        result = await self.session.execute(
            select(
                func.count(PaymentModel.id),
                func.coalesce(func.sum(PaymentModel.amount_kop), 0),
            )
            .where(
                PaymentModel.status == PaymentStatus.SUCCEEDED,
                PaymentModel.paid_at >= since,
            )
        )
        row = result.one()
        return {"count": row[0], "total_kop": row[1]}


class UsageQuotaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @handle_database_errors
    async def get_current(self, user_id: int) -> Optional[UsageQuotaModel]:
        """Получить квоту за текущий период"""
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(UsageQuotaModel)
            .where(
                UsageQuotaModel.user_id == user_id,
                UsageQuotaModel.period_start <= now,
                UsageQuotaModel.period_end > now,
            )
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def create(self, **kwargs) -> UsageQuotaModel:
        quota = UsageQuotaModel(**kwargs)
        self.session.add(quota)
        await self.session.flush()
        await self.session.refresh(quota)
        return quota

    @handle_database_errors
    async def update(self, quota: UsageQuotaModel, **kwargs) -> UsageQuotaModel:
        for key, value in kwargs.items():
            if hasattr(quota, key):
                setattr(quota, key, value)
        await self.session.flush()
        await self.session.refresh(quota)
        return quota
