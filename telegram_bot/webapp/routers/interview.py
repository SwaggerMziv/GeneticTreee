"""Interview SSE endpoints."""
import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from bot.handlers.utils import extract_topics_from_messages
from config import config as bot_config
from services.ai import ai_service
from services.api import backend_api
from webapp.dependencies import get_current_user
from webapp.interview_session import session_manager
from webapp.schemas import ConfirmStoryRequest, CreateRelativeRequest, MessageRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Interview"])


def sse_event(event_type: str, data: dict) -> str:
    """Форматировать SSE событие."""
    return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False)}\n\n"


@router.get("/history")
async def get_interview_history(user: dict = Depends(get_current_user)):
    """Загрузить историю интервью из БД и восстановить сессию.

    Всегда перестраивает сессию из данных БД — так мы не теряем
    контекст при переключении страниц или перезапуске сервера.
    """
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
        # In-memory сессия актуальна — обновляем контекст
        if not existing.related_stories_context and related_stories:
            existing.related_stories_context = related_stories
            existing.known_relatives = [
                r.get("name", "") for r in related_stories if r.get("name")
            ]
        session = existing
    else:
        # Нет сессии или она пустая — восстанавливаем из БД
        from webapp.interview_session import InterviewSession
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


@router.post("/start")
async def start_interview(user: dict = Depends(get_current_user)):
    """Начать интервью — получить первый вопрос (SSE)."""
    relative_id = user["relative_id"]

    async def event_stream():
        yield sse_event("status", {"content": "Подготовка вопроса..."})

        relative_info = await backend_api.get_relative_by_telegram_id(user["telegram_user_id"])
        relative_name = ""
        if relative_info:
            relative_name = f"{relative_info.get('first_name', '')} {relative_info.get('last_name', '')}".strip()

        # Создаём новую сессию
        session = session_manager.create(relative_id, relative_name)

        # Загружаем контекст
        session.related_stories_context = await backend_api.get_related_stories(relative_id)
        if session.related_stories_context:
            session.known_relatives = [
                r.get("name", "") for r in session.related_stories_context if r.get("name")
            ]

        # Получаем первый вопрос
        question, success = await ai_service.get_interview_question(
            messages=[],
            relative_name=session.relative_name,
            covered_topics=[],
            related_stories_context=session.related_stories_context,
        )

        if not success or not question:
            yield sse_event("error", {"content": "Не удалось получить вопрос. Попробуйте позже."})
            yield sse_event("done", {})
            return

        session.messages.append({"role": "assistant", "content": question})

        yield sse_event("question", {
            "content": question,
            "question_count": 0,
            "can_create_story": False,
        })
        yield sse_event("done", {})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/message")
async def send_message(request: MessageRequest, user: dict = Depends(get_current_user)):
    """Отправить ответ и получить следующий вопрос (SSE)."""
    relative_id = user["relative_id"]

    async def event_stream():
        session = session_manager.get(relative_id)
        if not session:
            yield sse_event("error", {"content": "Сессия не найдена. Начните интервью заново."})
            yield sse_event("done", {})
            return

        yield sse_event("status", {"content": "Обрабатываю ответ..."})

        # Добавляем ответ пользователя
        session.messages.append({"role": "user", "content": request.text})
        session.question_count += 1
        session.covered_topics = extract_topics_from_messages(session.messages)

        # Сохраняем пару вопрос/ответ в БД
        last_ai = ""
        for msg in reversed(session.messages[:-1]):
            if msg["role"] == "assistant":
                last_ai = msg["content"]
                break

        if last_ai:
            await backend_api.save_interview_message_pair(
                relative_id, request.text, last_ai
            )

        # Анализируем на упоминание родственников
        analysis = await ai_service.analyze_for_mentioned_relatives(
            request.text,
            existing_relatives=session.known_relatives,
        )

        if analysis and analysis.get("found"):
            session.pending_relative = analysis
            yield sse_event("relative_detected", {
                "name": analysis.get("name", ""),
                "probable_role": analysis.get("probable_role", "other"),
                "context": analysis.get("context", ""),
            })

        # Получаем следующий вопрос
        yield sse_event("status", {"content": "Формулирую вопрос..."})

        question, success = await ai_service.get_interview_question(
            messages=session.messages,
            relative_name=session.relative_name,
            covered_topics=session.covered_topics,
            related_stories_context=session.related_stories_context,
        )

        if not success or not question:
            yield sse_event("error", {"content": "Не удалось получить вопрос. Попробуйте позже."})
            yield sse_event("done", {})
            return

        session.messages.append({"role": "assistant", "content": question})

        yield sse_event("question", {
            "content": question,
            "question_count": session.question_count,
            "can_create_story": session.can_create_story,
        })

        # Авто-создание истории после достаточного количества вопросов
        if (
            session.question_count >= bot_config.AUTO_STORY_THRESHOLD
            and not session.pending_story
        ):
            yield sse_event("status", {"content": "Достаточно материала! Создаю историю..."})
            try:
                result = await ai_service.create_story(session.messages)
                if result:
                    title, text, has_content = result
                    if has_content:
                        session.pending_story = {"title": title, "text": text}
                        yield sse_event("story_preview", {"title": title, "text": text})
            except Exception as e:
                logger.warning(f"Авто-создание истории: ошибка: {e}")

        yield sse_event("done", {})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/create-story")
async def create_story(user: dict = Depends(get_current_user)):
    """Создать историю из текущего диалога (SSE)."""
    relative_id = user["relative_id"]

    async def event_stream():
        session = session_manager.get(relative_id)
        if not session:
            yield sse_event("error", {"content": "Сессия не найдена."})
            yield sse_event("done", {})
            return

        if session.pending_story:
            yield sse_event("error", {"content": "История уже создаётся."})
            yield sse_event("done", {})
            return

        if len(session.messages) < 2:
            yield sse_event("error", {"content": "Недостаточно сообщений для создания истории."})
            yield sse_event("done", {})
            return

        yield sse_event("status", {"content": "Создаю историю..."})

        result = await ai_service.create_story(session.messages)

        if not result:
            yield sse_event("error", {"content": "Не удалось создать историю. Попробуйте позже."})
            yield sse_event("done", {})
            return

        title, text, has_content = result

        if not has_content:
            yield sse_event("insufficient_data", {
                "content": text,
                "title": title,
            })
            yield sse_event("done", {})
            return

        session.pending_story = {"title": title, "text": text}

        yield sse_event("story_preview", {
            "title": title,
            "text": text,
        })
        yield sse_event("done", {})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
        # Добавляем в known_relatives
        if session:
            session.known_relatives.append(request.first_name)
            session.pending_relative = None
        return {"success": True, "message": f"Профиль {request.first_name} создан!", "data": result}

    return {"success": False, "message": "Не удалось создать профиль."}
