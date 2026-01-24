# -*- coding: utf-8 -*-
"""API роутер для ИИ-ассистента"""

from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any

from src.auth.dependencies import get_current_user_id
from src.ai.service import AIService
from src.ai.schemas import (
    AIGenerateRequestSchema,
    AIEditRequestSchema,
    ValidationConflictSchema,
)
from src.family.dependencies import get_family_relation_service, get_family_relationship_service
from src.family.service import FamilyRelationService, FamilyRelationshipService

router = APIRouter(prefix="/api/v1/ai", tags=["AI Assistant"])


def get_ai_service() -> AIService:
    """Зависимость для получения AI сервиса"""
    return AIService()


@router.post("/generate/stream")
async def generate_tree_stream(
    request: AIGenerateRequestSchema = Body(...),
    user_id: int = Depends(get_current_user_id),
    ai_service: AIService = Depends(get_ai_service),
):
    """
    Генерация семейного дерева из текстового описания (стриминг).
    Возвращает Server-Sent Events (SSE).
    """
    return StreamingResponse(
        ai_service.generate_tree_stream(request),
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
):
    """
    Унифицированный ИИ-ассистент (чат + редактирование + советы) со стримингом.
    Основной endpoint для взаимодействия с ИИ.
    Возвращает Server-Sent Events (SSE).
    """
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
