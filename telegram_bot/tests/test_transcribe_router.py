"""Тесты transcribe роутера — /webapp/api/transcribe endpoint."""
import io
from unittest.mock import patch, AsyncMock

import pytest


@pytest.mark.integration
class TestTranscribe:
    async def test_success_api_mode(self, client, auth_headers, mock_backend_api):
        """Успешная транскрипция через OpenAI Whisper API."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"text": "Привет, это тест"}

        with patch("webapp.routers.transcribe.transcribe_voice_openai", return_value="Привет, это тест"):
            r = await client.post(
                "/webapp/api/transcribe",
                headers=auth_headers,
                files={"file": ("voice.ogg", io.BytesIO(b"fake-audio"), "audio/ogg")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["text"] == "Привет, это тест"

    async def test_non_audio_file(self, client, auth_headers, mock_backend_api):
        """Отправка не-аудио файла — 400."""
        r = await client.post(
            "/webapp/api/transcribe",
            headers=auth_headers,
            files={"file": ("doc.pdf", io.BytesIO(b"not audio"), "application/pdf")},
        )
        assert r.status_code == 400

    async def test_no_auth(self, client, mock_backend_api):
        """Без авторизации."""
        r = await client.post(
            "/webapp/api/transcribe",
            files={"file": ("voice.ogg", io.BytesIO(b"audio"), "audio/ogg")},
        )
        assert r.status_code in (401, 403)

    async def test_fallback_to_local(self, client, auth_headers, mock_backend_api):
        """Fallback на локальный whisper при отказе API."""
        with patch("webapp.routers.transcribe.transcribe_voice_openai", return_value=None), \
             patch("services.ai.ai_service.transcribe_voice", new_callable=AsyncMock, return_value="Локальный текст"):
            r = await client.post(
                "/webapp/api/transcribe",
                headers=auth_headers,
                files={"file": ("voice.ogg", io.BytesIO(b"fake-audio"), "audio/ogg")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["text"] == "Локальный текст"

    async def test_empty_result(self, client, auth_headers, mock_backend_api):
        """Пустой результат транскрипции."""
        with patch("webapp.routers.transcribe.transcribe_voice_openai", return_value=None), \
             patch("services.ai.ai_service.transcribe_voice", new_callable=AsyncMock, return_value=None):
            r = await client.post(
                "/webapp/api/transcribe",
                headers=auth_headers,
                files={"file": ("voice.ogg", io.BytesIO(b"fake-audio"), "audio/ogg")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False
        assert data["text"] == ""

    async def test_various_audio_types(self, client, auth_headers, mock_backend_api):
        """Разные типы аудио файлов принимаются."""
        with patch("webapp.routers.transcribe.transcribe_voice_openai", return_value="text"):
            for content_type in ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg"]:
                r = await client.post(
                    "/webapp/api/transcribe",
                    headers=auth_headers,
                    files={"file": ("voice.ext", io.BytesIO(b"audio"), content_type)},
                )
                assert r.status_code == 200
