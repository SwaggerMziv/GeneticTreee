from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.base import Base

ModelType = TypeVar('ModelType', bound=Base)


class RepositoryAbstract(ABC, Generic[ModelType]):
    """Базовый абстрактный репозиторий с общими CRUD операциями"""

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    @abstractmethod
    async def create(self, **kwargs) -> ModelType:
        """Создать новую запись"""
        pass

    @abstractmethod
    async def get_by_id(self, id: int) -> Optional[ModelType]:
        """Получить запись по ID"""
        pass

    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Получить все записи с пагинацией"""
        pass

    @abstractmethod
    async def update(self, id: int, **kwargs) -> Optional[ModelType]:
        """Обновить запись"""
        pass

    @abstractmethod
    async def delete(self, id: int) -> bool:
        """Удалить запись"""
        pass

    # ===== МАССОВЫЕ ОПЕРАЦИИ =====

    @abstractmethod
    async def bulk_create(self, items: List[Dict[str, Any]]) -> List[ModelType]:
        """Массовое создание записей"""
        pass

    @abstractmethod
    async def bulk_update(self, updates: List[Dict[str, Any]]) -> List[ModelType]:
        """Массовое обновление записей"""
        pass

    @abstractmethod
    async def bulk_delete(self, ids: List[int]) -> int:
        """Массовое удаление записей по ID"""
        pass

    # ===== ПРОВЕРКИ И ПОДСЧЕТ =====

    @abstractmethod
    async def exists(self, id: int) -> bool:
        """Проверить существование записи по ID"""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Подсчитать общее количество записей"""
        pass

    # ===== ФИЛЬТРАЦИЯ =====

    @abstractmethod
    async def find_by_filter(self, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Найти записи по фильтрам с пагинацией"""
        pass

    @abstractmethod
    async def find_one_by_filter(self, **filters) -> Optional[ModelType]:
        """Найти одну запись по фильтрам"""
        pass

    # ===== ОПЕРАЦИИ С АКТИВНОСТЬЮ =====

    @abstractmethod
    async def activate(self, id: int) -> Optional[ModelType]:
        """Активировать запись (установить is_active=True)"""
        pass

    @abstractmethod
    async def deactivate(self, id: int) -> Optional[ModelType]:
        """Деактивировать запись (установить is_active=False)"""
        pass

    @abstractmethod
    async def get_active(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Получить все активные записи"""
        pass


class UserRepositoryAbstract(RepositoryAbstract[ModelType]):
    """Абстрактный репозиторий для работы с пользователями"""

    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[ModelType]:
        """Получить пользователя по username"""
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[ModelType]:
        """Получить пользователя по email"""
        pass

    @abstractmethod
    async def get_by_telegram_id(self, telegram_id: str) -> Optional[ModelType]:
        """Получить пользователя по telegram_id"""
        pass

    @abstractmethod
    async def get_with_relatives(self, user_id: int) -> Optional[ModelType]:
        """Получить пользователя с предзагруженными родственниками (избежание N+1)"""
        pass

    @abstractmethod
    async def is_username_taken(self, username: str, exclude_id: Optional[int] = None) -> bool:
        """Проверить занят ли username (с опциональным исключением ID)"""
        pass

    @abstractmethod
    async def is_email_taken(self, email: str, exclude_id: Optional[int] = None) -> bool:
        """Проверить занят ли email (с опциональным исключением ID)"""
        pass

    @abstractmethod
    async def search_users(self, search_term: str, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Поиск пользователей по username или email"""
        pass

    @abstractmethod
    async def get_users_by_ids(self, ids: List[int]) -> List[ModelType]:
        """Получить пользователей по списку ID"""
        pass

