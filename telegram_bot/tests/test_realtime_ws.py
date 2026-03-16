"""Тесты Realtime WebSocket — /webapp/api/ws/interview endpoint."""
import json
from unittest.mock import patch, AsyncMock, MagicMock

import pytest

from tests.conftest import make_jwt_token
from webapp.interview_session import session_manager


@pytest.fixture(autouse=True)
def _clear_sessions():
    """Очищаем сессии."""
    session_manager._sessions.clear()
    yield
    session_manager._sessions.clear()


@pytest.mark.integration
class TestRealtimeWebSocket:
    async def test_no_token(self, test_app):
        """Подключение без токена — 4001."""
        from httpx import ASGITransport, AsyncClient
        from starlette.testclient import TestClient

        client = TestClient(test_app)
        with client.websocket_connect("/webapp/api/ws/interview") as ws:
            # Должен получить error и быть закрыт
            data = ws.receive_json()
            assert data["type"] == "error"

    async def test_invalid_token(self, test_app):
        """Невалидный токен — ошибка."""
        from starlette.testclient import TestClient

        client = TestClient(test_app)
        with client.websocket_connect("/webapp/api/ws/interview?token=invalid") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"

    async def test_expired_token(self, test_app):
        """Истёкший токен — ошибка."""
        from starlette.testclient import TestClient

        token = make_jwt_token(expired=True)
        client = TestClient(test_app)
        with client.websocket_connect(f"/webapp/api/ws/interview?token={token}") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"

    async def test_quota_exceeded(self, test_app, mock_backend_api):
        """Квота исчерпана — клиент получает ошибку."""
        from starlette.testclient import TestClient

        mock_backend_api.check_quota.return_value = {
            "allowed": False,
            "resource": "ai_messages",
            "message": "Лимит исчерпан",
        }

        token = make_jwt_token()
        client = TestClient(test_app)
        with client.websocket_connect(f"/webapp/api/ws/interview?token={token}") as ws:
            data = ws.receive_json()
            assert data["type"] == "error"

    async def test_no_api_key(self, test_app, mock_backend_api):
        """Нет API ключа — клиент получает ошибку."""
        from starlette.testclient import TestClient

        token = make_jwt_token()

        with patch("webapp.routers.realtime.webapp_config") as mock_config:
            mock_config.OPENAI_API_KEY = ""
            mock_config.OPENAI_REALTIME_MODEL = "gpt-4o-realtime-preview"
            mock_config.OPENAI_REALTIME_VOICE = "sage"

            client = TestClient(test_app)
            with client.websocket_connect(f"/webapp/api/ws/interview?token={token}") as ws:
                data = ws.receive_json()
                assert data["type"] == "error"
