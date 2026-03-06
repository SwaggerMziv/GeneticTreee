from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.dependencies import get_database_session
from src.subscription.repository import (
    SubscriptionPlanRepository,
    UserSubscriptionRepository,
    PaymentRepository,
    UsageQuotaRepository,
)
from src.subscription.service import SubscriptionService
from src.subscription.quota_service import QuotaService
from src.subscription.payment_service import PaymentService


async def get_plan_repository(
    session: AsyncSession = Depends(get_database_session),
) -> SubscriptionPlanRepository:
    return SubscriptionPlanRepository(session)


async def get_subscription_repository(
    session: AsyncSession = Depends(get_database_session),
) -> UserSubscriptionRepository:
    return UserSubscriptionRepository(session)


async def get_payment_repository(
    session: AsyncSession = Depends(get_database_session),
) -> PaymentRepository:
    return PaymentRepository(session)


async def get_quota_repository(
    session: AsyncSession = Depends(get_database_session),
) -> UsageQuotaRepository:
    return UsageQuotaRepository(session)


async def get_subscription_service(
    plan_repo: SubscriptionPlanRepository = Depends(get_plan_repository),
    subscription_repo: UserSubscriptionRepository = Depends(get_subscription_repository),
    payment_repo: PaymentRepository = Depends(get_payment_repository),
) -> SubscriptionService:
    return SubscriptionService(plan_repo, subscription_repo, payment_repo)


async def get_quota_service(
    plan_repo: SubscriptionPlanRepository = Depends(get_plan_repository),
    subscription_repo: UserSubscriptionRepository = Depends(get_subscription_repository),
    quota_repo: UsageQuotaRepository = Depends(get_quota_repository),
    session: AsyncSession = Depends(get_database_session),
) -> QuotaService:
    return QuotaService(plan_repo, subscription_repo, quota_repo, session)


async def get_payment_service(
    plan_repo: SubscriptionPlanRepository = Depends(get_plan_repository),
    payment_repo: PaymentRepository = Depends(get_payment_repository),
) -> PaymentService:
    return PaymentService(plan_repo, payment_repo)
