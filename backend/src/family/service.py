from fastapi import UploadFile
from src.storage.s3.manager import S3Manager
from src.family.repository import FamilyRelationRepository, FamilyRelationshipRepository
from src.family.models import FamilyRelationModel, FamilyRelationshipModel
from src.family.schemas import (
    FamilyRelationCreateSchema, FamilyRelationUpdateSchema, FamilyRelationContextUpdateSchema,
    FamilyRelationContextOutputSchema,
    FamilyRelationshipCreateSchema, FamilyRelationshipUpdateSchema,
    FamilyStatisticsSchema, GenderStatisticsSchema, RelationshipTypeCountSchema
)
from src.family.exceptions import (
    InvalidDateRangeError,
    RelativeNotFoundError,
    RelativeAccessDeniedError,
    RelationshipAlreadyExistsError
)
from src.core.logger import log_service_operation
from typing import List
from datetime import timezone

class FamilyRelationService:
    """Сервис для работы с родственниками"""

    def __init__(self, family_relation_repository: FamilyRelationRepository, s3_manager: S3Manager):
        self.repository = family_relation_repository
        self.s3_manager = s3_manager

    @log_service_operation
    async def create_relative(self, user_id: int, relative_data: FamilyRelationCreateSchema) -> FamilyRelationModel:
        if relative_data.birth_date and relative_data.death_date:
            if relative_data.death_date < relative_data.birth_date:
                raise InvalidDateRangeError("birth_date", "death_date")

        # === Фикс: приводим даты к UTC-aware ===
        def as_utc(dt):
            if dt is None:
                return None
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)

        birth_date = as_utc(relative_data.birth_date)
        death_date = as_utc(relative_data.death_date)

        relative = await self.repository.create(
            user_id=user_id,
            image_url=relative_data.image_url,
            first_name=relative_data.first_name,
            last_name=relative_data.last_name,
            middle_name=relative_data.middle_name,
            birth_date=birth_date,
            death_date=death_date,
            gender=relative_data.gender,
            contact_info=relative_data.contact_info,
            telegram_id=relative_data.telegram_id,
            context=relative_data.context,
            generation=relative_data.generation,
            is_active=True
        )
        return relative

    @log_service_operation
    async def get_relative_by_id(self, user_id: int, relative_id: int) -> FamilyRelationModel:
        relative = await self.repository.get_by_id(relative_id, user_id)
        if not relative:
            raise RelativeNotFoundError(relative_id)
        return relative

    @log_service_operation
    async def get_user_relatives(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        relatives = await self.repository.get_by_user_id(user_id, only_active)
        return relatives

    @log_service_operation
    async def update_relative(self, user_id: int, relative_id: int, relative_data: FamilyRelationUpdateSchema) -> FamilyRelationModel:
        existing = await self.repository.get_by_id(relative_id, user_id)
        if existing:
            birth_date = relative_data.birth_date or existing.birth_date
            death_date = relative_data.death_date or existing.death_date

            if birth_date and death_date and death_date < birth_date:
                raise InvalidDateRangeError("birth_date", "death_date")

        update_data = relative_data.model_dump(exclude_unset=True)
        relative = await self.repository.update(user_id, relative_id, **update_data)
        return relative

    @log_service_operation
    async def activate_relative(self, user_id: int, relative_id: int) -> bool:
        result = await self.repository.activate(user_id, relative_id)
        return result

    @log_service_operation
    async def deactivate_relative(self, user_id: int, relative_id: int) -> bool:
        result = await self.repository.deactivate(user_id, relative_id)
        return result

    @log_service_operation
    async def delete_relative(self, user_id: int, relative_id: int) -> bool:
        relative = await self.repository.get_by_id(relative_id, user_id)
        if relative:
            if relative.image_url:
                await self.s3_manager.delete_object(relative.image_url)
        result = await self.repository.delete(user_id, relative_id)
        return result

    @log_service_operation
    async def update_relative_context(self, user_id: int, relative_id: int, context_data: FamilyRelationContextUpdateSchema) -> bool:
        result = await self.repository.update_context(user_id, relative_id, context_data.key, context_data.value)
        return result

    @log_service_operation
    async def get_relative_context(self, user_id: int, relative_id: int) -> FamilyRelationContextOutputSchema:
        """Получить контекст родственника"""
        relative = await self.repository.get_by_id(relative_id, user_id)
        if not relative:
            raise RelativeNotFoundError(relative_id)
        return FamilyRelationContextOutputSchema(context=relative.context or {})

    @log_service_operation
    async def search_relatives_by_name(self, user_id: int, search_term: str) -> List[FamilyRelationModel]:
        relatives = await self.repository.search_by_name(user_id, search_term)
        return relatives

    @log_service_operation
    async def get_relatives_by_gender(self, user_id: int, gender: str, only_active: bool = True) -> List[FamilyRelationModel]:
        relatives = await self.repository.get_by_gender(user_id, gender, only_active)
        return relatives

    @log_service_operation
    async def get_deceased_relatives(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        relatives = await self.repository.get_deceased(user_id, only_active)
        return relatives

    @log_service_operation
    async def get_alive_relatives(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        relatives = await self.repository.get_alive(user_id, only_active)
        return relatives

    @log_service_operation
    async def get_activated_relatives(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить активированных (подключённых к Telegram) родственников"""
        relatives = await self.repository.get_activated(user_id, only_active)
        return relatives

    @log_service_operation
    async def get_not_activated_relatives(self, user_id: int, only_active: bool = True) -> List[FamilyRelationModel]:
        """Получить не активированных (не подключённых к Telegram) родственников"""
        relatives = await self.repository.get_not_activated(user_id, only_active)
        return relatives

    @log_service_operation
    async def get_statistics(self, user_id: int) -> dict:
        """Получить статистику по родственникам"""
        return await self.repository.get_statistics(user_id)

    # ===== INVITATION SYSTEM METHODS =====

    @log_service_operation
    async def generate_invitation(self, user_id: int, relative_id: int, bot_username: str) -> dict:
        """Генерировать ссылку-приглашение для родственника"""
        # Verify relative belongs to user
        relative = await self.repository.get_by_id(relative_id, user_id)
        if not relative:
            raise RelativeNotFoundError(relative_id)

        # Check if already activated
        if relative.is_activated:
            from src.family.exceptions import RelativeAlreadyActivatedError
            raise RelativeAlreadyActivatedError(relative_id)

        # Generate token
        token = await self.repository.generate_invitation_token(relative_id, user_id)

        # Build invitation URL
        invitation_url = f"https://t.me/{bot_username}?start={token}"

        return {
            "invitation_url": invitation_url,
            "token": token,
            "relative_id": relative.id,
            "relative_name": f"{relative.first_name} {relative.last_name}"
        }

    @log_service_operation
    async def activate_invitation(self, token: str, telegram_user_id: int, telegram_username: str = None) -> FamilyRelationModel:
        """Активировать родственника по токену приглашения"""
        from src.family.exceptions import (
            InvalidInvitationTokenError,
            RelativeAlreadyActivatedError,
            TelegramUserAlreadyLinkedError
        )

        # Find relative by token
        relative = await self.repository.get_by_invitation_token(token)
        if not relative:
            raise InvalidInvitationTokenError()

        # Check if this relative is already activated
        if relative.is_activated:
            raise RelativeAlreadyActivatedError(relative.id)

        # Check if this Telegram user is already linked to ANOTHER relative
        existing_relative = await self.repository.get_by_telegram_user_id(telegram_user_id)
        if existing_relative and existing_relative.id != relative.id:
            raise TelegramUserAlreadyLinkedError(telegram_user_id)

        # Activate relative
        activated_relative = await self.repository.activate_relative(
            relative.id,
            telegram_user_id,
            telegram_username
        )

        return activated_relative

    @log_service_operation
    async def save_interview_message(self, relative_id: int, user_message: str, ai_response: str) -> bool:
        """Сохранить сообщения из интервью в контекст родственника"""
        import json
        from datetime import datetime

        # Get current context
        relative = await self.repository.get_by_id_without_user(relative_id)
        if not relative:
            raise RelativeNotFoundError(relative_id)

        context = relative.context or {}

        # Initialize interview_messages if not exists
        if 'interview_messages' not in context:
            context['interview_messages'] = []

        # Add new message pair
        context['interview_messages'].append({
            'timestamp': datetime.utcnow().isoformat(),
            'user': user_message,
            'ai': ai_response
        })

        # Keep only last 100 messages to avoid context bloat
        if len(context['interview_messages']) > 100:
            context['interview_messages'] = context['interview_messages'][-100:]

        # Update context
        await self.repository.update_full_context(relative_id, context)

        return True

    @log_service_operation
    async def create_story_from_bot(self, relative_id: int, title: str, text: str) -> dict:
        """Создать историю от Telegram бота"""
        from datetime import datetime, timezone

        relative = await self.repository.get_by_id_without_user(relative_id)
        if not relative:
            raise RelativeNotFoundError(relative_id)

        context = relative.context or {}

        # Create unique story key
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        story_key = f"{title}"

        # If story with this title exists, add timestamp to make it unique
        if story_key in context:
            story_key = f"{title} ({timestamp})"

        now = datetime.now(timezone.utc).isoformat()
        story_data = {
            "text": text,
            "media": [],
            "created_at": now,
            "updated_at": now,
        }

        context[story_key] = story_data
        await self.repository.update_full_context(relative_id, context)

        return {
            "title": story_key,
            "text": text,
            "media": [],
            "created_at": now,
            "updated_at": now,
        }

    @log_service_operation
    async def get_stories_count(self, relative_id: int) -> int:
        """Получить количество историй родственника"""
        relative = await self.repository.get_by_id_without_user(relative_id)
        if not relative:
            return 0

        context = relative.context or {}

        # Count stories (exclude interview_messages)
        count = 0
        for key, value in context.items():
            if key == 'interview_messages':
                continue
            # Count both old string format and new dict format
            if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                count += 1

        return count

    @log_service_operation
    async def get_relative_by_telegram_id(self, telegram_user_id: int) -> FamilyRelationModel:
        """Получить родственника по Telegram user ID"""
        relative = await self.repository.get_by_telegram_user_id(telegram_user_id)
        if not relative:
            raise RelativeNotFoundError(telegram_user_id)
        return relative

    @log_service_operation
    async def get_all_telegram_users(self) -> List[FamilyRelationModel]:
        """Получить всех родственников с привязанным Telegram (для рассылки)"""
        return await self.repository.get_all_telegram_users()

    @log_service_operation
    async def get_related_stories(self, relative_id: int, relationship_repo: "FamilyRelationshipRepository") -> List[dict]:
        """
        Получить истории связанных родственников для контекста интервью.
        Используется Telegram ботом для обогащения вопросов.
        """
        return await self.repository.get_related_relatives_with_stories(relative_id, relationship_repo)

    @log_service_operation
    async def create_relative_from_bot(
        self,
        interviewer_relative_id: int,
        first_name: str,
        relationship_type: str,
        relationship_repo: "FamilyRelationshipRepository",
        last_name: str = None,
        birth_year: int = None,
        gender: str = "other",
        additional_info: str = None
    ) -> dict:
        """
        Создать родственника из Telegram бота и связать с интервьюируемым.

        Args:
            interviewer_relative_id: ID родственника, который проходит интервью
            first_name: Имя нового родственника
            relationship_type: Тип связи (mother, father, brother, etc.)
            relationship_repo: Репозиторий для создания связи
            last_name: Фамилия (опционально)
            birth_year: Год рождения (опционально)
            gender: Пол (male, female, other)
            additional_info: Дополнительная информация

        Returns:
            dict: Информация о созданном родственнике
        """
        from datetime import datetime, timezone
        from src.family.enums import GenderType, RelationshipType
        from src.family.schemas import FamilyRelationCreateSchema, FamilyRelationshipCreateSchema

        # Получаем интервьюируемого родственника
        interviewer = await self.repository.get_by_id_without_user(interviewer_relative_id)
        if not interviewer:
            raise RelativeNotFoundError(interviewer_relative_id)

        user_id = interviewer.user_id

        # Определяем пол из типа связи если не указан
        gender_enum = GenderType(gender) if gender else GenderType.OTHER
        if gender == "other":
            # Автоматически определяем пол по типу связи
            female_types = {"mother", "grandmother", "sister", "aunt", "daughter", "granddaughter", "niece"}
            male_types = {"father", "grandfather", "brother", "uncle", "son", "grandson", "nephew"}
            if relationship_type in female_types:
                gender_enum = GenderType.FEMALE
            elif relationship_type in male_types:
                gender_enum = GenderType.MALE

        # Преобразуем год рождения в дату
        birth_date = None
        if birth_year:
            birth_date = datetime(birth_year, 1, 1, tzinfo=timezone.utc)

        # Сохраняем дополнительную информацию в контекст
        context = {}
        if additional_info:
            context["bot_collected_info"] = additional_info

        # Создаём родственника
        relative_data = FamilyRelationCreateSchema(
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            gender=gender_enum,
            context=context,
            generation=interviewer.generation  # Такое же поколение по умолчанию
        )

        new_relative = await self.create_relative(user_id, relative_data)

        # Создаём связь между интервьюируемым и новым родственником
        # Направление связи: from -> relationship -> to
        # Например: interviewer <- mother (новый родственник является матерью интервьюируемого)
        relationship_type_enum = RelationshipType(relationship_type)

        relationship_data = FamilyRelationshipCreateSchema(
            from_relative_id=new_relative.id,
            to_relative_id=interviewer_relative_id,
            relationship_type=relationship_type_enum
        )

        await relationship_repo.create(
            user_id=user_id,
            from_relative_id=new_relative.id,
            to_relative_id=interviewer_relative_id,
            relationship_type=relationship_type_enum,
            is_active=True
        )

        return {
            "relative_id": new_relative.id,
            "first_name": new_relative.first_name,
            "relationship_type": relationship_type,
            "message": "Родственник успешно создан"
        }


class FamilyRelationshipService:
    """Сервис для работы со связями между родственниками"""

    def __init__(self, family_relationship_repository: FamilyRelationshipRepository, family_relation_repository: FamilyRelationRepository):
        self.repository = family_relationship_repository
        self.relation_repository = family_relation_repository

    @log_service_operation
    async def create_relationship(self, user_id: int, relationship_data: FamilyRelationshipCreateSchema) -> FamilyRelationshipModel:
        # Бизнес-правило: родственники должны принадлежать одному пользователю
        from_relative = await self.relation_repository.get_by_id(
            relationship_data.from_relative_id,
            user_id,
        )
        to_relative = await self.relation_repository.get_by_id(
            relationship_data.to_relative_id,
            user_id,
        )

        if not from_relative:
            raise RelativeNotFoundError(relationship_data.from_relative_id)
        if not to_relative:
            raise RelativeNotFoundError(relationship_data.to_relative_id)
        if from_relative.user_id != user_id:
            raise RelativeAccessDeniedError(relationship_data.from_relative_id, user_id)
        if to_relative.user_id != user_id:
            raise RelativeAccessDeniedError(relationship_data.to_relative_id, user_id)

        # Бизнес-правило: проверка на дубликаты
        existing = await self.repository.relationship_exists(
            user_id,
            relationship_data.from_relative_id,
            relationship_data.to_relative_id,
            relationship_data.relationship_type.value
        )
        if existing:
            raise RelationshipAlreadyExistsError(
                relationship_data.from_relative_id,
                relationship_data.to_relative_id
            )

        relationship = await self.repository.create(
            user_id=user_id,
            from_relative_id=relationship_data.from_relative_id,
            to_relative_id=relationship_data.to_relative_id,
            relationship_type=relationship_data.relationship_type,
            is_active=True
        )
        return relationship

    @log_service_operation
    async def get_relationship_by_id(self, user_id: int, relationship_id: int) -> FamilyRelationshipModel:
        relationship = await self.repository.get_by_id(relationship_id, user_id)
        return relationship

    @log_service_operation
    async def get_user_relationships(self, user_id: int, with_details: bool = False, skip: int = 0, limit: int = 100) -> List[FamilyRelationshipModel]:
        if with_details:
            relationships = await self.repository.get_with_details(user_id, skip, limit)
        else:
            relationships = await self.repository.get_all(user_id, skip, limit)
        return relationships

    @log_service_operation
    async def get_children(self, user_id: int, parent_id: int) -> List[FamilyRelationshipModel]:
        children = await self.repository.get_children(user_id, parent_id)
        return children

    @log_service_operation
    async def get_parents(self, user_id: int, child_id: int) -> List[FamilyRelationshipModel]:
        parents = await self.repository.get_parents(user_id, child_id)
        return parents

    @log_service_operation
    async def get_siblings(self, user_id: int, relative_id: int) -> List[FamilyRelationshipModel]:
        siblings = await self.repository.get_siblings(user_id, relative_id)
        return siblings

    @log_service_operation
    async def get_grandparents(self, user_id: int, relative_id: int) -> List[FamilyRelationshipModel]:
        grandparents = await self.repository.get_grandparents(user_id, relative_id)
        return grandparents

    @log_service_operation
    async def get_grandchildren(self, user_id: int, relative_id: int) -> List[FamilyRelationshipModel]:
        grandchildren = await self.repository.get_grandchildren(user_id, relative_id)
        return grandchildren

    @log_service_operation
    async def get_family_tree(self, user_id: int) -> List[FamilyRelationshipModel]:
        tree = await self.repository.get_all_relationships_graph(user_id)
        return tree

    @log_service_operation
    async def update_relationship(self, user_id: int, relationship_id: int, relationship_data: FamilyRelationshipUpdateSchema) -> FamilyRelationshipModel:
        update_data = relationship_data.model_dump(exclude_unset=True)
        relationship = await self.repository.update(relationship_id, user_id, **update_data)
        return relationship


    @log_service_operation
    async def activate_relationship(self, user_id: int, relationship_id: int) -> bool:
        result = await self.repository.activate(user_id, relationship_id)
        return result

    @log_service_operation
    async def deactivate_relationship(self, user_id: int, relationship_id: int) -> bool:
        result = await self.repository.deactivate(user_id, relationship_id)
        return result
        
    @log_service_operation
    async def delete_relationship(self, user_id: int, relationship_id: int) -> bool:
        result = await self.repository.delete(user_id, relationship_id)
        return result

    @log_service_operation
    async def get_family_statistics(self, user_id: int) -> FamilyStatisticsSchema:
        """Получить полную статистику по семейному дереву"""
        # Get relatives statistics
        relatives_stats = await self.relation_repository.get_statistics(user_id)

        # Get relationships statistics
        relationships_stats = await self.repository.get_statistics(user_id)

        return FamilyStatisticsSchema(
            total_relatives=relatives_stats['total_relatives'],
            total_relationships=relationships_stats['total_relationships'],
            alive_relatives=relatives_stats['alive_relatives'],
            deceased_relatives=relatives_stats['deceased_relatives'],
            activated_relatives=relatives_stats.get('activated_relatives', 0),
            gender_distribution=GenderStatisticsSchema(**relatives_stats['gender_distribution']),
            relationship_types_count=relationships_stats['relationship_types_count'],
            generations_count=relatives_stats['generations_count'],
            relationship_types=[
                RelationshipTypeCountSchema(**rt) for rt in relationships_stats['relationship_types']
            ],
            total_stories=relatives_stats.get('total_stories', 0)
        )
