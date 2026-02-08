# -*- coding: utf-8 -*-
"""Сервис для работы с историями родственников и их медиа"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException

from src.family.schemas import (
    StorySchema, StoryCreateSchema, StoryUpdateSchema,
    StoryMediaSchema, StoryMediaType, StoryMediaUploadResponseSchema
)
from src.family.service import FamilyRelationService
from src.storage.s3.manager import S3Manager


# Допустимые MIME-типы для разных типов медиа
ALLOWED_MEDIA_TYPES = {
    StoryMediaType.IMAGE: [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"
    ],
    StoryMediaType.VIDEO: [
        "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/mpeg"
    ],
    StoryMediaType.AUDIO: [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm",
        "audio/x-m4a", "audio/mp4", "audio/aac"
    ],
}

# Максимальные размеры файлов (в байтах)
MAX_FILE_SIZES = {
    StoryMediaType.IMAGE: 10 * 1024 * 1024,   # 10 MB
    StoryMediaType.VIDEO: 100 * 1024 * 1024,  # 100 MB
    StoryMediaType.AUDIO: 50 * 1024 * 1024,   # 50 MB
}

# Максимальное количество изображений на одну историю
MAX_IMAGES_PER_STORY = 5


class StoryService:
    """Сервис для управления историями родственников"""

    def __init__(
        self,
        family_service: FamilyRelationService,
        s3_manager: S3Manager
    ):
        self.family_service = family_service
        self.s3_manager = s3_manager

    def _detect_media_type(self, content_type: str) -> StoryMediaType:
        """Определение типа медиа по MIME-типу"""
        for media_type, mime_types in ALLOWED_MEDIA_TYPES.items():
            if content_type in mime_types:
                return media_type
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип файла: {content_type}"
        )

    def _validate_file_size(self, size: int, media_type: StoryMediaType) -> None:
        """Проверка размера файла"""
        max_size = MAX_FILE_SIZES.get(media_type)
        if max_size and size > max_size:
            max_mb = max_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"Файл слишком большой. Максимальный размер для {media_type.value}: {max_mb} MB"
            )

    def _get_story_from_context(self, context: Dict[str, Any], story_key: str) -> Optional[Dict]:
        """Получение истории из контекста"""
        return context.get(story_key)

    def _story_dict_to_schema(self, story_key: str, story_dict: Dict) -> StorySchema:
        """Конвертация dict истории в схему"""
        media_list = []
        for m in story_dict.get("media", []):
            media_list.append(StoryMediaSchema(
                type=StoryMediaType(m["type"]),
                url=m["url"],
                filename=m.get("filename"),
                content_type=m.get("content_type"),
                size=m.get("size"),
                duration=m.get("duration"),
            ))

        return StorySchema(
            title=story_key,
            text=story_dict.get("text"),
            media=media_list,
            created_at=story_dict.get("created_at"),
            updated_at=story_dict.get("updated_at"),
        )

    async def get_stories(
        self,
        user_id: int,
        relative_id: int
    ) -> List[StorySchema]:
        """Получение всех историй родственника"""
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        stories = []
        for key, value in context.items():
            if isinstance(value, dict) and "text" in value:
                # Новый формат истории с медиа
                stories.append(self._story_dict_to_schema(key, value))
            elif isinstance(value, str):
                # Старый формат - просто текст
                stories.append(StorySchema(
                    title=key,
                    text=value,
                    media=[],
                ))

        return stories

    async def get_story(
        self,
        user_id: int,
        relative_id: int,
        story_key: str
    ) -> StorySchema:
        """Получение конкретной истории"""
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        story_data = context.get(story_key)
        if not story_data:
            raise HTTPException(status_code=404, detail="История не найдена")

        if isinstance(story_data, dict):
            return self._story_dict_to_schema(story_key, story_data)
        else:
            # Старый формат
            return StorySchema(title=story_key, text=str(story_data), media=[])

    async def create_story(
        self,
        user_id: int,
        relative_id: int,
        story_data: StoryCreateSchema
    ) -> StorySchema:
        """Создание новой истории"""
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        story_key = story_data.title
        if story_key in context:
            raise HTTPException(status_code=400, detail="История с таким названием уже существует")

        now = datetime.now(timezone.utc).isoformat()
        new_story = {
            "text": story_data.text,
            "media": [],
            "created_at": now,
            "updated_at": now,
        }

        context[story_key] = new_story

        # Обновляем весь контекст
        relative = await self.family_service.get_relative_by_id(user_id, relative_id)
        from src.family.schemas import FamilyRelationUpdateSchema
        await self.family_service.update_relative(
            user_id, relative_id,
            FamilyRelationUpdateSchema(context=context)
        )

        return self._story_dict_to_schema(story_key, new_story)

    async def update_story(
        self,
        user_id: int,
        relative_id: int,
        story_key: str,
        story_data: StoryUpdateSchema
    ) -> StorySchema:
        """Обновление истории"""
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        if story_key not in context:
            raise HTTPException(status_code=404, detail="История не найдена")

        existing = context[story_key]
        if isinstance(existing, str):
            # Конвертируем старый формат
            existing = {
                "text": existing,
                "media": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

        if story_data.text is not None:
            existing["text"] = story_data.text

        existing["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Если меняется название
        if story_data.title and story_data.title != story_key:
            if story_data.title in context:
                raise HTTPException(status_code=400, detail="История с таким названием уже существует")
            del context[story_key]
            story_key = story_data.title

        context[story_key] = existing

        from src.family.schemas import FamilyRelationUpdateSchema
        await self.family_service.update_relative(
            user_id, relative_id,
            FamilyRelationUpdateSchema(context=context)
        )

        return self._story_dict_to_schema(story_key, existing)

    async def delete_story(
        self,
        user_id: int,
        relative_id: int,
        story_key: str
    ) -> None:
        """Удаление истории и всех её медиа"""
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        if story_key not in context:
            raise HTTPException(status_code=404, detail="История не найдена")

        story_data = context[story_key]

        # Удаляем медиа из S3
        if isinstance(story_data, dict) and "media" in story_data:
            for media in story_data["media"]:
                try:
                    await self.s3_manager.delete(media["url"])
                except Exception:
                    pass  # Игнорируем ошибки удаления

        del context[story_key]

        from src.family.schemas import FamilyRelationUpdateSchema
        await self.family_service.update_relative(
            user_id, relative_id,
            FamilyRelationUpdateSchema(context=context)
        )

    async def upload_media(
        self,
        user_id: int,
        relative_id: int,
        story_key: str,
        file: UploadFile
    ) -> StoryMediaUploadResponseSchema:
        """Загрузка медиа-файла в историю"""
        # Проверяем существование родственника и истории
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        # Создаём историю если не существует
        if story_key not in context:
            now = datetime.now(timezone.utc).isoformat()
            context[story_key] = {
                "text": "",
                "media": [],
                "created_at": now,
                "updated_at": now,
            }

        story_data = context[story_key]

        # Конвертируем старый формат если нужно
        if isinstance(story_data, str):
            story_data = {
                "text": story_data,
                "media": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        # Определяем тип медиа предварительно для проверки лимита
        content_type = file.content_type or "application/octet-stream"
        media_type = self._detect_media_type(content_type)

        # Проверка лимита изображений
        if media_type == StoryMediaType.IMAGE:
            current_images = sum(1 for m in story_data.get("media", []) if m.get("type") == "image")
            if current_images >= MAX_IMAGES_PER_STORY:
                raise HTTPException(
                    status_code=400,
                    detail=f"Достигнут лимит фотографий ({MAX_IMAGES_PER_STORY}). Удалите существующие для добавления новых."
                )

        # Читаем файл для проверки размера
        file_content = await file.read()
        file_size = len(file_content)
        self._validate_file_size(file_size, media_type)

        # Возвращаем курсор в начало для загрузки
        await file.seek(0)

        # Загружаем в S3
        key, url, uploaded_content_type = await self.s3_manager.upload(file)

        # Создаём запись о медиа
        media_item = {
            "type": media_type.value,
            "url": url,
            "filename": file.filename,
            "content_type": uploaded_content_type,
            "size": file_size,
        }

        # Добавляем в историю
        if "media" not in story_data:
            story_data["media"] = []
        story_data["media"].append(media_item)
        story_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        context[story_key] = story_data

        # Сохраняем
        from src.family.schemas import FamilyRelationUpdateSchema
        await self.family_service.update_relative(
            user_id, relative_id,
            FamilyRelationUpdateSchema(context=context)
        )

        return StoryMediaUploadResponseSchema(
            story_key=story_key,
            media=StoryMediaSchema(
                type=media_type,
                url=url,
                filename=file.filename,
                content_type=uploaded_content_type,
                size=file_size,
            ),
            message="Медиа успешно загружено"
        )

    async def delete_media(
        self,
        user_id: int,
        relative_id: int,
        story_key: str,
        media_url: str
    ) -> None:
        """Удаление медиа-файла из истории"""
        context_data = await self.family_service.get_relative_context(user_id, relative_id)
        context = context_data.context

        if story_key not in context:
            raise HTTPException(status_code=404, detail="История не найдена")

        story_data = context[story_key]
        if isinstance(story_data, str):
            raise HTTPException(status_code=400, detail="В этой истории нет медиа")

        media_list = story_data.get("media", [])
        media_found = False

        for i, media in enumerate(media_list):
            if media["url"] == media_url:
                # Удаляем из S3
                try:
                    await self.s3_manager.delete(media_url)
                except Exception:
                    pass

                media_list.pop(i)
                media_found = True
                break

        if not media_found:
            raise HTTPException(status_code=404, detail="Медиа не найдено")

        story_data["media"] = media_list
        story_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        context[story_key] = story_data

        from src.family.schemas import FamilyRelationUpdateSchema
        await self.family_service.update_relative(
            user_id, relative_id,
            FamilyRelationUpdateSchema(context=context)
        )
