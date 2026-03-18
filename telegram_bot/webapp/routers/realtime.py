"""OpenAI Realtime API WebSocket relay endpoint."""
import asyncio
import base64
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.api import backend_api
from webapp.auth import decode_jwt_token
from webapp.config import webapp_config
from webapp.interview_session import InterviewSession, session_manager
from webapp.services.realtime_tools import (
    REALTIME_TOOLS,
    build_realtime_instructions,
    handle_tool_call,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Realtime"])

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model={model}"

# Concurrent connection tracking: max 1 WS per relative_id
_active_connections: dict[int, WebSocket] = {}


async def _send_json(ws: WebSocket, data: dict):
    """Безопасная отправка JSON в browser WS."""
    try:
        await ws.send_json(data)
    except Exception:
        pass


async def _authenticate(ws: WebSocket) -> dict | None:
    """Извлечь и проверить JWT из query params."""
    token = ws.query_params.get("token")
    if not token:
        await _send_json(ws, {"type": "error", "content": "Отсутствует токен авторизации"})
        return None

    payload = decode_jwt_token(token)
    if not payload:
        await _send_json(ws, {"type": "error", "content": "Невалидный или истёкший токен"})
        return None

    return payload


async def _init_session(
    relative_id: int, telegram_user_id: int
) -> InterviewSession:
    """Получить или создать InterviewSession с контекстом из БД."""
    existing = session_manager.get(relative_id)
    if existing and existing.messages:
        return existing

    # Загружаем данные из бэкенда
    messages_data = await backend_api.get_interview_messages(relative_id)
    relative_info = await backend_api.get_relative_by_telegram_id(telegram_user_id)
    related_stories = await backend_api.get_related_stories(relative_id)

    relative_name = ""
    if relative_info:
        relative_name = (
            f"{relative_info.get('first_name', '')} {relative_info.get('last_name', '')}".strip()
        )

    session = InterviewSession.from_history(
        relative_id=relative_id,
        relative_name=relative_name,
        messages_data=messages_data,
        related_stories_context=related_stories,
    )
    session_manager._sessions[relative_id] = session
    return session


async def _connect_openai(model: str) -> object:
    """Открыть WebSocket к OpenAI Realtime API.

    Используем websockets library для клиентского WS.
    """
    import websockets

    url = OPENAI_REALTIME_URL.format(model=model)
    headers = {
        "Authorization": f"Bearer {webapp_config.OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }
    ws = await websockets.connect(
        url,
        additional_headers=headers,
        max_size=10 * 1024 * 1024,  # 10MB — audio chunks can be large
        ping_interval=20,
        ping_timeout=10,
    )
    return ws


async def _configure_session(openai_ws, session: InterviewSession):
    """Отправить session.update с instructions, tools, voice, VAD config."""
    instructions = build_realtime_instructions(session)

    session_config = {
        "type": "session.update",
        "session": {
            "modalities": ["text", "audio"],
            "instructions": instructions,
            "voice": webapp_config.OPENAI_REALTIME_VOICE,
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            "input_audio_transcription": {"model": "gpt-4o-transcribe"},
            "turn_detection": {
                "type": "semantic_vad",
                "eagerness": "medium",
                "create_response": True,
                "interrupt_response": True,
            },
            "tools": REALTIME_TOOLS,
            "tool_choice": "auto",
            "temperature": 0.6,
            "max_response_output_tokens": 500,
        },
    }
    await openai_ws.send(json.dumps(session_config))
    logger.info(f"Realtime session configured for relative_id={session.relative_id}")


async def _request_first_response(openai_ws, session: InterviewSession):
    """Попросить AI задать первый вопрос (или продолжить по контексту)."""
    if session.messages:
        # Есть история — создаём контекст для продолжения
        # Отправляем последние сообщения как context
        last_messages = session.messages[-6:]  # Последние 3 пары
        context_text = "\n".join(
            f"{'Ты' if m['role'] == 'assistant' else 'Собеседник'}: {m['content']}"
            for m in last_messages
        )
        item = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            f"[КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА]\n{context_text}\n\n"
                            "[ИНСТРУКЦИЯ] Продолжи интервью — задай следующий вопрос, "
                            "учитывая контекст. Не повторяй предыдущие вопросы."
                        ),
                    }
                ],
            },
        }
        await openai_ws.send(json.dumps(item))
    else:
        # Новое интервью — AI начинает
        item = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "[ИНСТРУКЦИЯ] Начни интервью — представься кратко и задай "
                            "первый тёплый вопрос о семье собеседника. 2-3 предложения."
                        ),
                    }
                ],
            },
        }
        await openai_ws.send(json.dumps(item))

    # Запросить ответ
    await openai_ws.send(json.dumps({"type": "response.create"}))


async def _relay_browser_to_openai(
    browser_ws: WebSocket,
    openai_ws,
    session: InterviewSession,
):
    """Пересылать сообщения от браузера к OpenAI."""
    try:
        while True:
            raw = await browser_ws.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "audio":
                # PCM16 audio chunk → OpenAI
                audio_data = msg.get("data", "")
                if audio_data:
                    await openai_ws.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": audio_data,
                    }))

            elif msg_type == "text":
                # Текстовый ввод → создать message item + запросить ответ
                text = msg.get("text", "").strip()
                if text:
                    await openai_ws.send(json.dumps({
                        "type": "conversation.item.create",
                        "item": {
                            "type": "message",
                            "role": "user",
                            "content": [{"type": "input_text", "text": text}],
                        },
                    }))
                    await openai_ws.send(json.dumps({"type": "response.create"}))

            elif msg_type == "control":
                action = msg.get("action")
                if action == "interrupt":
                    await openai_ws.send(json.dumps({"type": "response.cancel"}))

            elif msg_type == "story_action":
                # Story actions обрабатываются локально, не пересылаются в OpenAI
                pass

            session.touch()

    except WebSocketDisconnect:
        logger.info(f"Browser WS disconnected for relative_id={session.relative_id}")
    except Exception as e:
        logger.error(f"Browser→OpenAI relay error: {e}", exc_info=True)


async def _relay_openai_to_browser(
    browser_ws: WebSocket,
    openai_ws,
    session: InterviewSession,
):
    """Пересылать сообщения от OpenAI к браузеру."""
    import websockets

    try:
        async for raw_msg in openai_ws:
            event = json.loads(raw_msg)
            event_type = event.get("type", "")

            if event_type == "response.audio.delta":
                # Audio chunk → browser
                audio = event.get("delta", "")
                if audio:
                    await _send_json(browser_ws, {
                        "type": "audio",
                        "data": audio,
                    })

            elif event_type == "response.audio_transcript.delta":
                # AI transcript streaming
                delta = event.get("delta", "")
                if delta:
                    await _send_json(browser_ws, {
                        "type": "ai_transcript",
                        "text": delta,
                        "final": False,
                    })

            elif event_type == "response.audio_transcript.done":
                # AI transcript complete
                transcript = event.get("transcript", "")
                await _send_json(browser_ws, {
                    "type": "ai_transcript",
                    "text": transcript,
                    "final": True,
                })

            elif event_type == "conversation.item.input_audio_transcription.completed":
                # User speech transcription
                transcript = event.get("transcript", "")
                if transcript:
                    await _send_json(browser_ws, {
                        "type": "user_transcript",
                        "text": transcript,
                        "final": True,
                    })

            elif event_type == "input_audio_buffer.speech_started":
                await _send_json(browser_ws, {
                    "type": "status",
                    "phase": "listening",
                })

            elif event_type == "response.created":
                await _send_json(browser_ws, {
                    "type": "status",
                    "phase": "speaking",
                })

            elif event_type == "response.done":
                await _send_json(browser_ws, {
                    "type": "status",
                    "phase": "idle",
                })
                session.touch()

            elif event_type == "response.function_call_arguments.done":
                # Function call complete → execute handler
                call_id = event.get("call_id", "")
                fn_name = event.get("name", "")
                args_str = event.get("arguments", "{}")

                try:
                    arguments = json.loads(args_str)
                except json.JSONDecodeError:
                    arguments = {}

                logger.info(f"Realtime function call: {fn_name}({list(arguments.keys())})")

                # Execute tool
                result_text, browser_event = await handle_tool_call(
                    fn_name, arguments, session, backend_api
                )

                # Send result back to OpenAI
                await openai_ws.send(json.dumps({
                    "type": "conversation.item.create",
                    "item": {
                        "type": "function_call_output",
                        "call_id": call_id,
                        "output": result_text,
                    },
                }))

                # Send browser event if any
                if browser_event:
                    await _send_json(browser_ws, browser_event)

                # Request next AI response after function call
                await openai_ws.send(json.dumps({"type": "response.create"}))

            elif event_type == "error":
                error = event.get("error", {})
                error_msg = error.get("message", "Неизвестная ошибка OpenAI")
                error_code = error.get("code", "")
                logger.error(f"OpenAI Realtime error: {error_code} - {error_msg}")

                await _send_json(browser_ws, {
                    "type": "error",
                    "content": f"Ошибка AI: {error_msg}",
                })

            elif event_type == "session.created":
                logger.info("OpenAI Realtime session created")

            elif event_type == "session.updated":
                logger.debug("OpenAI Realtime session updated")

    except websockets.exceptions.ConnectionClosed as e:
        logger.warning(f"OpenAI WS closed: {e}")
        await _send_json(browser_ws, {
            "type": "error",
            "content": "Соединение с AI прервано. Переподключитесь.",
        })
    except Exception as e:
        logger.error(f"OpenAI→Browser relay error: {e}", exc_info=True)
        await _send_json(browser_ws, {
            "type": "error",
            "content": "Ошибка соединения с AI.",
        })


@router.websocket("/ws/interview")
async def websocket_interview(ws: WebSocket):
    """WebSocket endpoint для real-time интервью через OpenAI Realtime API.

    Query params:
        token: JWT токен авторизации

    Протокол:
        Browser → Backend: audio chunks, text input, control commands
        Backend → Browser: audio chunks, transcripts, status, events
    """
    await ws.accept()

    # 1. Авторизация
    user = await _authenticate(ws)
    if not user:
        await ws.close(code=4001, reason="Unauthorized")
        return

    relative_id = user["relative_id"]
    telegram_user_id = user["telegram_user_id"]

    # 2. Закрыть предыдущее соединение если есть
    prev_ws = _active_connections.get(relative_id)
    if prev_ws:
        try:
            await _send_json(prev_ws, {
                "type": "error",
                "content": "Открыто новое соединение",
            })
            await prev_ws.close(code=4002, reason="Replaced by new connection")
        except Exception:
            pass
    _active_connections[relative_id] = ws

    # 3. Проверить квоту
    quota = await backend_api.check_quota(telegram_user_id, "telegram_sessions")
    if not quota.get("allowed", True):
        await _send_json(ws, {
            "type": "error",
            "content": quota.get("message", "Исчерпан лимит. Обновите подписку."),
        })
        await ws.close(code=4003, reason="Quota exceeded")
        _active_connections.pop(relative_id, None)
        return

    # 4. Инициализировать сессию
    session = await _init_session(relative_id, telegram_user_id)
    session.realtime_connected = True

    openai_ws = None
    try:
        # 5. Подключиться к OpenAI Realtime API
        if not webapp_config.OPENAI_API_KEY:
            await _send_json(ws, {
                "type": "error",
                "content": "API ключ не настроен. Обратитесь к администратору.",
            })
            await ws.close(code=4004, reason="No API key")
            return

        openai_ws = await _connect_openai(webapp_config.OPENAI_REALTIME_MODEL)

        # 6. Сконфигурировать сессию
        await _configure_session(openai_ws, session)

        # 7. Сообщить браузеру об успешном подключении
        await _send_json(ws, {
            "type": "connected",
            "session_restored": len(session.messages) > 0,
        })

        # 8. Запросить первый вопрос AI
        await _request_first_response(openai_ws, session)

        # 9. Запустить два relay task-а параллельно
        browser_to_openai = asyncio.create_task(
            _relay_browser_to_openai(ws, openai_ws, session)
        )
        openai_to_browser = asyncio.create_task(
            _relay_openai_to_browser(ws, openai_ws, session)
        )

        # Ждём пока один из них завершится
        done, pending = await asyncio.wait(
            [browser_to_openai, openai_to_browser],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Отменяем оставшийся
        for task in pending:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    except Exception as e:
        logger.error(f"Realtime WS error: {e}", exc_info=True)
        await _send_json(ws, {
            "type": "error",
            "content": "Не удалось подключиться к AI. Попробуйте позже.",
        })

    finally:
        # Cleanup
        session.realtime_connected = False
        _active_connections.pop(relative_id, None)

        if openai_ws:
            try:
                await openai_ws.close()
            except Exception:
                pass

        try:
            await ws.close()
        except Exception:
            pass

        logger.info(f"Realtime session closed for relative_id={relative_id}")
