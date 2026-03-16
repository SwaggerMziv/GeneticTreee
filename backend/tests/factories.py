"""
Factory-boy фабрики для создания тестовых данных.
Используются для генерации данных в unit-тестах с mock-репозиториями.
"""
from datetime import datetime, timezone
from unittest.mock import MagicMock

from src.users.models import UserModel
from src.family.models import FamilyRelationModel, FamilyRelationshipModel
from src.family.enums import Gender, RelationshipType
from src.subscription.models import SubscriptionPlanModel, UsageQuotaModel, UserSubscriptionModel
from src.subscription.enums import PlanType, SubscriptionStatus, BillingPeriod


def make_user(
    id: int = 1,
    username: str = "testuser",
    email: str | None = "test@example.com",
    password: str = "pbkdf2$sha256$310000$dGVzdHNhbHQ=$dGVzdGhhc2g=",
    telegram_id: str | None = None,
    is_active: bool = True,
    is_superuser: bool = False,
) -> UserModel:
    """Создать mock UserModel без БД."""
    user = MagicMock(spec=UserModel)
    user.id = id
    user.username = username
    user.email = email
    user.password = password
    user.telegram_id = telegram_id
    user.is_active = is_active
    user.is_superuser = is_superuser
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    return user


def make_relative(
    id: int = 1,
    user_id: int = 1,
    first_name: str = "Иван",
    last_name: str = "Иванов",
    gender: Gender = Gender.MALE,
    is_active: bool = True,
    context: dict | None = None,
    **kwargs,
) -> FamilyRelationModel:
    """Создать mock FamilyRelationModel без БД."""
    rel = MagicMock(spec=FamilyRelationModel)
    rel.id = id
    rel.user_id = user_id
    rel.first_name = first_name
    rel.last_name = last_name
    rel.middle_name = kwargs.get("middle_name")
    rel.gender = gender
    rel.image_url = kwargs.get("image_url")
    rel.birth_date = kwargs.get("birth_date")
    rel.death_date = kwargs.get("death_date")
    rel.contact_info = kwargs.get("contact_info")
    rel.telegram_id = kwargs.get("telegram_id")
    rel.invitation_token = kwargs.get("invitation_token")
    rel.telegram_user_id = kwargs.get("telegram_user_id")
    rel.is_activated = kwargs.get("is_activated", False)
    rel.activated_at = kwargs.get("activated_at")
    rel.context = context or {}
    rel.generation = kwargs.get("generation", 0)
    rel.is_active = is_active
    rel.created_at = datetime.now(timezone.utc)
    rel.updated_at = datetime.now(timezone.utc)
    return rel


def make_relationship(
    id: int = 1,
    user_id: int = 1,
    from_relative_id: int = 1,
    to_relative_id: int = 2,
    relationship_type: RelationshipType = RelationshipType.FATHER,
    is_active: bool = True,
) -> FamilyRelationshipModel:
    """Создать mock FamilyRelationshipModel."""
    rel = MagicMock(spec=FamilyRelationshipModel)
    rel.id = id
    rel.user_id = user_id
    rel.from_relative_id = from_relative_id
    rel.to_relative_id = to_relative_id
    rel.relationship_type = relationship_type
    rel.is_active = is_active
    rel.created_at = datetime.now(timezone.utc)
    return rel


def make_plan(
    id: int = 1,
    name: PlanType = PlanType.FREE,
    display_name: str = "Бесплатный",
    max_relatives: int = 15,
    max_ai_requests_month: int = 10,
    max_ai_smart_requests_month: int = 0,
    max_tree_generations_month: int = 2,
    max_book_generations_month: int = 0,
    max_telegram_invitations: int = 3,
    max_telegram_sessions_month: int = 5,
    max_storage_mb: int = 50,
    max_tts_month: int = 0,
    **kwargs,
) -> SubscriptionPlanModel:
    """Создать mock SubscriptionPlanModel."""
    plan = MagicMock(spec=SubscriptionPlanModel)
    plan.id = id
    plan.name = name
    plan.display_name = display_name
    plan.description = kwargs.get("description")
    plan.price_monthly_kop = kwargs.get("price_monthly_kop", 0)
    plan.price_yearly_kop = kwargs.get("price_yearly_kop", 0)
    plan.max_relatives = max_relatives
    plan.max_ai_requests_month = max_ai_requests_month
    plan.max_ai_smart_requests_month = max_ai_smart_requests_month
    plan.max_tree_generations_month = max_tree_generations_month
    plan.max_book_generations_month = max_book_generations_month
    plan.max_telegram_invitations = max_telegram_invitations
    plan.max_telegram_sessions_month = max_telegram_sessions_month
    plan.max_storage_mb = max_storage_mb
    plan.max_tts_month = max_tts_month
    plan.has_gedcom_export = kwargs.get("has_gedcom_export", False)
    plan.has_priority_support = kwargs.get("has_priority_support", False)
    plan.is_active = kwargs.get("is_active", True)
    plan.sort_order = kwargs.get("sort_order", 0)
    return plan


def make_quota(
    id: int = 1,
    user_id: int = 1,
    ai_requests_used: int = 0,
    ai_smart_requests_used: int = 0,
    tree_generations_used: int = 0,
    book_generations_used: int = 0,
    telegram_sessions_used: int = 0,
    tts_used: int = 0,
    storage_used_mb: int = 0,
) -> UsageQuotaModel:
    """Создать mock UsageQuotaModel."""
    now = datetime.now(timezone.utc)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    period_end = now.replace(day=28, hour=23, minute=59, second=59)

    quota = MagicMock(spec=UsageQuotaModel)
    quota.id = id
    quota.user_id = user_id
    quota.period_start = period_start
    quota.period_end = period_end
    quota.ai_requests_used = ai_requests_used
    quota.ai_smart_requests_used = ai_smart_requests_used
    quota.tree_generations_used = tree_generations_used
    quota.book_generations_used = book_generations_used
    quota.telegram_sessions_used = telegram_sessions_used
    quota.tts_used = tts_used
    quota.storage_used_mb = storage_used_mb
    quota.created_at = now
    return quota
