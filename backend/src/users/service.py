from typing import Optional, List
from src.users.security import hash_password
from src.users.repository import UserRepository
from src.users.models import UserModel

from src.users.schemas import (
    UserCreateSchema,
    UserUpdateSchema,

)
from src.users.exceptions import UserNotFoundError
from src.core.logger import log_service_operation


class UserService:
    """Сервис для работы с пользователями"""

    def __init__(self, user_repository: UserRepository):
        self.repository = user_repository

    @log_service_operation
    async def create_user(self, user_data: UserCreateSchema) -> UserModel:
        user_data.password = await hash_password(user_data.password)
        user = await self.repository.create(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            telegram_id=user_data.telegram_id,
            is_active=True
        )
        return user

    @log_service_operation
    async def get_user_by_id(self, user_id: int) -> UserModel:
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UserNotFoundError("id", user_id)
        return user

    @log_service_operation
    async def get_user_by_username(self, username: str) -> UserModel:
        user = await self.repository.get_by_username(username)
        if not user:
            raise UserNotFoundError("username", username)
        return user

    @log_service_operation
    async def get_user_by_email(self, email: str) -> UserModel:
        user = await self.repository.get_by_email(email)
        if not user:
            raise UserNotFoundError("email", email)
        return user

    @log_service_operation
    async def update_user(self, user_id: int, user_data: UserUpdateSchema) -> UserModel:
        update_data = user_data.model_dump(exclude_unset=True)
        user = await self.repository.update(user_id, **update_data)
        return user

    @log_service_operation
    async def update_superuser(self, user_id: int, is_superuser: bool) -> UserModel:
        user = await self.repository.update_superuser(user_id, is_superuser)
        return user
    
    @log_service_operation
    async def deactivate_user(self, user_id: int) -> bool:
        result = await self.repository.deactivate(user_id)
        return result

    @log_service_operation
    async def activate_user(self, user_id: int) -> bool:
        result = await self.repository.activate(user_id)
        return result

    @log_service_operation
    async def delete_user(self, user_id: int) -> bool:
        result = await self.repository.delete(user_id)
        return result

    @log_service_operation
    async def search_users(self, search_term: str, skip: int = 0, limit: int = 100) -> List[UserModel]:
        users = await self.repository.search_users(search_term, skip, limit)
        return users

    @log_service_operation
    async def get_all_users(self, skip: int = 0, limit: int = 100, only_active: bool = True) -> List[UserModel]:
        if only_active:
            users = await self.repository.get_active(skip, limit)
        else:
            users = await self.repository.get_all(skip, limit)
        return users

    @log_service_operation
    async def get_or_create_telegram_user(self, telegram_id: str, username: str | None, first_name: str) -> UserModel:
        """Получить или создать пользователя по Telegram ID"""
        user = await self.repository.get_by_telegram_id(telegram_id)
        if user:
            return user

        generated_username = username or f"tg_{telegram_id}"
        base_username = generated_username
        counter = 1
        while await self.repository.is_username_taken(generated_username):
            generated_username = f"{base_username}_{counter}"
            counter += 1

        user = await self.repository.create(
            username=generated_username,
            telegram_id=telegram_id,
            is_active=True
        )
        return user

