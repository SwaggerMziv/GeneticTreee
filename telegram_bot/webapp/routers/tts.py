"""TTS (Text-to-Speech) endpoint — озвучивание ответов AI."""
import base64
import json
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import config
from webapp.config import webapp_config
from webapp.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["TTS"])

MAX_TEXT_LENGTH = 2000

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech"


class TTSRequest(BaseModel):
    text: str = Field(..., max_length=MAX_TEXT_LENGTH)
    voice: str | None = None
    speed: float | None = None


async def _tts_via_openrouter_audio(
    text: str, voice: str, client: httpx.AsyncClient
) -> tuple[bytes | None, str]:
    """TTS через OpenRouter gpt-audio-mini (streaming, wav).

    OpenRouter требует stream=true для audio output.
    Формат wav поддерживается при стриминге (mp3 — нет).
    Собираем base64 WAV чанки из SSE delta.audio.data → декодируем.

    Returns:
        (audio_bytes, media_type) или (None, "")
    """
    if not config.OPENROUTER_API_KEY:
        return None, ""

    payload = {
        "model": "openai/gpt-audio-mini",
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "wav"},
        "stream": True,
        "messages": [
            {
                "role": "user",
                "content": f"Прочитай вслух следующий текст на русском языке, точно как написано, без каких-либо добавлений и комментариев:\n\n{text}",
            }
        ],
    }

    try:
        async with client.stream(
            "POST",
            OPENROUTER_CHAT_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
        ) as response:
            if response.status_code != 200:
                body = await response.aread()
                logger.warning(f"OpenRouter audio TTS: {response.status_code} {body[:200]}")
                return None, ""

            audio_chunks: list[str] = []

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                delta = (
                    chunk.get("choices", [{}])[0]
                    .get("delta", {})
                )
                # Аудио-чанки приходят в delta.audio.data (base64)
                audio_b64 = delta.get("audio", {}).get("data")
                if audio_b64:
                    audio_chunks.append(audio_b64)

            if not audio_chunks:
                logger.warning("OpenRouter audio TTS: нет audio.data чанков в стриме")
                return None, ""

            # Собираем все base64 чанки и декодируем
            full_b64 = "".join(audio_chunks)
            return base64.b64decode(full_b64), "audio/wav"

    except (httpx.HTTPError, Exception) as e:
        logger.warning(f"OpenRouter audio TTS error: {e}")
        return None, ""


async def _tts_via_openai_speech(
    text: str, voice: str, speed: float, client: httpx.AsyncClient
) -> bytes | None:
    """TTS через прямой OpenAI /v1/audio/speech API."""
    if not webapp_config.OPENAI_API_KEY:
        return None

    payload = {
        "model": webapp_config.TTS_MODEL,
        "input": text,
        "voice": voice,
        "speed": speed,
        "response_format": "mp3",
    }

    try:
        response = await client.post(
            OPENAI_TTS_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {webapp_config.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
        )

        if response.status_code == 200:
            return response.content

        logger.warning(f"OpenAI TTS: {response.status_code} {response.text[:200]}")
        return None

    except httpx.HTTPError as e:
        logger.warning(f"OpenAI TTS error: {e}")
        return None


@router.post("")
async def synthesize_speech(
    request: TTSRequest,
    user: dict = Depends(get_current_user),
):
    """Синтез речи.

    Приоритет:
    1. OpenRouter gpt-audio-mini (естественный голос, WAV streaming)
    2. OpenAI /v1/audio/speech tts-1-hd (fallback, MP3)
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст не может быть пустым")

    voice = request.voice or webapp_config.TTS_VOICE
    speed = request.speed or webapp_config.TTS_SPEED
    media_type = "audio/mpeg"

    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. OpenRouter gpt-audio-mini (естественный голос, WAV)
        audio_bytes, openrouter_media = await _tts_via_openrouter_audio(text, voice, client)
        if audio_bytes:
            media_type = openrouter_media

        # 2. Fallback: OpenAI TTS API (tts-1-hd, MP3)
        if not audio_bytes:
            audio_bytes = await _tts_via_openai_speech(text, voice, speed, client)

    if not audio_bytes:
        logger.error("TTS: все методы недоступны")
        raise HTTPException(status_code=502, detail="TTS сервис недоступен")

    return Response(
        content=audio_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache",
        },
    )
