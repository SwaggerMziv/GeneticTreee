from fastapi import UploadFile, File
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum
from src.family.enums import RelationshipType, GenderType


# ============ Story Media Schemas ============

class StoryMediaType(str, Enum):
    """Тип медиа в истории"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"


class StoryMediaSchema(BaseModel):
    """Медиа-файл в истории"""
    type: StoryMediaType
    url: str
    filename: Optional[str] = None
    content_type: Optional[str] = None
    size: Optional[int] = None  # размер в байтах
    duration: Optional[int] = None  # длительность для аудио/видео в секундах


class StorySchema(BaseModel):
    """Полная схема истории с текстом и медиа"""
    title: str = Field(..., min_length=1, max_length=255)
    text: Optional[str] = Field(None, max_length=10000)
    media: List[StoryMediaSchema] = Field(default=[])
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StoryCreateSchema(BaseModel):
    """Создание новой истории"""
    title: str = Field(..., min_length=1, max_length=255)
    text: Optional[str] = Field(None, max_length=10000)


class StoryUpdateSchema(BaseModel):
    """Обновление истории"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    text: Optional[str] = Field(None, max_length=10000)


class StoryMediaUploadResponseSchema(BaseModel):
    """Ответ при загрузке медиа в историю"""
    story_key: str
    media: StoryMediaSchema
    message: str = "Медиа успешно загружено"

# Родственник
class FamilyRelationCreateSchema(BaseModel):
    image_url: str | None = Field(None, max_length=255)
    first_name: str | None = Field(None, max_length=64)
    last_name: str | None = Field(None, max_length=64)
    middle_name: str | None = Field(None, max_length=64)
    birth_date: datetime | None = None
    death_date: datetime | None = None
    gender: GenderType = Field(default=GenderType.OTHER)
    contact_info: str | None = Field(None, max_length=255)
    telegram_id: str | None = Field(None, max_length=255)
    context: Dict[str, Any] = Field(default={})
    generation: int | None = Field(None)

class FamilyRelationContextUpdateSchema(BaseModel):
    key: str = Field(..., min_length=1, max_length=255)
    value: str | None = Field(None, max_length=2000)  # None для удаления истории

class FamilyRelationReadSchema(BaseModel):
    id: int
    user_id: int
    image_url: str | None
    first_name: str | None
    last_name: str | None
    middle_name: str | None
    birth_date: datetime | None
    death_date: datetime | None
    gender: GenderType = Field(default=GenderType.OTHER)
    contact_info: str | None
    telegram_id: str | None
    invitation_token: str | None
    telegram_user_id: int | None
    is_activated: bool
    activated_at: datetime | None
    context: Dict[str, Any] = Field(default={})
    generation: int | None
    created_at: datetime
    updated_at: datetime
    is_active: bool

class FamilyRelationUpdateSchema(BaseModel):
    image_url: str | None = Field(None, max_length=255)
    first_name: str | None = Field(None, max_length=64)
    last_name: str | None = Field(None, max_length=64)
    middle_name: str | None = Field(None, max_length=64)
    birth_date: datetime | None = None
    death_date: datetime | None = None
    gender: GenderType = Field(default=GenderType.OTHER)
    contact_info: str | None = Field(None, max_length=255)
    telegram_id: str | None = Field(None, max_length=255)
    context: Dict[str, Any] = Field(default={})
    generation: int | None = None
    is_active: bool | None = None

class FamilyRelationDeleteSchema(BaseModel):
    id: int
    is_active: bool = Field(default=False)

class FamilyRelationContextOutputSchema(BaseModel):
    context: Dict[str, Any] = Field(default={})

class FamilyRelationOutputSchema(BaseModel):
    id: int
    user_id: int
    image_url: str | None
    first_name: str | None
    last_name: str | None
    middle_name: str | None
    birth_date: datetime | None
    death_date: datetime | None
    gender: GenderType | None
    contact_info: str | None
    telegram_id: str | None
    invitation_token: str | None
    telegram_user_id: int | None
    is_activated: bool
    activated_at: datetime | None
    context: Dict[str, Any] = Field(default={})
    generation: int | None
    created_at: datetime
    updated_at: datetime
    is_active: bool

# Связь между родственниками
class FamilyRelationshipCreateSchema(BaseModel):
    from_relative_id: int
    to_relative_id: int
    relationship_type: RelationshipType

class FamilyRelationshipReadSchema(BaseModel):
    id: int
    user_id: int
    from_relative_id: int
    to_relative_id: int
    relationship_type: RelationshipType
    created_at: datetime
    is_active: bool

class FamilyRelationshipUpdateSchema(BaseModel):
    relationship_type: RelationshipType | None = None
    is_active: bool | None = None

class FamilyRelationshipDeleteSchema(BaseModel):
    id: int
    is_active: bool = Field(default=False)

class FamilyRelationshipOutputSchema(BaseModel):
    id: int
    user_id: int
    from_relative_id: int
    to_relative_id: int
    relationship_type: RelationshipType
    created_at: datetime
    is_active: bool


# Statistics schemas
class GenderStatisticsSchema(BaseModel):
    male: int = 0
    female: int = 0
    other: int = 0


class RelationshipTypeCountSchema(BaseModel):
    type: str
    count: int


class FamilyStatisticsSchema(BaseModel):
    total_relatives: int = 0
    total_relationships: int = 0
    alive_relatives: int = 0
    deceased_relatives: int = 0
    activated_relatives: int = 0
    gender_distribution: GenderStatisticsSchema = GenderStatisticsSchema()
    relationship_types_count: int = 0
    generations_count: int = 0
    relationship_types: list[RelationshipTypeCountSchema] = []
    total_stories: int = 0


# ============ Invitation Schemas ============

class GenerateInvitationResponseSchema(BaseModel):
    """Ответ при генерации ссылки-приглашения"""
    invitation_url: str
    token: str
    relative_id: int
    relative_name: str


class ActivateInvitationRequestSchema(BaseModel):
    """Запрос на активацию родственника через Telegram"""
    token: str = Field(..., min_length=1, max_length=64)
    telegram_user_id: int = Field(..., gt=0)
    telegram_username: str | None = Field(None, max_length=255)


# ============ Interview Message Schemas ============

class InterviewMessageRequestSchema(BaseModel):
    """Запрос на сохранение сообщения из интервью"""
    user_message: str = Field(..., min_length=1, max_length=10000)
    ai_response: str = Field(..., min_length=1, max_length=10000)


# ============ Bot Story Schemas ============

class BotStoryCreateSchema(BaseModel):
    """Создание истории от Telegram бота"""
    title: str = Field(..., min_length=1, max_length=500)
    text: str = Field(..., min_length=1, max_length=50000)


class StoriesCountResponseSchema(BaseModel):
    """Ответ с количеством историй"""
    count: int


# ============ Bot Relative Creation Schemas ============

class BotRelativeCreateSchema(BaseModel):
    """Создание родственника из Telegram бота"""
    interviewer_relative_id: int = Field(..., description="ID интервьюируемого родственника")
    first_name: str = Field(..., min_length=1, max_length=64)
    last_name: Optional[str] = Field(None, max_length=64)
    birth_year: Optional[int] = Field(None, ge=1800, le=2100)
    gender: GenderType = Field(default=GenderType.OTHER)
    relationship_type: RelationshipType = Field(..., description="Тип связи с интервьюируемым")
    additional_info: Optional[str] = Field(None, max_length=5000, description="Дополнительная информация")


class BotRelativeCreateResponseSchema(BaseModel):
    """Ответ при создании родственника из бота"""
    relative_id: int
    first_name: str
    relationship_type: RelationshipType
    message: str = "Родственник успешно создан"