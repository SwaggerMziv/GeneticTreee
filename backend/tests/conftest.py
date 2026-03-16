"""
Root conftest.py — тестовая инфраструктура для backend.
Переопределяет БД на SQLite (aiosqlite), мокает S3, настраивает auth fixtures.
"""
import os

# Устанавливаем тестовые переменные окружения ДО импорта src модулей
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_USERNAME", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")
os.environ.setdefault("DATABASE_NAME", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-jwt-tokens-32chars!")
os.environ.setdefault("BUCKET_NAME", "test-bucket")
os.environ.setdefault("ACCESS_KEY_ID", "test-access-key")
os.environ.setdefault("SECRET_ACCESS_KEY", "test-secret-key")
os.environ.setdefault("ENDPOINT_URL", "https://test-s3.example.com")
os.environ.setdefault("REGION_NAME", "us-east-1")
os.environ.setdefault("OPENROUTER_API_KEY", "test-openrouter-key")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ")
os.environ.setdefault("TELEGRAM_BOT_USERNAME", "test_bot")
os.environ.setdefault("ALLOW_ORIGINS", "*")

import pytest
import asyncio
import uuid
from typing import AsyncGenerator, Generator

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient, ASGITransport

from src.database.base import Base

# Импорт всех моделей для metadata
from src.users.models import UserModel  # noqa: F401
from src.family.models import FamilyRelationModel, FamilyRelationshipModel  # noqa: F401
from src.admin.models import AdminAuditLogModel, AIUsageLogModel, BookGenerationModel  # noqa: F401
from src.ai.models import AIChatSessionModel  # noqa: F401
from src.subscription.models import (  # noqa: F401
    SubscriptionPlanModel,
    UserSubscriptionModel,
    PaymentModel,
    UsageQuotaModel,
)

from src.auth.security import (
    create_access_token_for_user,
    create_refresh_token_for_user,
)
from src.users.security import hash_password
from src.subscription.enums import PlanType


# ============ Database Fixtures ============

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Единый event loop для всей сессии тестов."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """In-memory SQLite engine для тестов."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def test_session(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Отдельная сессия на каждый тест с rollback."""
    session_factory = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


# ============ App & Client Fixtures ============


class MockS3Manager:
    """Мок S3 менеджера — хранит файлы в памяти."""

    def __init__(self):
        self.files: dict[str, bytes] = {}
        self._counter = 0

    async def upload(self, file):
        self._counter += 1
        key = f"uploads/{self._counter}/{file.filename}"
        url = f"https://mock.s3/test-bucket/{key}"
        content = await file.read()
        self.files[url] = content
        ct = file.content_type or "image/jpeg"
        return key, url, ct

    async def upload_bytes(self, data: bytes, filename: str, content_type: str):
        self._counter += 1
        key = f"uploads/{self._counter}/{filename}"
        url = f"https://mock.s3/test-bucket/{key}"
        self.files[url] = data
        return key, url, content_type

    async def delete(self, url: str):
        self.files.pop(url, None)


@pytest.fixture(scope="function")
def mock_s3() -> MockS3Manager:
    return MockS3Manager()


@pytest.fixture(scope="function")
async def app(test_engine: AsyncEngine, test_session: AsyncSession, mock_s3: MockS3Manager):
    """FastAPI app с подменёнными зависимостями."""
    from src.main import app as fastapi_app
    from src.database.client import get_session
    from src.storage.s3.dependencies import get_s3_manager

    async def override_get_session():
        yield test_session

    fastapi_app.dependency_overrides[get_session] = override_get_session
    fastapi_app.dependency_overrides[get_s3_manager] = lambda: mock_s3

    yield fastapi_app

    fastapi_app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """HTTP клиент для тестов."""
    transport = ASGITransport(app=app)
    # Уникальный IP на тест, чтобы rate limiting не влиял на другие тесты
    default_headers = {"X-Forwarded-For": f"198.51.100.{uuid.uuid4().int % 250 + 1}"}
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=default_headers,
    ) as ac:
        yield ac


# ============ Auth Fixtures ============

@pytest.fixture(scope="function")
async def test_user(test_session: AsyncSession) -> UserModel:
    """Создать тестового пользователя в БД."""
    hashed = await hash_password("TestPassword1!")
    user = UserModel(
        id=None,
        username="testuser",
        email="test@example.com",
        password=hashed,
        telegram_id=None,
        is_active=True,
        is_superuser=False,
    )
    test_session.add(user)
    await test_session.flush()
    await test_session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def superuser(test_session: AsyncSession) -> UserModel:
    """Создать суперпользователя."""
    hashed = await hash_password("AdminPass123!")
    user = UserModel(
        id=None,
        username="superadmin",
        email="admin@example.com",
        password=hashed,
        telegram_id=None,
        is_active=True,
        is_superuser=True,
    )
    test_session.add(user)
    await test_session.flush()
    await test_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user: UserModel) -> dict[str, str]:
    """Authorization headers для test_user."""
    token = create_access_token_for_user(user_id=test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def superuser_headers(superuser: UserModel) -> dict[str, str]:
    """Authorization headers для superuser."""
    token = create_access_token_for_user(user_id=superuser.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def refresh_headers(test_user: UserModel) -> dict[str, str]:
    """Refresh token headers для test_user."""
    token = create_refresh_token_for_user(user_id=test_user.id)
    return {"Authorization": f"Bearer {token}"}


# ============ Subscription / Plans Fixtures ============


@pytest.fixture(scope="function")
async def seed_plans(test_session: AsyncSession) -> list[SubscriptionPlanModel]:
    """Создать FREE/PRO/PREMIUM тарифные планы."""
    plans_data = [
        {
            "name": PlanType.FREE,
            "display_name": "Бесплатный",
            "description": "Базовый план",
            "price_monthly_kop": 0,
            "price_yearly_kop": 0,
            "max_relatives": 15,
            "max_ai_requests_month": 10,
            "max_ai_smart_requests_month": 0,
            "max_tree_generations_month": 2,
            "max_book_generations_month": 0,
            "max_telegram_invitations": 3,
            "max_telegram_sessions_month": 5,
            "max_storage_mb": 50,
            "max_tts_month": 0,
            "has_gedcom_export": False,
            "has_priority_support": False,
            "is_active": True,
            "sort_order": 0,
        },
        {
            "name": PlanType.PRO,
            "display_name": "Про",
            "description": "Расширенный план",
            "price_monthly_kop": 29900,
            "price_yearly_kop": 299000,
            "max_relatives": 100,
            "max_ai_requests_month": 100,
            "max_ai_smart_requests_month": 20,
            "max_tree_generations_month": 20,
            "max_book_generations_month": 5,
            "max_telegram_invitations": 20,
            "max_telegram_sessions_month": 50,
            "max_storage_mb": 500,
            "max_tts_month": 50,
            "has_gedcom_export": True,
            "has_priority_support": False,
            "is_active": True,
            "sort_order": 1,
        },
        {
            "name": PlanType.PREMIUM,
            "display_name": "Премиум",
            "description": "Максимальный план",
            "price_monthly_kop": 59900,
            "price_yearly_kop": 599000,
            "max_relatives": -1,
            "max_ai_requests_month": -1,
            "max_ai_smart_requests_month": -1,
            "max_tree_generations_month": -1,
            "max_book_generations_month": -1,
            "max_telegram_invitations": -1,
            "max_telegram_sessions_month": -1,
            "max_storage_mb": -1,
            "max_tts_month": -1,
            "has_gedcom_export": True,
            "has_priority_support": True,
            "is_active": True,
            "sort_order": 2,
        },
    ]

    plans = []
    for data in plans_data:
        plan = SubscriptionPlanModel(id=None, **data)
        test_session.add(plan)
        plans.append(plan)

    await test_session.flush()
    for plan in plans:
        await test_session.refresh(plan)
    return plans


# ============ Family Fixtures ============

@pytest.fixture(scope="function")
async def test_relative(test_session: AsyncSession, test_user: UserModel) -> FamilyRelationModel:
    """Создать тестового родственника."""
    from src.family.enums import Gender

    relative = FamilyRelationModel(
        id=None,
        user_id=test_user.id,
        first_name="Иван",
        last_name="Иванов",
        middle_name="Петрович",
        gender=Gender.MALE,
        image_url=None,
        birth_date=None,
        death_date=None,
        contact_info=None,
        telegram_id=None,
        invitation_token=None,
        telegram_user_id=None,
        is_activated=False,
        activated_at=None,
        context={},
        generation=0,
        is_active=True,
    )
    test_session.add(relative)
    await test_session.flush()
    await test_session.refresh(relative)
    return relative


@pytest.fixture(scope="function")
async def second_relative(test_session: AsyncSession, test_user: UserModel) -> FamilyRelationModel:
    """Второй тестовый родственник для связей."""
    from src.family.enums import Gender

    relative = FamilyRelationModel(
        id=None,
        user_id=test_user.id,
        first_name="Мария",
        last_name="Иванова",
        middle_name=None,
        gender=Gender.FEMALE,
        image_url=None,
        birth_date=None,
        death_date=None,
        contact_info=None,
        telegram_id=None,
        invitation_token=None,
        telegram_user_id=None,
        is_activated=False,
        activated_at=None,
        context={},
        generation=1,
        is_active=True,
    )
    test_session.add(relative)
    await test_session.flush()
    await test_session.refresh(relative)
    return relative


# ============ Second User Fixtures (for IDOR tests) ============

@pytest.fixture(scope="function")
async def other_user(test_session: AsyncSession) -> UserModel:
    """Второй пользователь для тестов изоляции."""
    hashed = await hash_password("OtherPass123!")
    user = UserModel(
        id=None,
        username="otheruser",
        email="other@example.com",
        password=hashed,
        telegram_id=None,
        is_active=True,
        is_superuser=False,
    )
    test_session.add(user)
    await test_session.flush()
    await test_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def other_user_headers(other_user: UserModel) -> dict[str, str]:
    """Auth headers для другого пользователя."""
    token = create_access_token_for_user(user_id=other_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
async def other_user_relative(
    test_session: AsyncSession, other_user: UserModel
) -> FamilyRelationModel:
    """Родственник другого пользователя."""
    from src.family.enums import Gender

    relative = FamilyRelationModel(
        id=None,
        user_id=other_user.id,
        first_name="Чужой",
        last_name="Родственник",
        middle_name=None,
        gender=Gender.MALE,
        image_url=None,
        birth_date=None,
        death_date=None,
        contact_info=None,
        telegram_id=None,
        invitation_token=None,
        telegram_user_id=None,
        is_activated=False,
        activated_at=None,
        context={},
        generation=0,
        is_active=True,
    )
    test_session.add(relative)
    await test_session.flush()
    await test_session.refresh(relative)
    return relative
