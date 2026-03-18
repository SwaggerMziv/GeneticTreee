"""Seed-данные тарифных планов"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.subscription.models import SubscriptionPlanModel
from src.subscription.enums import PlanType
from src.core.logger import get_logger

logger = get_logger(__name__)

PLANS = [
    {
        "name": PlanType.FREE,
        "display_name": "Бесплатный",
        "description": "Базовый доступ для знакомства с платформой",
        "price_monthly_kop": 0,
        "price_yearly_kop": 0,
        "max_relatives": 20,
        "max_ai_requests_month": 20,
        "max_ai_smart_requests_month": 3,
        "max_tree_generations_month": 5,
        "max_book_generations_month": 1,
        "max_telegram_invitations": 5,
        "max_telegram_sessions_month": 10,
        "max_storage_mb": 100,
        "max_tts_month": 3,
        "has_gedcom_export": False,
        "has_priority_support": False,
        "sort_order": 0,
    },
    {
        "name": PlanType.PRO,
        "display_name": "Pro",
        "description": "Для активного сбора семейной истории",
        "price_monthly_kop": 100,  # 1 ₽ (тест)
        "price_yearly_kop": 100,  # 1 ₽ (тест)
        "max_relatives": 200,
        "max_ai_requests_month": 200,
        "max_ai_smart_requests_month": 30,
        "max_tree_generations_month": 50,
        "max_book_generations_month": 10,
        "max_telegram_invitations": 50,
        "max_telegram_sessions_month": 100,
        "max_storage_mb": 1024,
        "max_tts_month": 20,
        "has_gedcom_export": True,
        "has_priority_support": False,
        "sort_order": 1,
    },
    {
        "name": PlanType.PREMIUM,
        "display_name": "Premium",
        "description": "Максимум возможностей для всей семьи",
        "price_monthly_kop": 100,  # 1 ₽ (тест)
        "price_yearly_kop": 100,  # 1 ₽ (тест)
        "max_relatives": -1,  # безлимит
        "max_ai_requests_month": -1,
        "max_ai_smart_requests_month": -1,
        "max_tree_generations_month": -1,
        "max_book_generations_month": -1,
        "max_telegram_invitations": -1,
        "max_telegram_sessions_month": -1,
        "max_storage_mb": 10240,  # 10 GB
        "max_tts_month": -1,
        "has_gedcom_export": True,
        "has_priority_support": True,
        "sort_order": 2,
    },
]


async def seed_plans(session: AsyncSession) -> None:
    """Создать или обновить тарифные планы"""
    for plan_data in PLANS:
        result = await session.execute(
            select(SubscriptionPlanModel).where(
                SubscriptionPlanModel.name == plan_data["name"]
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            for key, value in plan_data.items():
                setattr(existing, key, value)
            logger.info(f"План обновлён: {plan_data['name'].value}")
        else:
            plan = SubscriptionPlanModel(**plan_data)
            session.add(plan)
            logger.info(f"План создан: {plan_data['name'].value}")

    await session.flush()
    logger.info("Seed тарифных планов завершён")
