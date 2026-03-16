"""Тесты TTS роутера — /webapp/api/tts endpoint."""
from unittest.mock import patch, AsyncMock

import pytest


@pytest.mark.integration
class TestTTS:
    async def test_success_openrouter(self, client, auth_headers, mock_backend_api):
        """Успешный TTS через OpenRouter."""
        with patch(
            "webapp.routers.tts._tts_via_openrouter_audio",
            new_callable=AsyncMock,
            return_value=(b"fake-wav-audio", "audio/wav"),
        ):
            r = await client.post(
                "/webapp/api/tts",
                headers=auth_headers,
                json={"text": "Привет, мир!"},
            )
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("audio/wav")

    async def test_fallback_openai(self, client, auth_headers, mock_backend_api):
        """Fallback на OpenAI TTS."""
        with patch(
            "webapp.routers.tts._tts_via_openrouter_audio",
            new_callable=AsyncMock,
            return_value=(None, ""),
        ), patch(
            "webapp.routers.tts._tts_via_openai_speech",
            new_callable=AsyncMock,
            return_value=b"fake-mp3-audio",
        ):
            r = await client.post(
                "/webapp/api/tts",
                headers=auth_headers,
                json={"text": "Привет!"},
            )
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("audio/mpeg")

    async def test_empty_text(self, client, auth_headers, mock_backend_api):
        """Пустой текст — 400."""
        r = await client.post(
            "/webapp/api/tts",
            headers=auth_headers,
            json={"text": "   "},
        )
        assert r.status_code == 400

    async def test_all_unavailable(self, client, auth_headers, mock_backend_api):
        """Все TTS методы недоступны — 502."""
        with patch(
            "webapp.routers.tts._tts_via_openrouter_audio",
            new_callable=AsyncMock,
            return_value=(None, ""),
        ), patch(
            "webapp.routers.tts._tts_via_openai_speech",
            new_callable=AsyncMock,
            return_value=None,
        ):
            r = await client.post(
                "/webapp/api/tts",
                headers=auth_headers,
                json={"text": "Привет!"},
            )
        assert r.status_code == 502

    async def test_no_auth(self, client, mock_backend_api):
        """Без авторизации."""
        r = await client.post(
            "/webapp/api/tts",
            json={"text": "Привет!"},
        )
        assert r.status_code in (401, 403)

    async def test_max_text_length(self, client, auth_headers, mock_backend_api):
        """Текст длиннее MAX_TEXT_LENGTH — 422."""
        r = await client.post(
            "/webapp/api/tts",
            headers=auth_headers,
            json={"text": "A" * 2001},
        )
        assert r.status_code == 422
