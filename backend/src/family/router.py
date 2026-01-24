from fastapi import APIRouter, Body, Path, Query, UploadFile, File
from src.family.dependencies import get_family_relation_service, get_family_relationship_service
from src.family.schemas import (
    FamilyRelationCreateSchema, FamilyRelationUpdateSchema, FamilyRelationContextUpdateSchema,
    FamilyRelationshipCreateSchema, FamilyRelationshipUpdateSchema,
    FamilyRelationOutputSchema, FamilyRelationshipOutputSchema,
    FamilyStatisticsSchema, FamilyRelationContextOutputSchema,
    StorySchema, StoryCreateSchema, StoryUpdateSchema, StoryMediaUploadResponseSchema,
    GenerateInvitationResponseSchema, ActivateInvitationRequestSchema,
    InterviewMessageRequestSchema, BotStoryCreateSchema, StoriesCountResponseSchema
)
from src.family.service import FamilyRelationService, FamilyRelationshipService
from src.family.story_service import StoryService
from src.storage.s3.dependencies import get_s3_manager
from src.storage.s3.manager import S3Manager
from typing import List
from fastapi import Depends
from src.auth.dependencies import require_superuser
from src.auth.dependencies import get_current_user_id


def get_story_service(
    family_service: FamilyRelationService = Depends(get_family_relation_service),
    s3_manager: S3Manager = Depends(get_s3_manager)
) -> StoryService:
    """Зависимость для получения StoryService"""
    return StoryService(family_service, s3_manager)

router = APIRouter(prefix="/api/v1/family", tags=["Family"])

# Family Relations endpoints
@router.post("/{user_id}/relatives", response_model=FamilyRelationOutputSchema)
async def create_relative(
    user_id: int = Depends(get_current_user_id),
    relative_data: FamilyRelationCreateSchema = Body(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.create_relative(user_id, relative_data)

@router.patch("/{user_id}/relatives/{relative_id}/context", response_model=FamilyRelationContextOutputSchema)
async def update_relative_context(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    context_data: FamilyRelationContextUpdateSchema = Body(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    await service.update_relative_context(user_id, relative_id, context_data)
    return await service.get_relative_context(user_id, relative_id)

@router.get("/{user_id}/relatives/{relative_id}/context", response_model=FamilyRelationContextOutputSchema)
async def get_relative_context(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.get_relative_context(user_id, relative_id)



@router.get("/{user_id}/relatives", response_model=List[FamilyRelationOutputSchema])
async def get_user_relatives(
    user_id: int = Depends(get_current_user_id),
    only_active: bool = True,
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.get_user_relatives(user_id, only_active)

# Специфичные маршруты должны быть определены ПЕРЕД общим маршрутом с {relative_id}
@router.get("/{user_id}/relatives/alive", response_model=List[FamilyRelationOutputSchema])
async def get_alive_relatives(
    user_id: int = Depends(get_current_user_id),
    only_active: bool = True,
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.get_alive_relatives(user_id, only_active)

@router.get("/{user_id}/relatives/deceased", response_model=List[FamilyRelationOutputSchema])
async def get_deceased_relatives(
    user_id: int = Depends(get_current_user_id),
    only_active: bool = True,
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.get_deceased_relatives(user_id, only_active)

@router.get("/{user_id}/relatives/search/{search_term}", response_model=List[FamilyRelationOutputSchema])
async def search_relatives(
    user_id: int = Depends(get_current_user_id),
    search_term: str = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.search_relatives_by_name(user_id, search_term)

@router.get("/{user_id}/relatives/gender/{gender}", response_model=List[FamilyRelationOutputSchema])
async def get_relatives_by_gender(
    user_id: int = Depends(get_current_user_id),
    gender: str = Path(...),
    only_active: bool = True,
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.get_relatives_by_gender(user_id, gender, only_active)

@router.get("/{user_id}/relatives/activated", response_model=List[FamilyRelationOutputSchema])
async def get_activated_relatives(
    user_id: int = Depends(get_current_user_id),
    only_active: bool = True,
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Получить активированных (подключённых к Telegram) родственников"""
    return await service.get_activated_relatives(user_id, only_active)

@router.get("/{user_id}/relatives/not-activated", response_model=List[FamilyRelationOutputSchema])
async def get_not_activated_relatives(
    user_id: int = Depends(get_current_user_id),
    only_active: bool = True,
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Получить не активированных (не подключённых к Telegram) родственников"""
    return await service.get_not_activated_relatives(user_id, only_active)

@router.get("/{user_id}/relatives/{relative_id}", response_model=FamilyRelationOutputSchema)
async def get_relative(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.get_relative_by_id(user_id, relative_id)

@router.put("/{user_id}/relatives/{relative_id}", response_model=FamilyRelationOutputSchema)
async def update_relative(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    relative_data: FamilyRelationUpdateSchema = Body(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.update_relative(user_id, relative_id, relative_data)

@router.patch("/{user_id}/relatives/{relative_id}/activate", response_model=FamilyRelationOutputSchema)
async def activate_relative_by_id(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.activate_relative(user_id, relative_id)

@router.patch("/{user_id}/relatives/{relative_id}/deactivate", response_model=FamilyRelationOutputSchema)
async def deactivate_relative_by_id(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.deactivate_relative(user_id, relative_id)

@router.delete("/{user_id}/relatives/{relative_id}")
async def delete_relative_by_id(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    return await service.delete_relative(user_id, relative_id)

# Invitation system endpoints
@router.post("/{user_id}/relatives/{relative_id}/generate-invitation", response_model=GenerateInvitationResponseSchema)
async def generate_invitation_link(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Генерировать ссылку-приглашение для родственника в Telegram бот"""
    from src.config import settings
    return await service.generate_invitation(user_id, relative_id, settings.telegram_bot_username)

@router.post("/activate-invitation", response_model=FamilyRelationOutputSchema)
async def activate_invitation(
    request: ActivateInvitationRequestSchema = Body(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Активировать родственника через токен приглашения (публичный эндпоинт для Telegram бота)"""
    return await service.activate_invitation(
        token=request.token,
        telegram_user_id=request.telegram_user_id,
        telegram_username=request.telegram_username
    )

@router.post("/relatives/{relative_id}/interview-message")
async def save_interview_message(
    relative_id: int = Path(...),
    request: InterviewMessageRequestSchema = Body(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Сохранить сообщение из интервью в контекст родственника (публичный эндпоинт для Telegram бота)"""
    await service.save_interview_message(relative_id, request.user_message, request.ai_response)
    return {"message": "Интервью сообщение сохранено"}


@router.post("/relatives/{relative_id}/story", response_model=StorySchema)
async def create_story_from_bot(
    relative_id: int = Path(...),
    request: BotStoryCreateSchema = Body(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Создать историю от Telegram бота (публичный эндпоинт)"""
    return await service.create_story_from_bot(relative_id, request.title, request.text)


@router.get("/relatives/{relative_id}/stories-count", response_model=StoriesCountResponseSchema)
async def get_stories_count(
    relative_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Получить количество историй родственника (публичный эндпоинт для Telegram бота)"""
    count = await service.get_stories_count(relative_id)
    return StoriesCountResponseSchema(count=count)


@router.get("/relative-by-telegram/{telegram_user_id}", response_model=FamilyRelationOutputSchema)
async def get_relative_by_telegram(
    telegram_user_id: int = Path(...),
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Получить родственника по Telegram user ID (публичный эндпоинт для Telegram бота)"""
    return await service.get_relative_by_telegram_id(telegram_user_id)


@router.get("/relatives/active-telegram", response_model=List[FamilyRelationOutputSchema])
async def get_all_active_telegram_users(
    service: FamilyRelationService = Depends(get_family_relation_service)
):
    """Получить всех родственников с привязанным Telegram (публичный эндпоинт для рассылки)"""
    return await service.get_all_telegram_users()


# Family Relationships endpoints
@router.post("/{user_id}/relationships", response_model=FamilyRelationshipOutputSchema)
async def create_relationship(
    user_id: int = Depends(get_current_user_id),
    relationship: FamilyRelationshipCreateSchema = Body(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.create_relationship(user_id, relationship)

@router.get("/{user_id}/relationships", response_model=List[FamilyRelationshipOutputSchema])
async def get_user_relationships(
    user_id: int = Depends(get_current_user_id),
    with_details: bool = False,
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_user_relationships(user_id, with_details)

@router.get("/{user_id}/relationships/{relationship_id}", response_model=FamilyRelationshipOutputSchema)
async def get_relationship(
    relationship_id: int = Path(...),
    user_id: int = Depends(get_current_user_id),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_relationship_by_id(user_id, relationship_id)

@router.put("/{user_id}/relationships/{relationship_id}", response_model=FamilyRelationshipOutputSchema)
async def update_relationship(
    user_id: int = Depends(get_current_user_id),
    relationship_id: int = Path(...),
    relationship: FamilyRelationshipUpdateSchema = Body(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.update_relationship(user_id, relationship_id, relationship)

@router.patch("/{user_id}/relationships/{relationship_id}/activate", response_model=FamilyRelationshipOutputSchema)
async def activate_relationship_by_id(
    user_id: int = Depends(get_current_user_id),
    relationship_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.activate_relationship(user_id, relationship_id)

@router.patch("/{user_id}/relationships/{relationship_id}/deactivate", response_model=FamilyRelationshipOutputSchema)
async def deactivate_relationship_by_id(
    user_id: int = Depends(get_current_user_id),
    relationship_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.deactivate_relationship(user_id, relationship_id)

@router.delete("/{user_id}/relationships/{relationship_id}")
async def delete_relationship(
    user_id: int = Depends(get_current_user_id),
    relationship_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.delete_relationship(user_id, relationship_id)

@router.get("/{user_id}/relationships/children/{parent_id}", response_model=List[FamilyRelationshipOutputSchema])
async def get_children(
    user_id: int = Depends(get_current_user_id),
    parent_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_children(user_id, parent_id)

@router.get("/{user_id}/relationships/parents/{child_id}", response_model=List[FamilyRelationshipOutputSchema])
async def get_parents(
    user_id: int = Depends(get_current_user_id),
    child_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_parents(user_id, child_id)

@router.get("/{user_id}/relationships/siblings/{relative_id}", response_model=List[FamilyRelationshipOutputSchema])
async def get_siblings(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_siblings(user_id, relative_id)

@router.get("/{user_id}/relationships/grandparents/{relative_id}", response_model=List[FamilyRelationshipOutputSchema])
async def get_grandparents(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_grandparents(user_id, relative_id)

@router.get("/{user_id}/relationships/grandchildren/{relative_id}", response_model=List[FamilyRelationshipOutputSchema])
async def get_grandchildren(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_grandchildren(user_id, relative_id)

@router.get("/{user_id}/family-tree", response_model=List[FamilyRelationshipOutputSchema])
async def get_family_tree(
    user_id: int = Depends(get_current_user_id),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    return await service.get_family_tree(user_id)


@router.get("/{user_id}/statistics", response_model=FamilyStatisticsSchema)
async def get_family_statistics(
    user_id: int = Depends(get_current_user_id),
    service: FamilyRelationshipService = Depends(get_family_relationship_service)
):
    """Получить статистику по семейному дереву пользователя"""
    return await service.get_family_statistics(user_id)


# ============ Story Endpoints ============

@router.get("/{user_id}/relatives/{relative_id}/stories", response_model=List[StorySchema])
async def get_relative_stories(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_service: StoryService = Depends(get_story_service)
):
    """Получить все истории родственника"""
    return await story_service.get_stories(user_id, relative_id)


@router.get("/{user_id}/relatives/{relative_id}/stories/{story_key}", response_model=StorySchema)
async def get_relative_story(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_key: str = Path(...),
    story_service: StoryService = Depends(get_story_service)
):
    """Получить конкретную историю родственника"""
    return await story_service.get_story(user_id, relative_id, story_key)


@router.post("/{user_id}/relatives/{relative_id}/stories", response_model=StorySchema)
async def create_relative_story(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_data: StoryCreateSchema = Body(...),
    story_service: StoryService = Depends(get_story_service)
):
    """Создать новую историю для родственника"""
    return await story_service.create_story(user_id, relative_id, story_data)


@router.put("/{user_id}/relatives/{relative_id}/stories/{story_key}", response_model=StorySchema)
async def update_relative_story(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_key: str = Path(...),
    story_data: StoryUpdateSchema = Body(...),
    story_service: StoryService = Depends(get_story_service)
):
    """Обновить историю родственника"""
    return await story_service.update_story(user_id, relative_id, story_key, story_data)


@router.delete("/{user_id}/relatives/{relative_id}/stories/{story_key}")
async def delete_relative_story(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_key: str = Path(...),
    story_service: StoryService = Depends(get_story_service)
):
    """Удалить историю родственника"""
    await story_service.delete_story(user_id, relative_id, story_key)
    return {"message": "История удалена"}


@router.post(
    "/{user_id}/relatives/{relative_id}/stories/{story_key}/media",
    response_model=StoryMediaUploadResponseSchema
)
async def upload_story_media(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_key: str = Path(...),
    file: UploadFile = File(...),
    story_service: StoryService = Depends(get_story_service)
):
    """
    Загрузить медиа-файл (фото/видео/аудио) в историю.

    Поддерживаемые форматы:
    - Изображения: JPEG, PNG, GIF, WebP (до 10 MB)
    - Видео: MP4, MOV, WebM (до 100 MB)
    - Аудио: MP3, WAV, OGG, M4A (до 50 MB)
    """
    return await story_service.upload_media(user_id, relative_id, story_key, file)


@router.delete("/{user_id}/relatives/{relative_id}/stories/{story_key}/media")
async def delete_story_media(
    user_id: int = Depends(get_current_user_id),
    relative_id: int = Path(...),
    story_key: str = Path(...),
    media_url: str = Query(..., description="URL медиа-файла для удаления"),
    story_service: StoryService = Depends(get_story_service)
):
    """Удалить медиа-файл из истории"""
    await story_service.delete_media(user_id, relative_id, story_key, media_url)
    return {"message": "Медиа удалено"}
