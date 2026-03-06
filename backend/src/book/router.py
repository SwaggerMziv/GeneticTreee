# -*- coding: utf-8 -*-
"""API роутер для генерации семейной книги"""

from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user_id
from src.book.service import BookService
from src.subscription.dependencies import get_quota_service
from src.subscription.quota_service import QuotaService
from src.subscription.enums import QuotaResource
from src.book.schemas import BookGenerateRequestSchema
from src.family.dependencies import get_family_relation_service, get_family_relationship_service
from src.family.service import FamilyRelationService, FamilyRelationshipService
from src.storage.s3.dependencies import get_s3_manager
from src.storage.s3.manager import S3Manager
from src.database.dependencies import get_database_session

router = APIRouter(prefix="/api/v1/book", tags=["Book Generation"])


def get_book_service() -> BookService:
    """Зависимость для получения Book сервиса"""
    return BookService()


@router.post("/generate/stream")
async def generate_book_stream(
    request: BookGenerateRequestSchema = Body(...),
    user_id: int = Depends(get_current_user_id),
    book_service: BookService = Depends(get_book_service),
    family_service: FamilyRelationService = Depends(get_family_relation_service),
    relationship_service: FamilyRelationshipService = Depends(get_family_relationship_service),
    s3_manager: S3Manager = Depends(get_s3_manager),
    session: AsyncSession = Depends(get_database_session),
    quota_service: QuotaService = Depends(get_quota_service),
):
    """
    Генерация семейной книги в формате PDF.

    Возвращает Server-Sent Events (SSE) с прогрессом генерации.

    События:
    - type: "progress" - обновление прогресса (0-100%)
    - type: "result" - готовый PDF в base64
    - type: "error" - ошибка генерации
    - type: "done" - завершение потока
    """
    await quota_service.enforce_quota(user_id, QuotaResource.BOOK_GENERATIONS)
    await quota_service.increment_quota(user_id, QuotaResource.BOOK_GENERATIONS)
    return StreamingResponse(
        book_service.generate_book_stream(
            user_id=user_id,
            request=request,
            family_service=family_service,
            relationship_service=relationship_service,
            s3_manager=s3_manager,
            session=session,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
