# -*- coding: utf-8 -*-
"""API роутер для ИИ-ассистента"""

from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from datetime import datetime, timezone

from src.auth.dependencies import get_current_user_id
from src.ai.service import AIService
from src.ai.models import AIChatSessionModel
from src.ai.schemas import (
    AIGenerateRequestSchema,
    AIEditRequestSchema,
    ValidationConflictSchema,
)
from src.family.dependencies import get_family_relation_service, get_family_relationship_service
from src.family.service import FamilyRelationService, FamilyRelationshipService
from src.database.client import get_session
from src.subscription.dependencies import get_quota_service
from src.subscription.quota_service import QuotaService
from src.subscription.enums import QuotaResource

MAX_CHAT_MESSAGES = 100  # 50 пар (user + assistant)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Assistant"])


def get_ai_service() -> AIService:
    """Зависимость для получения AI сервиса"""
    return AIService()


@router.post("/generate/stream")
async def generate_tree_stream(
    request: AIGenerateRequestSchema = Body(...),
    user_id: int = Depends(get_current_user_id),
    ai_service: AIService = Depends(get_ai_service),
    quota_service: QuotaService = Depends(get_quota_service),
):
    """
    Генерация семейного дерева из текстового описания (стриминг).
    Возвращает Server-Sent Events (SSE).
    """
    await quota_service.enforce_quota(user_id, QuotaResource.TREE_GENERATIONS)
    await quota_service.increment_quota(user_id, QuotaResource.TREE_GENERATIONS)
    return StreamingResponse(
        ai_service.generate_tree_stream(request, user_id=user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/unified/stream")
async def unified_stream(
    request: AIEditRequestSchema = Body(...),
    user_id: int = Depends(get_current_user_id),
    ai_service: AIService = Depends(get_ai_service),
    family_service: FamilyRelationService = Depends(get_family_relation_service),
    relationship_service: FamilyRelationshipService = Depends(get_family_relationship_service),
    quota_service: QuotaService = Depends(get_quota_service),
):
    """
    Унифицированный ИИ-ассистент (чат + редактирование + советы) со стримингом.
    Основной endpoint для взаимодействия с ИИ.
    Возвращает Server-Sent Events (SSE).
    """
    # Проверка квот AI
    if request.mode == "smart":
        await quota_service.enforce_quota(user_id, QuotaResource.AI_SMART_REQUESTS)
        await quota_service.increment_quota(user_id, QuotaResource.AI_SMART_REQUESTS)
    else:
        await quota_service.enforce_quota(user_id, QuotaResource.AI_REQUESTS)
        await quota_service.increment_quota(user_id, QuotaResource.AI_REQUESTS)

    # Получаем текущее дерево пользователя
    relatives = await family_service.get_user_relatives(user_id)
    relationships = await relationship_service.get_user_relationships(user_id)

    # Преобразуем в словари для ИИ
    relatives_data = [
        {
            "id": r.id,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "middle_name": r.middle_name,
            "gender": r.gender.value if r.gender else "other",
            "birth_date": r.birth_date.isoformat() if r.birth_date else None,
            "death_date": r.death_date.isoformat() if r.death_date else None,
            "generation": r.generation,
            "context": r.context or {},
        }
        for r in relatives
    ]

    relationships_data = [
        {
            "id": r.id,
            "from_relative_id": r.from_relative_id,
            "to_relative_id": r.to_relative_id,
            "relationship_type": r.relationship_type.value if r.relationship_type else None,
        }
        for r in relationships
    ]

    return StreamingResponse(
        ai_service.unified_stream(
            request,
            relatives_data,
            relationships_data,
            user_id,
            family_service,
            relationship_service,
            mode=request.mode,
            auto_accept=request.auto_accept,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/apply-generation")
async def apply_generation_result(
    result: Dict[str, Any] = Body(...),
    user_id: int = Depends(get_current_user_id),
    ai_service: AIService = Depends(get_ai_service),
    family_service: FamilyRelationService = Depends(get_family_relation_service),
    relationship_service: FamilyRelationshipService = Depends(get_family_relationship_service),
):
    """
    Применить результат генерации дерева - создать родственников и связи.
    Используется после генерации дерева из текста.
    """
    return await ai_service.apply_generate_result(
        result, user_id, family_service, relationship_service
    )


# ==================== ИСТОРИЯ ЧАТА ====================

@router.get("/chat-history")
async def get_chat_history(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    """Получить сохранённую историю чата AI-ассистента"""
    result = await session.execute(
        select(AIChatSessionModel).where(AIChatSessionModel.user_id == user_id)
    )
    chat_session = result.scalar_one_or_none()
    if not chat_session:
        return {"messages": []}
    return {"messages": chat_session.messages or []}


@router.put("/chat-history")
async def save_chat_history(
    body: Dict[str, Any] = Body(...),
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    """Сохранить историю чата (перезапись). Хранит последние 50 пар сообщений."""
    messages = body.get("messages", [])

    # Rolling limit — оставляем последние MAX_CHAT_MESSAGES
    if len(messages) > MAX_CHAT_MESSAGES:
        messages = messages[-MAX_CHAT_MESSAGES:]

    result = await session.execute(
        select(AIChatSessionModel).where(AIChatSessionModel.user_id == user_id)
    )
    chat_session = result.scalar_one_or_none()

    if chat_session:
        chat_session.messages = messages
        chat_session.updated_at = datetime.now(timezone.utc)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(chat_session, 'messages')
    else:
        chat_session = AIChatSessionModel(
            user_id=user_id,
            messages=messages,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(chat_session)

    return {"ok": True, "count": len(messages)}


@router.delete("/chat-history")
async def clear_chat_history(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    """Очистить историю чата"""
    result = await session.execute(
        select(AIChatSessionModel).where(AIChatSessionModel.user_id == user_id)
    )
    chat_session = result.scalar_one_or_none()
    if chat_session:
        await session.delete(chat_session)
    return {"ok": True}
