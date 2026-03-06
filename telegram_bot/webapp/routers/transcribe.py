"""Voice transcription endpoint."""
import logging
import tempfile
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from services.ai import ai_service
from webapp.config import webapp_config
from webapp.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Transcribe"])

OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"


async def transcribe_voice_openai(audio_bytes: bytes, filename: str) -> str | None:
    """Транскрибировать аудио через OpenAI Whisper API."""
    api_key = webapp_config.OPENAI_API_KEY
    if not api_key:
        logger.warning("OPENAI_API_KEY не задан, OpenAI Whisper API недоступен")
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_WHISPER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (filename, audio_bytes)},
                data={"model": "whisper-1", "language": "ru"},
            )

        if response.status_code == 200:
            result = response.json()
            return result.get("text", "").strip() or None

        logger.warning(f"OpenAI Whisper API error: {response.status_code} {response.text[:200]}")
        return None
    except httpx.HTTPError as e:
        logger.warning(f"OpenAI Whisper API request error: {e}")
        return None


@router.post("/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Транскрибировать голосовое сообщение.

    WHISPER_MODE=api  → OpenAI Whisper API (с fallback на local)
    WHISPER_MODE=local → faster-whisper (локально)
    """
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Ожидается аудио-файл")

    # Определяем расширение
    ext_map = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
    }
    ext = ext_map.get(file.content_type, ".ogg")
    content = await file.read()

    # Попробовать OpenAI API если включён
    if webapp_config.WHISPER_MODE == "api":
        text = await transcribe_voice_openai(content, f"voice{ext}")
        if text:
            return {"text": text, "success": True}
        logger.info("OpenAI Whisper API не сработал, fallback на локальный whisper")

    # Fallback: локальный faster-whisper
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = await ai_service.transcribe_voice(tmp_path)
        if not text:
            return {"text": "", "success": False}
        return {"text": text, "success": True}
    finally:
        try:
            Path(tmp_path).unlink()
        except Exception:
            pass
