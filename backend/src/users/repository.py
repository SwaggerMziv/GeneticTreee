from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete as sql_delete
from sqlalchemy.orm import selectinload

from src.users.models import UserModel
from src.users.repository_abstract import UserRepositoryAbstract
from src.exceptions import handle_database_errors
from src.users.exceptions import (
    UserNotFoundError,
)


class UserRepository(UserRepositoryAbstract[UserModel]):
    """Репозиторий для работы с пользователями"""

    def __init__(self, session: AsyncSession):
        super().__init__(UserModel, session)

    # Базовые CRUD операции
    @handle_database_errors
    async def create(self, **kwargs) -> UserModel:
        """Создать нового пользователя"""
        user = self.model(**kwargs)
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    @handle_database_errors
    async def get_by_id(self, id: int) -> Optional[UserModel]:
        """Получить пользователя по ID"""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[UserModel]:
        """Получить всех пользователей с пагинацией"""
        result = await self.session.execute(
            select(self.model)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def update(self, id: int, **kwargs) -> Optional[UserModel]:
        """Обновить пользователя"""
        user = await self.get_by_id(id)
        if not user:
            raise UserNotFoundError("id", id)

        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        await self.session.flush()
        await self.session.refresh(user)
        return user
    @handle_database_errors
    async def update_superuser(self, id: int, is_superuser: bool) -> Optional[UserModel]:
        """Обновить статус суперпользователя"""
        user = await self.get_by_id(id)
        if not user:
            raise UserNotFoundError("id", id)
        user.is_superuser = is_superuser
        await self.session.flush()
        await self.session.refresh(user)
        return user
    
    @handle_database_errors
    async def delete(self, id: int) -> bool:
        """Удалить пользователя"""
        user = await self.get_by_id(id)
        if not user:
            raise UserNotFoundError("id", id)

        await self.session.delete(user)
        await self.session.flush()
        return True

    # Специфичные методы для пользователей
    @handle_database_errors
    async def get_by_username(self, username: str) -> Optional[UserModel]:
        """Получить пользователя по username"""
        result = await self.session.execute(
            select(self.model).where(self.model.username == username)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_by_email(self, email: str) -> Optional[UserModel]:
        """Получить пользователя по email"""
        result = await self.session.execute(
            select(self.model).where(self.model.email == email)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_by_telegram_id(self, telegram_id: str) -> Optional[UserModel]:
        """Получить пользователя по telegram_id"""
        result = await self.session.execute(
            select(self.model).where(self.model.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_with_relatives(self, user_id: int) -> Optional[UserModel]:
        """Получить пользователя с предзагруженными родственниками"""
        result = await self.session.execute(
            select(self.model)
            .options(selectinload(self.model.relatives))
            .where(self.model.id == user_id)
        )
        return result.scalar_one_or_none()

    # ===== НОВЫЕ МЕТОДЫ =====

    # Массовые операции
    @handle_database_errors
    async def bulk_create(self, items: List[Dict[str, Any]]) -> List[UserModel]:
        """Массовое создание пользователей"""
        users = [self.model(**item) for item in items]
        self.session.add_all(users)
        await self.session.flush()
        for user in users:
            await self.session.refresh(user)
        return users

    @handle_database_errors
    async def bulk_update(self, updates: List[Dict[str, Any]]) -> List[UserModel]:
        """Массовое обновление пользователей"""
        updated_users = []
        for update_data in updates:
            user_id = update_data.pop('id', None)
            if not user_id:
                continue
            user = await self.get_by_id(user_id)
            if user:
                for key, value in update_data.items():
                    if hasattr(user, key):
                        setattr(user, key, value)
                updated_users.append(user)
        await self.session.flush()
        for user in updated_users:
            await self.session.refresh(user)
        return updated_users

    @handle_database_errors
    async def bulk_delete(self, ids: List[int]) -> int:
        """Массовое удаление пользователей"""
        result = await self.session.execute(
            sql_delete(self.model).where(self.model.id.in_(ids))
        )
        await self.session.flush()
        return result.rowcount

    # Проверки и подсчет
    @handle_database_errors
    async def exists(self, id: int) -> bool:
        """Проверить существование пользователя по ID"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model).where(self.model.id == id)
        )
        return result.scalar() > 0

    @handle_database_errors
    async def count(self) -> int:
        """Подсчитать общее количество пользователей"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar()

    # Фильтрация
    @handle_database_errors
    async def find_by_filter(self, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[UserModel]:
        """Найти пользователей по фильтрам"""
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value)
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def find_one_by_filter(self, **filters) -> Optional[UserModel]:
        """Найти одного пользователя по фильтрам"""
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    # Операции с активностью
    @handle_database_errors
    async def activate(self, id: int) -> Optional[UserModel]:
        """Активировать пользователя"""
        user = await self.get_by_id(id)
        if not user:
            raise UserNotFoundError("id", id)
        user.is_active = True
        await self.session.flush()
        await self.session.refresh(user)
        return user

    @handle_database_errors
    async def deactivate(self, id: int) -> Optional[UserModel]:
        """Деактивировать пользователя"""
        user = await self.get_by_id(id)
        if not user:
            raise UserNotFoundError("id", id)
        user.is_active = False
        await self.session.flush()
        await self.session.refresh(user)
        return user

    @handle_database_errors
    async def get_active(self, skip: int = 0, limit: int = 100) -> List[UserModel]:
        """Получить всех активных пользователей"""
        result = await self.session.execute(
            select(self.model)
            .where(self.model.is_active == True)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    # Специфичные методы пользователей
    @handle_database_errors
    async def is_username_taken(self, username: str, exclude_id: Optional[int] = None) -> bool:
        """Проверить занят ли username"""
        query = select(func.count()).select_from(self.model).where(self.model.username == username)
        if exclude_id:
            query = query.where(self.model.id != exclude_id)
        result = await self.session.execute(query)
        return result.scalar() > 0

    @handle_database_errors
    async def is_email_taken(self, email: str, exclude_id: Optional[int] = None) -> bool:
        """Проверить занят ли email"""
        query = select(func.count()).select_from(self.model).where(self.model.email == email)
        if exclude_id:
            query = query.where(self.model.id != exclude_id)
        result = await self.session.execute(query)
        return result.scalar() > 0

    @handle_database_errors
    async def search_users(self, search_term: str, skip: int = 0, limit: int = 100) -> List[UserModel]:
        """Поиск пользователей по username или email"""
        search_pattern = f"%{search_term}%"
        result = await self.session.execute(
            select(self.model)
            .where(
                or_(
                    self.model.username.ilike(search_pattern),
                    self.model.email.ilike(search_pattern)
                )
            )
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_users_by_ids(self, ids: List[int]) -> List[UserModel]:
        """Получить пользователей по списку ID"""
        result = await self.session.execute(
            select(self.model).where(self.model.id.in_(ids))
        )
        return list(result.scalars().all())

