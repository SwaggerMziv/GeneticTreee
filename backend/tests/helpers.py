"""
Вспомогательные функции для тестов.
"""
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.users.models import UserModel
from src.users.security import hash_password
from src.auth.security import create_access_token_for_user, create_refresh_token_for_user
from src.family.models import FamilyRelationModel, FamilyRelationshipModel
from src.family.enums import Gender, RelationshipType


async def create_test_user(
    session: AsyncSession,
    username: str = "testuser",
    email: str | None = "test@example.com",
    password: str = "TestPassword1!",
    is_active: bool = True,
    is_superuser: bool = False,
    telegram_id: str | None = None,
) -> UserModel:
    """Создать пользователя в тестовой БД."""
    hashed = await hash_password(password)
    user = UserModel(
        id=None,
        username=username,
        email=email,
        password=hashed,
        telegram_id=telegram_id,
        is_active=is_active,
        is_superuser=is_superuser,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


def get_auth_headers(user_id: int) -> dict[str, str]:
    """Получить Authorization headers для user_id."""
    token = create_access_token_for_user(user_id=user_id)
    return {"Authorization": f"Bearer {token}"}


def get_refresh_headers(user_id: int) -> dict[str, str]:
    """Получить refresh token headers."""
    token = create_refresh_token_for_user(user_id=user_id)
    return {"Authorization": f"Bearer {token}"}


async def create_test_relative(
    session: AsyncSession,
    user_id: int,
    first_name: str = "Тест",
    last_name: str = "Тестов",
    gender: Gender = Gender.MALE,
    **kwargs,
) -> FamilyRelationModel:
    """Создать родственника в тестовой БД."""
    defaults = dict(
        id=None,
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        middle_name=None,
        gender=gender,
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
    defaults.update(kwargs)
    relative = FamilyRelationModel(**defaults)
    session.add(relative)
    await session.flush()
    await session.refresh(relative)
    return relative


async def create_test_relationship(
    session: AsyncSession,
    user_id: int,
    from_relative_id: int,
    to_relative_id: int,
    relationship_type: RelationshipType = RelationshipType.FATHER,
) -> FamilyRelationshipModel:
    """Создать связь между родственниками."""
    rel = FamilyRelationshipModel(
        id=None,
        user_id=user_id,
        from_relative_id=from_relative_id,
        to_relative_id=to_relative_id,
        relationship_type=relationship_type,
        is_active=True,
    )
    session.add(rel)
    await session.flush()
    await session.refresh(rel)
    return rel


async def login_user(
    client: AsyncClient,
    username: str = "testuser",
    password: str = "TestPassword1!",
) -> dict:
    """Залогиниться через API и вернуть токены."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "email": None, "password": password},
    )
    return response.json()
