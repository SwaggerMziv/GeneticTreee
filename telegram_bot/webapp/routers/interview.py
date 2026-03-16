"""Interview REST endpoints (history, confirm-story, create-relative).

SSE endpoints removed — replaced by Realtime API WebSocket relay.
"""
import logging

from fastapi import APIRouter, Depends

from services.api import backend_api
from webapp.dependencies import get_current_user
from webapp.interview_session import InterviewSession, session_manager
from webapp.schemas import ConfirmStoryRequest, CreateRelativeRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Interview"])


@router.get("/history")
async def get_interview_history(user: dict = Depends(get_current_user)):
    """Загрузить историю интервью из БД и восстановить сессию."""
    relative_id = user["relative_id"]

    # Загружаем данные из бэкенда
    messages_data = await backend_api.get_interview_messages(relative_id)
    relative_info = await backend_api.get_relative_by_telegram_id(user["telegram_user_id"])
    related_stories = await backend_api.get_related_stories(relative_id)

    relative_name = ""
    if relative_info:
        relative_name = f"{relative_info.get('first_name', '')} {relative_info.get('last_name', '')}".strip()

    # Проверяем есть ли in-memory сессия с актуальными данными
    existing = session_manager.get(relative_id)
    if existing and existing.messages:
        if not existing.related_stories_context and related_stories:
            existing.related_stories_context = related_stories
            existing.known_relatives = [
                r.get("name", "") for r in related_stories if r.get("name")
            ]
        session = existing
    else:
        session = InterviewSession.from_history(
            relative_id=relative_id,
            relative_name=relative_name,
            messages_data=messages_data,
            related_stories_context=related_stories,
        )
        session_manager._sessions[relative_id] = session

    return {
        "messages": session.messages,
        "question_count": session.question_count,
        "can_create_story": session.can_create_story,
        "relative_name": session.relative_name,
    }


@router.post("/confirm-story")
async def confirm_story(request: ConfirmStoryRequest, user: dict = Depends(get_current_user)):
    """Подтвердить, отклонить или продолжить интервью после превью истории."""
    relative_id = user["relative_id"]
    session = session_manager.get(relative_id)

    if not session:
        return {"success": False, "message": "Сессия не найдена."}

    if request.action == "save":
        if not session.pending_story:
            return {"success": False, "message": "Нет истории для сохранения."}

        title = session.pending_story["title"]
        text = session.pending_story["text"]

        saved = await backend_api.save_story(relative_id, title, text)

        if saved:
            # Сбрасываем сессию для нового интервью
            session.messages.clear()
            session.question_count = 0
            session.covered_topics.clear()
            session.pending_story = None
            session.photos.clear()
            return {"success": True, "message": "История сохранена!", "story_key": title}

        return {"success": False, "message": "Ошибка сохранения истории."}

    elif request.action == "discard":
        session.pending_story = None
        return {"success": True, "message": "История отклонена. Можете продолжить интервью."}

    elif request.action == "continue":
        session.pending_story = None
        return {"success": True, "message": "Продолжаем интервью."}

    return {"success": False, "message": "Неизвестное действие."}


@router.post("/create-relative")
async def create_relative(request: CreateRelativeRequest, user: dict = Depends(get_current_user)):
    """Создать профиль обнаруженного родственника."""
    relative_id = user["relative_id"]
    session = session_manager.get(relative_id)

    result = await backend_api.create_relative_from_bot(
        interviewer_relative_id=relative_id,
        first_name=request.first_name,
        relationship_type=request.relationship_type,
        last_name=request.last_name,
        birth_year=request.birth_year,
        gender=request.gender,
    )

    if result:
        if session:
            session.known_relatives.append(request.first_name)
            session.pending_relative = None
        return {"success": True, "message": f"Профиль {request.first_name} создан!", "data": result}

    return {"success": False, "message": "Не удалось создать профиль."}
