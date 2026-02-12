from src.family.models import FamilyRelationModel, FamilyRelationshipModel
from src.family.repository_abstract import FamilyRelationRepositoryAbstract, FamilyRelationshipRepositoryAbstract
from src.exceptions import handle_database_errors
from src.family.exceptions import RelativeNotFoundError, RelationshipNotFoundError, RelationshipSelfReferenceError
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, distinct, update
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from src.family.utils import validate_date_range


class FamilyRelationRepository(FamilyRelationRepositoryAbstract[FamilyRelationModel]):
    """Репозиторий для работы с родственниками пользователей"""

    def __init__(self, session: AsyncSession):
        super().__init__(FamilyRelationModel, session)

    # Базовые CRUD операции
    @handle_database_errors
    async def create(self, **kwargs) -> FamilyRelationModel:
        """Создать нового родственника"""
        # Валидация дат
        if 'birth_date' in kwargs and 'death_date' in kwargs:
            validate_date_range(kwargs.get('birth_date'), kwargs.get('death_date'))

        relation = self.model(**kwargs)
        self.session.add(relation)
        await self.session.flush()
        await self.session.refresh(relation)
        return relation

    @handle_database_errors
    async def get_by_id(self, id: int, user_id: int) -> Optional[FamilyRelationModel]:
        """Получить родственника по ID"""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id, self.model.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[FamilyRelationModel]:
        """Получить всех родственников с пагинацией"""
        result = await self.session.execute(
            select(self.model)
            .where(self.model.is_active == True)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def update(self, user_id: int, id: int, **kwargs) -> Optional[FamilyRelationModel]:
        """Обновить родственника"""
        relation = await self.get_by_id(id, user_id)
        if not relation:
            raise RelativeNotFoundError(id)

        # Валидация дат при обновлении
        birth_date = kwargs.get('birth_date', relation.birth_date)
        death_date = kwargs.get('death_date', relation.death_date)
        if birth_date and death_date:
            validate_date_range(birth_date, death_date)

        for key, value in kwargs.items():
            if hasattr(relation, key):
                setattr(relation, key, value)
                # Mark JSON fields as modified explicitly
                if key == 'context':
                    flag_modified(relation, 'context')

        await self.session.flush()
        await self.session.refresh(relation)
        return relation

    @handle_database_errors
    async def delete(self, user_id: int, id: int) -> bool:
        """Удалить родственника"""
        relation = await self.get_by_id(id, user_id)
        if not relation:
            raise RelativeNotFoundError(id)

        await self.session.delete(relation)
        await self.session.flush()
        return True


    @handle_database_errors
    async def update_context(self, user_id: int, relative_id: int, key: str, value: str | None) -> bool:
        """Обновить или удалить контекст родственника"""
        relation = await self.get_by_id(relative_id, user_id)
        if not relation:
            raise RelativeNotFoundError(relative_id)
        # Create new dict to ensure SQLAlchemy detects the change
        new_context = dict(relation.context) if relation.context else {}

        if value is None:
            # Удаляем ключ, если value=None
            new_context.pop(key, None)
        else:
            # Обновляем значение
            new_context[key] = value

        relation.context = new_context
        # Explicitly mark the JSON field as modified
        flag_modified(relation, 'context')
        await self.session.flush()
        await self.session.refresh(relation)
        return True

    # Специфичные методы для родственников
    @handle_database_errors
    async def get_by_user_id(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить всех родственников пользователя"""
        query = select(self.model).where(self.model.user_id == user_id)
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_by_relationship_type(self, user_id: int, relationship_type: str) -> List[FamilyRelationModel]:
        """Получить родственников по типу связи (не применимо для FamilyRelationModel)"""
        result = await self.session.execute(
            select(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def search_by_name(self, user_id: int, search_term: str) -> List[FamilyRelationModel]:
        """Поиск родственников по имени, фамилии или отчеству"""
        search_pattern = f"%{search_term}%"
        result = await self.session.execute(
            select(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_active == True,
                or_(
                    self.model.first_name.ilike(search_pattern),
                    self.model.last_name.ilike(search_pattern),
                    self.model.middle_name.ilike(search_pattern)
                )
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def count_by_user(self, user_id: int, only_active: bool = True) -> int:
        """Подсчитать количество родственников пользователя"""
        query = select(func.count()).select_from(self.model).where(self.model.user_id == user_id)
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return result.scalar()

    # ===== НОВЫЕ МЕТОДЫ =====

    # Массовые операции
    @handle_database_errors
    async def bulk_create(self, items: List[Dict[str, Any]]) -> List[FamilyRelationModel]:
        """Массовое создание родственников"""
        relations = [self.model(**item) for item in items]
        self.session.add_all(relations)
        await self.session.flush()
        for relation in relations:
            await self.session.refresh(relation)
        return relations

    @handle_database_errors
    async def bulk_update(self, user_id: int, updates: List[Dict[str, Any]]) -> List[FamilyRelationModel]:
        """Массовое обновление родственников"""
        updated_relations = []
        for update_data in updates:
            relation_id = update_data.pop('id', None)
            if not relation_id:
                continue
            relation = await self.get_by_id(user_id, relation_id)
            if relation:
                for key, value in update_data.items():
                    if hasattr(relation, key):
                        setattr(relation, key, value)
                updated_relations.append(relation)
        await self.session.flush()
        for relation in updated_relations:
            await self.session.refresh(relation)
        return updated_relations

    @handle_database_errors
    async def bulk_delete(self, user_id: int, ids: List[int]) -> int:
        """Массовое мягкое удаление родственников"""
        result = await self.session.execute(
            select(self.model).where(self.model.id.in_(ids), self.model.user_id == user_id)
        )
        relations = result.scalars().all()
        count = 0
        for relation in relations:
            relation.is_active = False
            count += 1
        await self.session.flush()
        return count

    # Проверки и подсчет
    @handle_database_errors
    async def exists(self, user_id: int, id: int) -> bool:
        """Проверить существование родственника по ID"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model).where(self.model.id == id, self.model.user_id == user_id)
        )
        return result.scalar() > 0

    @handle_database_errors
    async def count(self, user_id: int) -> int:
        """Подсчитать общее количество родственников у пользователя"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model).where(self.model.is_active == True, self.model.user_id == user_id)
        )
        return result.scalar()

    # Фильтрация
    @handle_database_errors
    async def find_by_filter(self, user_id: int, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[FamilyRelationModel]:
        """Найти родственников по фильтрам"""
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value, self.model.user_id == user_id)
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def find_one_by_filter(self, user_id: int, **filters) -> Optional[FamilyRelationModel]:
        """Найти одного родственника по фильтрам"""
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value, self.model.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    # Операции с активностью
    @handle_database_errors
    async def activate(self, user_id: int, id: int) -> Optional[FamilyRelationModel]:
        """Активировать родственника"""
        relation = await self.get_by_id(user_id, id)
        if not relation:
            raise RelativeNotFoundError(id)
        relation.is_active = True
        await self.session.flush()
        await self.session.refresh(relation)
        return relation

    @handle_database_errors
    async def deactivate(self, user_id: int, id: int) -> Optional[FamilyRelationModel]:
        """Деактивировать родственника"""
        relation = await self.get_by_id(user_id, id)
        if not relation:
            raise RelativeNotFoundError(id)
        relation.is_active = False
        await self.session.flush()
        await self.session.refresh(relation)
        return relation

    @handle_database_errors
    async def get_active(self, skip: int = 0, limit: int = 100) -> List[FamilyRelationModel]:
        """Получить всех активных родственников"""
        result = await self.session.execute(
            select(self.model)
            .where(self.model.is_active == True)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    # Специфичные методы родственников
    @handle_database_errors
    async def get_by_gender(self, user_id: int, gender: str, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить родственников по полу"""
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.gender == gender
        )
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_by_birth_date_range(
        self,
        user_id: int,
        start_date: Optional[Any] = None,
        end_date: Optional[Any] = None,
        only_active: bool = True
    ) -> List[FamilyRelationModel]:
        """Получить родственников по диапазону дат рождения"""
        query = select(self.model).where(self.model.user_id == user_id)

        if start_date:
            query = query.where(self.model.birth_date >= start_date)
        if end_date:
            query = query.where(self.model.birth_date <= end_date)
        if only_active:
            query = query.where(self.model.is_active == True)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_deceased(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить умерших родственников"""
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.death_date.isnot(None)
        )
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_alive(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить живых родственников"""
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.death_date.is_(None)
        )
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_activated(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить активированных (подключённых к Telegram) родственников"""
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.is_activated == True
        )
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_not_activated(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить не активированных (не подключённых к Telegram) родственников"""
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.is_activated == False
        )
        if only_active:
            query = query.where(self.model.is_active == True)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_relatives_by_ids(self, ids: List[int], user_id: Optional[int] = None) -> List[FamilyRelationModel]:
        """Получить родственников по списку ID"""
        query = select(self.model).where(self.model.id.in_(ids))
        if user_id:
            query = query.where(self.model.user_id == user_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def get_statistics(self, user_id: int) -> Dict[str, Any]:
        """Получить статистику по родственникам пользователя"""
        # Total relatives
        total_query = select(func.count()).select_from(self.model).where(
            self.model.user_id == user_id,
            self.model.is_active == True
        )
        total_result = await self.session.execute(total_query)
        total_relatives = total_result.scalar() or 0

        # Alive relatives
        alive_query = select(func.count()).select_from(self.model).where(
            self.model.user_id == user_id,
            self.model.is_active == True,
            self.model.death_date.is_(None)
        )
        alive_result = await self.session.execute(alive_query)
        alive_relatives = alive_result.scalar() or 0

        # Deceased relatives
        deceased_relatives = total_relatives - alive_relatives

        # Activated relatives (connected to Telegram)
        activated_query = select(func.count()).select_from(self.model).where(
            self.model.user_id == user_id,
            self.model.is_active == True,
            self.model.is_activated == True
        )
        activated_result = await self.session.execute(activated_query)
        activated_relatives = activated_result.scalar() or 0

        # Gender distribution
        gender_query = select(
            self.model.gender,
            func.count(self.model.id)
        ).where(
            self.model.user_id == user_id,
            self.model.is_active == True
        ).group_by(self.model.gender)
        gender_result = await self.session.execute(gender_query)
        gender_data = {str(row[0].value) if row[0] else 'other': row[1] for row in gender_result.all()}

        # Generations count
        generations_query = select(func.count(distinct(self.model.generation))).where(
            self.model.user_id == user_id,
            self.model.is_active == True,
            self.model.generation.isnot(None)
        )
        generations_result = await self.session.execute(generations_query)
        generations_count = generations_result.scalar() or 0

        # Stories count (count all keys in context JSON for all relatives)
        relatives_with_context = await self.session.execute(
            select(self.model.context).where(
                self.model.user_id == user_id,
                self.model.is_active == True,
                self.model.context.isnot(None)
            )
        )
        total_stories = 0
        for (context,) in relatives_with_context.all():
            if context and isinstance(context, dict):
                total_stories += len(context)

        return {
            'total_relatives': total_relatives,
            'alive_relatives': alive_relatives,
            'deceased_relatives': deceased_relatives,
            'activated_relatives': activated_relatives,
            'gender_distribution': {
                'male': gender_data.get('male', 0),
                'female': gender_data.get('female', 0),
                'other': gender_data.get('other', 0)
            },
            'generations_count': generations_count,
            'total_stories': total_stories
        }

    # ===== INVITATION SYSTEM METHODS =====

    @handle_database_errors
    async def generate_invitation_token(self, relative_id: int, user_id: int) -> str:
        """Генерировать уникальный токен приглашения для родственника"""
        import secrets

        # Generate unique token
        token = secrets.token_urlsafe(32)

        # Update relative with token
        stmt = update(FamilyRelationModel).where(
            FamilyRelationModel.id == relative_id,
            FamilyRelationModel.user_id == user_id
        ).values(invitation_token=token)

        result = await self.session.execute(stmt)

        if result.rowcount == 0:
            raise RelativeNotFoundError(relative_id)

        await self.session.flush()
        return token

    @handle_database_errors
    async def get_by_invitation_token(self, token: str) -> Optional[FamilyRelationModel]:
        """Найти родственника по токену приглашения"""
        result = await self.session.execute(
            select(self.model).where(self.model.invitation_token == token)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def activate_relative(
        self,
        relative_id: int,
        telegram_user_id: int,
        telegram_username: Optional[str] = None
    ) -> FamilyRelationModel:
        """Активировать родственника через Telegram"""
        from datetime import datetime, timezone

        update_data = {
            'telegram_user_id': telegram_user_id,
            'is_activated': True,
            'activated_at': datetime.now(timezone.utc)
        }

        # Optionally update telegram_id (username) if provided
        if telegram_username:
            update_data['telegram_id'] = telegram_username

        stmt = update(FamilyRelationModel).where(
            FamilyRelationModel.id == relative_id
        ).values(**update_data).returning(FamilyRelationModel)

        result = await self.session.execute(stmt)
        relative = result.scalar_one_or_none()

        if not relative:
            raise RelativeNotFoundError(relative_id)

        await self.session.flush()
        await self.session.refresh(relative)
        return relative

    @handle_database_errors
    async def get_by_id_without_user(self, relative_id: int) -> Optional[FamilyRelationModel]:
        """Получить родственника по ID без проверки user_id (для публичных endpoints)"""
        result = await self.session.execute(
            select(self.model).where(self.model.id == relative_id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def update_full_context(self, relative_id: int, context: Dict[str, Any]) -> bool:
        """Обновить весь контекст родственника"""
        relation = await self.get_by_id_without_user(relative_id)
        if not relation:
            raise RelativeNotFoundError(relative_id)

        relation.context = context
        flag_modified(relation, 'context')
        await self.session.flush()
        await self.session.refresh(relation)
        return True

    @handle_database_errors
    async def get_by_telegram_user_id(self, telegram_user_id: int) -> Optional[FamilyRelationModel]:
        """Получить родственника по Telegram user ID"""
        result = await self.session.execute(
            select(self.model).where(
                self.model.telegram_user_id == telegram_user_id,
                self.model.is_activated == True
            ).limit(1)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_all_telegram_users(self) -> List[FamilyRelationModel]:
        """Получить всех родственников с привязанным Telegram (для рассылки)"""
        result = await self.session.execute(
            select(self.model).where(
                self.model.telegram_user_id.isnot(None),
                self.model.is_activated == True,
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_related_relatives_with_stories(
        self,
        relative_id: int,
        relationship_repo: "FamilyRelationshipRepository"
    ) -> List[Dict[str, Any]]:
        """
        Получить истории связанных родственников для контекста интервью.
        Возвращает список с информацией о родственниках и их историях.
        """
        # Получаем текущего родственника
        current_relative = await self.get_by_id_without_user(relative_id)
        if not current_relative:
            return []

        user_id = current_relative.user_id

        # Получаем все связи этого родственника
        relationships = await relationship_repo.get_by_relative_id(relative_id)

        # Собираем ID связанных родственников
        related_ids = set()
        relationship_info = {}  # relative_id -> relationship_type

        for rel in relationships:
            if rel.from_relative_id == relative_id:
                related_ids.add(rel.to_relative_id)
                relationship_info[rel.to_relative_id] = rel.relationship_type.value if hasattr(rel.relationship_type, 'value') else str(rel.relationship_type)
            else:
                related_ids.add(rel.from_relative_id)
                relationship_info[rel.from_relative_id] = rel.relationship_type.value if hasattr(rel.relationship_type, 'value') else str(rel.relationship_type)

        if not related_ids:
            return []

        # Получаем родственников с историями
        related_relatives = await self.get_relatives_by_ids(list(related_ids), user_id)

        result = []
        for relative in related_relatives:
            if not relative.context:
                continue

            # Извлекаем истории (исключая interview_messages)
            stories = []
            for key, value in relative.context.items():
                if key == 'interview_messages':
                    continue

                story_text = ""
                if isinstance(value, str):
                    story_text = value
                elif isinstance(value, dict) and 'text' in value:
                    story_text = value['text']

                if story_text:
                    # Берём только первые 500 символов для контекста
                    preview = story_text[:500] + "..." if len(story_text) > 500 else story_text
                    stories.append({
                        "title": key,
                        "preview": preview
                    })

            if stories:
                full_name = f"{relative.first_name}"
                if relative.middle_name:
                    full_name += f" {relative.middle_name}"
                if relative.last_name:
                    full_name += f" {relative.last_name}"

                result.append({
                    "relative_id": relative.id,
                    "name": full_name.strip(),
                    "relationship": relationship_info.get(relative.id, "родственник"),
                    "stories": stories
                })

        return result


class FamilyRelationshipRepository(FamilyRelationshipRepositoryAbstract[FamilyRelationshipModel]):
    """Репозиторий для работы со связями между родственниками"""

    def __init__(self, session: AsyncSession):
        super().__init__(FamilyRelationshipModel, session)

    # Базовые CRUD операции
    @handle_database_errors
    async def create(self, **kwargs) -> FamilyRelationshipModel:
        """Создать новую связь между родственниками"""
        # Проверка что не создается связь с самим собой
        from_id = kwargs.get('from_relative_id')
        to_id = kwargs.get('to_relative_id')
        if from_id == to_id:
            raise RelationshipSelfReferenceError(from_id)

        relationship = self.model(**kwargs)
        self.session.add(relationship)
        await self.session.flush()
        await self.session.refresh(relationship)
        return relationship

    @handle_database_errors
    async def get_by_id(self, id: int, user_id: int) -> Optional[FamilyRelationshipModel]:
        """Получить связь по ID"""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id, self.model.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @handle_database_errors
    async def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> List[FamilyRelationshipModel]:
        """Получить все связи с пагинацией"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(self.model.is_active == True, self.model.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def update(self, id: int, user_id: int,**kwargs) -> Optional[FamilyRelationshipModel]:
        """Обновить связь между родственниками"""
        relationship = await self.get_by_id(id, user_id)
        if not relationship:
            raise RelationshipNotFoundError(id)

        # Проверка при обновлении
        from_id = kwargs.get('from_relative_id', relationship.from_relative_id)
        to_id = kwargs.get('to_relative_id', relationship.to_relative_id)
        if from_id == to_id:
            raise RelationshipSelfReferenceError(from_id)

        for key, value in kwargs.items():
            if hasattr(relationship, key):
                setattr(relationship, key, value)

        await self.session.flush()
        await self.session.refresh(relationship)
        return relationship

    @handle_database_errors
    async def delete(self, user_id: int, id: int, **kwargs) -> bool:
        """Удалить связь"""
        relationship = await self.get_by_id(id, user_id)
        if not relationship:
            raise RelationshipNotFoundError(id)

        await self.session.delete(relationship)
        await self.session.flush()
        return True

    # Специфичные методы для связей между родственниками
    @handle_database_errors
    async def get_by_user_id(self, user_id: int) -> List[FamilyRelationshipModel]:
        """Получить все связи пользователя"""
        result = await self.session.execute(
            select(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_by_relative_id(self, relative_id: int) -> List[FamilyRelationshipModel]:
        """Получить все связи конкретного родственника"""
        result = await self.session.execute(
            select(self.model)
            .where(
                or_(
                    self.model.from_relative_id == relative_id,
                    self.model.to_relative_id == relative_id
                ),
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_children(self, user_id: int, parent_id: int) -> List[FamilyRelationshipModel]:
        """Получить детей родителя"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.from_relative_id == parent_id,
                self.model.relationship_type.in_(['parent', 'father', 'mother']),
                self.model.is_active == True,
                self.model.user_id == user_id
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_parents(self, user_id: int, child_id: int) -> List[FamilyRelationshipModel]:
        """Получить родителей ребенка"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.to_relative_id == child_id,
                self.model.relationship_type.in_(['parent', 'father', 'mother']),
                self.model.is_active == True,
                self.model.user_id == user_id
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_with_details(self, user_id: int, skip: int = 0, limit: int = 100) -> List[FamilyRelationshipModel]:
        """Получить связи с предзагруженными деталями родственников"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.user_id == user_id,
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    # ===== НОВЫЕ МЕТОДЫ =====

    # Массовые операции
    @handle_database_errors
    async def bulk_create(self, items: List[Dict[str, Any]]) -> List[FamilyRelationshipModel]:
        """Массовое создание связей"""
        # Валидация перед созданием
        for item in items:
            if item.get('from_relative_id') == item.get('to_relative_id'):
                raise RelationshipSelfReferenceError(item.get('from_relative_id'))

        relationships = [self.model(**item) for item in items]
        self.session.add_all(relationships)
        await self.session.flush()
        for relationship in relationships:
            await self.session.refresh(relationship)
        return relationships

    @handle_database_errors
    async def bulk_update(self, user_id: int, updates: List[Dict[str, Any]]) -> List[FamilyRelationshipModel]:
        """Массовое обновление связей"""
        updated_relationships = []
        for update_data in updates:
            relationship_id = update_data.pop('id', None)
            if not relationship_id:
                continue
            relationship = await self.get_by_id(relationship_id, user_id)
            if relationship:
                for key, value in update_data.items():
                    if hasattr(relationship, key):
                        setattr(relationship, key, value)
                updated_relationships.append(relationship)
        await self.session.flush()
        for relationship in updated_relationships:
            await self.session.refresh(relationship)
        return updated_relationships

    @handle_database_errors
    async def bulk_delete(self, user_id: int, ids: List[int]) -> int:
        """Массовое удаление связей"""
        result = await self.session.execute(
            select(self.model).where(self.model.id.in_(ids), self.model.user_id == user_id)
        )
        relationships = result.scalars().all()
        count = 0
        for relationship in relationships:
            await self.session.delete(relationship)
            count += 1
        await self.session.flush()
        return count

    # Проверки и подсчет
    @handle_database_errors
    async def exists(self, user_id: int, id: int) -> bool:
        """Проверить существование связи по ID"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model).where(self.model.id == id, self.model.user_id == user_id)
        )
        return result.scalar() > 0

    @handle_database_errors
    async def count(self, user_id: int) -> int:
        """Подсчитать общее количество связей"""
        result = await self.session.execute(
            select(func.count()).select_from(self.model).where(self.model.is_active == True, self.model.user_id == user_id)
        )
        return result.scalar()

    # Фильтрация
    @handle_database_errors
    async def find_by_filter(self, user_id: int, filters: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[FamilyRelationshipModel]:
        """Найти связи по фильтрам"""
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value, self.model.user_id == user_id)
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    @handle_database_errors
    async def find_one_by_filter(self, user_id: int, **filters) -> Optional[FamilyRelationshipModel]:
        """Найти одну связь по фильтрам"""
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value, self.model.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    # Операции с активностью
    @handle_database_errors
    async def activate(self, user_id: int, id: int) -> Optional[FamilyRelationshipModel]:
        """Активировать связь"""
        relationship = await self.get_by_id(id, user_id)
        if not relationship:
            raise RelationshipNotFoundError(id)
        relationship.is_active = True
        await self.session.flush()
        await self.session.refresh(relationship)
        return relationship

    @handle_database_errors
    async def deactivate(self, user_id: int, id: int) -> Optional[FamilyRelationshipModel]:
        """Деактивировать связь"""
        relationship = await self.get_by_id(id, user_id)
        if not relationship:
            raise RelationshipNotFoundError(id)
        relationship.is_active = False
        await self.session.flush()
        await self.session.refresh(relationship)
        return relationship

    @handle_database_errors
    async def get_active(self, skip: int = 0, limit: int = 100) -> List[FamilyRelationshipModel]:
        """Получить все активные связи"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(self.model.is_active == True)
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return list(result.scalars().all())

    # Специфичные методы связей
    @handle_database_errors
    async def get_by_relationship_type(self, user_id: int, relationship_type: str) -> List[FamilyRelationshipModel]:
        """Получить связи по типу отношения"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.user_id == user_id,
                self.model.relationship_type == relationship_type,
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_siblings(self, user_id: int, relative_id: int) -> List[FamilyRelationshipModel]:
        """Получить братьев и сестер родственника"""
        # Сначала находим родителей
        parents = await self.get_parents(user_id, relative_id)
        if not parents:
            return []

        parent_ids = [p.from_relative_id for p in parents]

        # Затем находим всех детей этих родителей
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.from_relative_id.in_(parent_ids),
                self.model.relationship_type.in_(['parent', 'father', 'mother']),
                self.model.to_relative_id != relative_id,  # Исключаем самого себя
                self.model.is_active == True,
                self.model.user_id == user_id
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_grandparents(self, user_id: int, relative_id: int) -> List[FamilyRelationshipModel]:
        """Получить бабушек и дедушек родственника"""
        # Находим родителей
        parents = await self.get_parents(user_id, relative_id)
        if not parents:
            return []

        parent_ids = [p.from_relative_id for p in parents]

        # Находим родителей родителей (бабушек и дедушек)
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.to_relative_id.in_(parent_ids),
                self.model.relationship_type.in_(['parent', 'father', 'mother']),
                self.model.is_active == True,
                self.model.user_id == user_id
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_grandchildren(self, user_id: int, relative_id: int) -> List[FamilyRelationshipModel]:
        """Получить внуков родственника"""
        # Находим детей
        children = await self.get_children(user_id, relative_id)
        if not children:
            return []

        children_ids = [c.to_relative_id for c in children]

        # Находим детей детей (внуков)
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.from_relative_id.in_(children_ids),
                self.model.relationship_type.in_(['parent', 'father', 'mother']),
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_spouses(self, relative_id: int) -> List[FamilyRelationshipModel]:
        """Получить супругов родственника"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                or_(
                    and_(
                        self.model.from_relative_id == relative_id,
                        self.model.relationship_type.in_(['spouse', 'husband', 'wife', 'partner', 'ex_spouse'])
                    ),
                    and_(
                        self.model.to_relative_id == relative_id,
                        self.model.relationship_type.in_(['spouse', 'husband', 'wife', 'partner', 'ex_spouse'])
                    )
                ),
                self.model.is_active == True
            )
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def relationship_exists(
        self,
        user_id: int,
        from_relative_id: int,
        to_relative_id: int,
        relationship_type: Optional[str] = None
    ) -> bool:
        """Проверить существование связи между родственниками"""
        query = select(func.count()).select_from(self.model).where(
            self.model.user_id == user_id,
            self.model.from_relative_id == from_relative_id,
            self.model.to_relative_id == to_relative_id,
            self.model.is_active == True
        )
        if relationship_type:
            query = query.where(self.model.relationship_type == relationship_type)

        result = await self.session.execute(query)
        return result.scalar() > 0

    @handle_database_errors
    async def get_all_relationships_graph(self, user_id: int) -> List[FamilyRelationshipModel]:
        """Получить полный граф связей пользователя для визуализации"""
        result = await self.session.execute(
            select(self.model)
            .options(
                selectinload(self.model.from_relative),
                selectinload(self.model.to_relative)
            )
            .where(
                self.model.user_id == user_id,
                self.model.is_active == True
            )
            .order_by(self.model.created_at.asc())
        )
        return list(result.scalars().all())

    @handle_database_errors
    async def get_statistics(self, user_id: int) -> Dict[str, Any]:
        """Получить статистику по связям пользователя"""
        # Total relationships
        total_query = select(func.count()).select_from(self.model).where(
            self.model.user_id == user_id,
            self.model.is_active == True
        )
        total_result = await self.session.execute(total_query)
        total_relationships = total_result.scalar() or 0

        # Relationship types count (unique types)
        types_count_query = select(func.count(distinct(self.model.relationship_type))).where(
            self.model.user_id == user_id,
            self.model.is_active == True
        )
        types_count_result = await self.session.execute(types_count_query)
        relationship_types_count = types_count_result.scalar() or 0

        # Relationship types distribution
        types_query = select(
            self.model.relationship_type,
            func.count(self.model.id)
        ).where(
            self.model.user_id == user_id,
            self.model.is_active == True
        ).group_by(self.model.relationship_type)
        types_result = await self.session.execute(types_query)
        relationship_types = [
            {'type': str(row[0].value) if row[0] else 'unknown', 'count': row[1]}
            for row in types_result.all()
        ]

        return {
            'total_relationships': total_relationships,
            'relationship_types_count': relationship_types_count,
            'relationship_types': relationship_types
        }
