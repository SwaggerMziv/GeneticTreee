from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional, Any, Type, Dict

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


class FamilyRelationRepositoryAbstract(RepositoryAbstract[ModelType]):
    """Абстрактный репозиторий для работы с родственниками"""

    @abstractmethod
    async def get_by_user_id(self, user_id: int, only_active: bool = True) -> List[ModelType]:
        """Получить всех родственников пользователя"""
        pass

    @abstractmethod
    async def get_by_relationship_type(self, user_id: int, relationship_type: str) -> List[ModelType]:
        """Получить родственников по типу связи"""
        pass

    @abstractmethod
    async def search_by_name(self, user_id: int, search_term: str) -> List[ModelType]:
        """Поиск родственников по имени"""
        pass

    @abstractmethod
    async def count_by_user(self, user_id: int, only_active: bool = True) -> int:
        """Подсчитать количество родственников пользователя"""
        pass

    @abstractmethod
    async def get_by_gender(self, user_id: int, gender: str, only_active: bool = True) -> List[ModelType]:
        """Получить родственников по полу"""
        pass

    @abstractmethod
    async def get_by_birth_date_range(
        self,
        user_id: int,
        start_date: Optional[Any] = None,
        end_date: Optional[Any] = None,
        only_active: bool = True
    ) -> List[ModelType]:
        """Получить родственников по диапазону дат рождения"""
        pass

    @abstractmethod
    async def get_deceased(self, user_id: int, only_active: bool = True) -> List[ModelType]:
        """Получить умерших родственников (death_date is not None)"""
        pass

    @abstractmethod
    async def get_alive(self, user_id: int, only_active: bool = True) -> List[ModelType]:
        """Получить живых родственников (death_date is None)"""
        pass

    @abstractmethod
    async def get_relatives_by_ids(self, ids: List[int], user_id: Optional[int] = None) -> List[ModelType]:
        """Получить родственников по списку ID с опциональной проверкой владельца"""
        pass


class FamilyRelationshipRepositoryAbstract(RepositoryAbstract[ModelType]):
    """Абстрактный репозиторий для работы со связями между родственниками"""

    @abstractmethod
    async def get_by_user_id(self, user_id: int) -> List[ModelType]:
        """Получить все связи пользователя"""
        pass

    @abstractmethod
    async def get_by_relative_id(self, relative_id: int) -> List[ModelType]:
        """Получить все связи конкретного родственника"""
        pass

    @abstractmethod
    async def get_children(self, parent_id: int) -> List[ModelType]:
        """Получить детей родителя"""
        pass

    @abstractmethod
    async def get_parents(self, child_id: int) -> List[ModelType]:
        """Получить родителей ребенка"""
        pass

    @abstractmethod
    async def get_with_details(self, user_id: int) -> List[ModelType]:
        """Получить связи с предзагруженными деталями родственников (избежание N+1)"""
        pass

    @abstractmethod
    async def get_by_relationship_type(self, user_id: int, relationship_type: str) -> List[ModelType]:
        """Получить связи по типу отношения"""
        pass

    @abstractmethod
    async def get_siblings(self, relative_id: int) -> List[ModelType]:
        """Получить братьев и сестер родственника"""
        pass

    @abstractmethod
    async def get_grandparents(self, relative_id: int) -> List[ModelType]:
        """Получить бабушек и дедушек родственника"""
        pass

    @abstractmethod
    async def get_grandchildren(self, relative_id: int) -> List[ModelType]:
        """Получить внуков родственника"""
        pass

    @abstractmethod
    async def get_spouses(self, relative_id: int) -> List[ModelType]:
        """Получить супругов родственника"""
        pass

    @abstractmethod
    async def relationship_exists(
        self,
        from_relative_id: int,
        to_relative_id: int,
        relationship_type: Optional[str] = None
    ) -> bool:
        """Проверить существование связи между родственниками"""
        pass

    @abstractmethod
    async def get_all_relationships_graph(self, user_id: int) -> List[ModelType]:
        """Получить полный граф связей пользователя для визуализации"""
        pass