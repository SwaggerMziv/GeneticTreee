"""Сервис проверки и управления квотами пользователей"""

from datetime import datetime, timezone
from calendar import monthrange

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.subscription.models import (
    SubscriptionPlanModel, UserSubscriptionModel, UsageQuotaModel
)
from src.subscription.repository import (
    SubscriptionPlanRepository, UserSubscriptionRepository, UsageQuotaRepository
)
from src.subscription.enums import PlanType, SubscriptionStatus, QuotaResource
from src.subscription.exceptions import QuotaExceededError
from src.subscription.schemas import QuotaItemSchema, UsageSummarySchema, PlanOutputSchema
from src.core.logger import get_logger

logger = get_logger(__name__)

# Маппинг ресурсов на поля моделей
RESOURCE_TO_QUOTA_FIELD = {
    QuotaResource.AI_REQUESTS: "ai_requests_used",
    QuotaResource.AI_SMART_REQUESTS: "ai_smart_requests_used",
    QuotaResource.TREE_GENERATIONS: "tree_generations_used",
    QuotaResource.BOOK_GENERATIONS: "book_generations_used",
    QuotaResource.TELEGRAM_SESSIONS: "telegram_sessions_used",
    QuotaResource.TTS: "tts_used",
}

RESOURCE_TO_PLAN_LIMIT = {
    QuotaResource.AI_REQUESTS: "max_ai_requests_month",
    QuotaResource.AI_SMART_REQUESTS: "max_ai_smart_requests_month",
    QuotaResource.TREE_GENERATIONS: "max_tree_generations_month",
    QuotaResource.BOOK_GENERATIONS: "max_book_generations_month",
    QuotaResource.TELEGRAM_INVITATIONS: "max_telegram_invitations",
    QuotaResource.TELEGRAM_SESSIONS: "max_telegram_sessions_month",
    QuotaResource.TTS: "max_tts_month",
    QuotaResource.STORAGE_MB: "max_storage_mb",
    QuotaResource.RELATIVES: "max_relatives",
}

RESOURCE_DISPLAY_NAMES = {
    QuotaResource.AI_REQUESTS: "AI-запросы",
    QuotaResource.AI_SMART_REQUESTS: "AI Smart (GPT-4o)",
    QuotaResource.TREE_GENERATIONS: "Генерация дерева",
    QuotaResource.BOOK_GENERATIONS: "PDF-книга",
    QuotaResource.TELEGRAM_INVITATIONS: "Telegram-приглашения",
    QuotaResource.TELEGRAM_SESSIONS: "Telegram-интервью",
    QuotaResource.TTS: "TTS-озвучка",
    QuotaResource.STORAGE_MB: "Хранилище (МБ)",
    QuotaResource.RELATIVES: "Родственники",
}


class QuotaService:
    def __init__(
        self,
        plan_repo: SubscriptionPlanRepository,
        subscription_repo: UserSubscriptionRepository,
        quota_repo: UsageQuotaRepository,
        session: AsyncSession,
    ):
        self.plan_repo = plan_repo
        self.subscription_repo = subscription_repo
        self.quota_repo = quota_repo
        self.session = session

    async def get_user_plan(self, user_id: int) -> SubscriptionPlanModel:
        """Получить текущий план пользователя. FREE если нет активной подписки."""
        subscription = await self.subscription_repo.get_active_by_user(user_id)
        if subscription and subscription.plan:
            return subscription.plan

        # Возвращаем FREE план
        free_plan = await self.plan_repo.get_by_name(PlanType.FREE)
        if not free_plan:
            logger.error("FREE план не найден в БД! Создайте seed-данные.")
            raise RuntimeError("FREE план не найден. Выполните seed_plans().")
        return free_plan

    async def get_or_create_quota(self, user_id: int) -> UsageQuotaModel:
        """Получить или создать квоту за текущий месяц"""
        quota = await self.quota_repo.get_current(user_id)
        if quota:
            return quota

        # Создаём квоту на текущий месяц
        now = datetime.now(timezone.utc)
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day = monthrange(now.year, now.month)[1]
        period_end = period_start.replace(day=last_day, hour=23, minute=59, second=59)

        quota = await self.quota_repo.create(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
        )
        return quota

    async def check_quota(self, user_id: int, resource: QuotaResource) -> bool:
        """Проверить, можно ли выполнить операцию. True = можно."""
        plan = await self.get_user_plan(user_id)
        limit_field = RESOURCE_TO_PLAN_LIMIT.get(resource)
        if not limit_field:
            return True

        limit = getattr(plan, limit_field, -1)
        if limit == -1:
            return True  # Безлимит

        if limit == 0:
            return False  # Фича недоступна на этом плане

        # Для relatives и telegram_invitations — абсолютный лимит, не месячный
        if resource == QuotaResource.RELATIVES:
            return await self._check_relatives_count(user_id, limit)
        if resource == QuotaResource.TELEGRAM_INVITATIONS:
            return await self._check_invitations_count(user_id, limit)

        # Месячные квоты
        quota = await self.get_or_create_quota(user_id)
        quota_field = RESOURCE_TO_QUOTA_FIELD.get(resource)
        if not quota_field:
            return True

        used = getattr(quota, quota_field, 0)
        return used < limit

    async def enforce_quota(self, user_id: int, resource: QuotaResource) -> None:
        """Проверить квоту и бросить исключение, если превышена"""
        plan = await self.get_user_plan(user_id)
        limit_field = RESOURCE_TO_PLAN_LIMIT.get(resource)
        if not limit_field:
            return

        limit = getattr(plan, limit_field, -1)
        if limit == -1:
            return

        if resource == QuotaResource.RELATIVES:
            count = await self._get_relatives_count(user_id)
            if count >= limit:
                raise QuotaExceededError(
                    resource=RESOURCE_DISPLAY_NAMES.get(resource, resource.value),
                    limit=limit,
                    used=count,
                )
            return

        if resource == QuotaResource.TELEGRAM_INVITATIONS:
            count = await self._get_invitations_count(user_id)
            if count >= limit:
                raise QuotaExceededError(
                    resource=RESOURCE_DISPLAY_NAMES.get(resource, resource.value),
                    limit=limit,
                    used=count,
                )
            return

        if limit == 0:
            raise QuotaExceededError(
                resource=RESOURCE_DISPLAY_NAMES.get(resource, resource.value),
                limit=0,
                used=0,
            )

        quota = await self.get_or_create_quota(user_id)
        quota_field = RESOURCE_TO_QUOTA_FIELD.get(resource)
        if not quota_field:
            return

        used = getattr(quota, quota_field, 0)
        if used >= limit:
            raise QuotaExceededError(
                resource=RESOURCE_DISPLAY_NAMES.get(resource, resource.value),
                limit=limit,
                used=used,
            )

    async def increment_quota(
        self, user_id: int, resource: QuotaResource, amount: int = 1
    ) -> None:
        """Увеличить счётчик использования после выполнения операции"""
        quota_field = RESOURCE_TO_QUOTA_FIELD.get(resource)
        if not quota_field:
            return

        quota = await self.get_or_create_quota(user_id)
        current = getattr(quota, quota_field, 0)
        await self.quota_repo.update(quota, **{quota_field: current + amount})

    async def get_usage_summary(self, user_id: int) -> UsageSummarySchema:
        """Сводка использования для UI"""
        plan = await self.get_user_plan(user_id)
        quota = await self.get_or_create_quota(user_id)

        quotas = []

        # Месячные квоты
        for resource, quota_field in RESOURCE_TO_QUOTA_FIELD.items():
            limit_field = RESOURCE_TO_PLAN_LIMIT.get(resource)
            if not limit_field:
                continue
            limit = getattr(plan, limit_field, 0)
            used = getattr(quota, quota_field, 0)
            quotas.append(QuotaItemSchema(
                resource=resource.value,
                display_name=RESOURCE_DISPLAY_NAMES.get(resource, resource.value),
                used=used,
                limit=limit,
                is_unlimited=limit == -1,
            ))

        # Абсолютные лимиты
        relatives_count = await self._get_relatives_count(user_id)
        quotas.append(QuotaItemSchema(
            resource=QuotaResource.RELATIVES.value,
            display_name=RESOURCE_DISPLAY_NAMES[QuotaResource.RELATIVES],
            used=relatives_count,
            limit=plan.max_relatives,
            is_unlimited=plan.max_relatives == -1,
        ))

        invitations_count = await self._get_invitations_count(user_id)
        quotas.append(QuotaItemSchema(
            resource=QuotaResource.TELEGRAM_INVITATIONS.value,
            display_name=RESOURCE_DISPLAY_NAMES[QuotaResource.TELEGRAM_INVITATIONS],
            used=invitations_count,
            limit=plan.max_telegram_invitations,
            is_unlimited=plan.max_telegram_invitations == -1,
        ))

        return UsageSummarySchema(
            plan=PlanOutputSchema.from_model(plan),
            quotas=quotas,
            period_start=quota.period_start,
            period_end=quota.period_end,
        )

    async def check_storage_limit(self, user_id: int, file_size_mb: float) -> bool:
        """Проверить, поместится ли файл в хранилище"""
        plan = await self.get_user_plan(user_id)
        if plan.max_storage_mb == -1:
            return True
        quota = await self.get_or_create_quota(user_id)
        return (quota.storage_used_mb + file_size_mb) <= plan.max_storage_mb

    async def increment_storage(self, user_id: int, file_size_mb: float) -> None:
        """Увеличить использование хранилища"""
        quota = await self.get_or_create_quota(user_id)
        await self.quota_repo.update(
            quota,
            storage_used_mb=quota.storage_used_mb + int(file_size_mb),
        )

    # --- Вспомогательные методы ---

    async def _get_relatives_count(self, user_id: int) -> int:
        from src.family.models import FamilyRelationModel
        result = await self.session.execute(
            select(func.count(FamilyRelationModel.id))
            .where(
                FamilyRelationModel.user_id == user_id,
                FamilyRelationModel.is_active == True,
            )
        )
        return result.scalar() or 0

    async def _check_relatives_count(self, user_id: int, limit: int) -> bool:
        count = await self._get_relatives_count(user_id)
        return count < limit

    async def _get_invitations_count(self, user_id: int) -> int:
        from src.family.models import FamilyRelationModel
        result = await self.session.execute(
            select(func.count(FamilyRelationModel.id))
            .where(
                FamilyRelationModel.user_id == user_id,
                FamilyRelationModel.invitation_token != None,
            )
        )
        return result.scalar() or 0

    async def _check_invitations_count(self, user_id: int, limit: int) -> bool:
        count = await self._get_invitations_count(user_id)
        return count < limit
