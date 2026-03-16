"""Realtime API tool definitions and instruction builder."""
import json
import logging

from config import config as bot_config, INTERVIEW_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


# Tool definitions для OpenAI Realtime API session.update
REALTIME_TOOLS = [
    {
        "type": "function",
        "name": "save_interview_exchange",
        "description": (
            "Сохранить пару вопрос-ответ в архив. "
            "Вызывай ПОСЛЕ каждого ответа пользователя. "
            "ai_question — твой последний вопрос, user_answer — ответ собеседника."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "ai_question": {
                    "type": "string",
                    "description": "Вопрос, который ты задал",
                },
                "user_answer": {
                    "type": "string",
                    "description": "Ответ собеседника",
                },
            },
            "required": ["ai_question", "user_answer"],
        },
    },
    {
        "type": "function",
        "name": "report_detected_relative",
        "description": (
            "Сообщить об упомянутом родственнике с именем. "
            "Вызывай когда собеседник упоминает конкретного родственника по имени, "
            "которого ещё нет в списке known_relatives."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Имя упомянутого родственника",
                },
                "probable_role": {
                    "type": "string",
                    "enum": [
                        "mother", "father", "brother", "sister",
                        "grandfather", "grandmother", "uncle", "aunt",
                        "son", "daughter", "spouse", "other",
                    ],
                    "description": "Предполагаемая роль в семье",
                },
                "context": {
                    "type": "string",
                    "description": "Контекст упоминания — цитата или краткое описание",
                },
            },
            "required": ["name", "probable_role", "context"],
        },
    },
    {
        "type": "function",
        "name": "create_story_summary",
        "description": (
            "Создать историю-итог из собранных фактов. "
            "Вызывай когда собрано минимум 3 конкретных факта (имена, даты, места, события). "
            "Пиши от первого лица, только факты из диалога, без домыслов."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Название истории, 3-5 слов о главном событии",
                },
                "text": {
                    "type": "string",
                    "description": "Текст истории от первого лица. Только факты из диалога.",
                },
            },
            "required": ["title", "text"],
        },
    },
]


def build_realtime_instructions(session) -> str:
    """Собрать system instructions для Realtime API сессии.

    Args:
        session: InterviewSession с контекстом интервью
    """
    parts = [INTERVIEW_SYSTEM_PROMPT]

    # Имя собеседника
    if session.relative_name:
        parts.append(f"\n═══ СОБЕСЕДНИК ═══\nИмя: {session.relative_name}")

    # Уже освещённые темы
    if session.covered_topics:
        topics = ", ".join(session.covered_topics)
        parts.append(
            f"\n═══ УЖЕ ОБСУЖДЁННЫЕ ТЕМЫ ═══\n{topics}\n"
            "Не повторяй эти темы, переходи к новым."
        )

    # Контекст историй родственников
    if session.related_stories_context:
        ctx_lines = []
        for rel in session.related_stories_context:
            name = rel.get("name", "Неизвестный")
            relationship = rel.get("relationship", "")
            stories = rel.get("stories", [])
            if stories:
                previews = "; ".join(
                    s.get("preview", s.get("title", ""))[:100]
                    for s in stories[:3]
                )
                ctx_lines.append(f"- {name} ({relationship}): {previews}")
        if ctx_lines:
            parts.append(
                "\n═══ КОНТЕКСТ: ИСТОРИИ РОДСТВЕННИКОВ ═══\n"
                + "\n".join(ctx_lines)
                + "\nИспользуй эту информацию чтобы задавать более точные вопросы."
            )

    # Уже известные родственники
    if session.known_relatives:
        known = ", ".join(session.known_relatives)
        parts.append(
            f"\n═══ ИЗВЕСТНЫЕ РОДСТВЕННИКИ ═══\n{known}\n"
            "НЕ вызывай report_detected_relative для этих людей."
        )

    # Realtime-специфичные инструкции
    parts.append("""
═══ ПРАВИЛА REALTIME РЕЖИМА ═══
- Отвечай 2-4 предложения. Короткие ответы = естественный разговор.
- После каждого ответа собеседника ОБЯЗАТЕЛЬНО вызови save_interview_exchange.
- Говори на русском языке, тёплым и дружелюбным тоном.
- Если собеседник упоминает нового родственника по имени — вызови report_detected_relative.
- Когда собрано 3+ конкретных факта по одной теме — вызови create_story_summary.
- НЕ объявляй что вызываешь функции, просто делай это.""")

    return "\n".join(parts)


async def handle_tool_call(
    tool_name: str,
    arguments: dict,
    session,
    backend_api,
) -> tuple[str, dict | None]:
    """Обработать вызов функции от Realtime API.

    Returns:
        (result_text, browser_event) — текст результата для AI и event для отправки в браузер
    """
    try:
        if tool_name == "save_interview_exchange":
            ai_question = arguments.get("ai_question", "")
            user_answer = arguments.get("user_answer", "")

            # Сохраняем в БД
            saved = await backend_api.save_interview_message_pair(
                session.relative_id, user_answer, ai_question
            )

            # Обновляем сессию
            session.question_count += 1
            session.touch()

            if saved:
                logger.info(
                    f"Realtime: сохранена пара Q/A для relative_id={session.relative_id}, "
                    f"question_count={session.question_count}"
                )
            else:
                logger.warning(f"Realtime: не удалось сохранить Q/A для relative_id={session.relative_id}")

            # Уведомление в браузер о счётчике вопросов
            browser_event = {
                "type": "question_count",
                "count": session.question_count,
                "can_create_story": session.can_create_story,
            }
            return "Сохранено.", browser_event

        elif tool_name == "report_detected_relative":
            name = arguments.get("name", "")
            probable_role = arguments.get("probable_role", "other")
            context = arguments.get("context", "")

            # Проверяем, не дубликат ли
            if name.lower() in [n.lower() for n in session.known_relatives]:
                return "Этот родственник уже известен.", None

            session.pending_relative = {
                "found": True,
                "name": name,
                "probable_role": probable_role,
                "context": context,
            }

            browser_event = {
                "type": "relative_detected",
                "name": name,
                "probable_role": probable_role,
                "context": context,
            }
            return f"Родственник {name} отмечен.", browser_event

        elif tool_name == "create_story_summary":
            title = arguments.get("title", "")
            text = arguments.get("text", "")

            if not title or not text:
                return "Ошибка: пустой заголовок или текст.", None

            session.pending_story = {"title": title, "text": text}

            browser_event = {
                "type": "story_preview",
                "title": title,
                "text": text,
            }
            return "История создана и отправлена пользователю для подтверждения.", browser_event

        else:
            logger.warning(f"Realtime: неизвестный tool call: {tool_name}")
            return f"Неизвестная функция: {tool_name}", None

    except Exception as e:
        logger.error(f"Realtime tool call error ({tool_name}): {e}", exc_info=True)
        return f"Ошибка выполнения: {e}", None
