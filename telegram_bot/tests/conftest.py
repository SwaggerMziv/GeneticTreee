"""Root conftest for Telegram Bot Webapp tests."""
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import jwt

# Добавляем корень telegram_bot в sys.path
BOT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BOT_ROOT not in sys.path:
    sys.path.insert(0, BOT_ROOT)

# Устанавливаем env vars до импорта модулей
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
os.environ.setdefault("BACKEND_URL", "http://localhost:8000")
os.environ.setdefault("OPENROUTER_API_KEY", "test-openrouter-key")
os.environ.setdefault("WEBAPP_JWT_SECRET", "test-jwt-secret-for-tests")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")

from httpx import ASGITransport, AsyncClient


# ── JWT helpers ──

WEBAPP_JWT_SECRET = os.environ["WEBAPP_JWT_SECRET"]


def make_jwt_token(relative_id: int = 1, telegram_user_id: int = 12345, expired: bool = False) -> str:
    """Создать JWT токен для тестов."""
    now = int(time.time())
    payload = {
        "relative_id": relative_id,
        "telegram_user_id": telegram_user_id,
        "iat": now,
        "exp": now - 3600 if expired else now + 86400,
    }
    return jwt.encode(payload, WEBAPP_JWT_SECRET, algorithm="HS256")


# ── Mock backend API ──

@pytest.fixture
def mock_backend_api():
    """Мокаем backend_api во всех модулях-потребителях."""
    mock = AsyncMock()
    mock.base_url = "http://localhost:8000"

    # Настройки по умолчанию
    mock.get_relative_by_telegram_id.return_value = {
        "id": 1, "first_name": "Тест", "last_name": "Тестов",
        "telegram_user_id": 12345,
    }
    mock.get_interview_messages.return_value = []
    mock.get_related_stories.return_value = []
    mock.get_stories.return_value = []
    mock.get_stories_count.return_value = 3
    mock.save_story.return_value = True
    mock.upload_story_media.return_value = {"url": "https://mock.s3/photo.jpg"}
    mock.create_relative_from_bot.return_value = {"relative_id": 2, "message": "ok"}
    mock.check_quota.return_value = {
        "allowed": True, "resource": "telegram_sessions", "used": 0, "limit": -1, "message": None,
    }
    mock.save_interview_message_pair.return_value = True

    # Патчим backend_api во всех роутерах и модулях, где он импортирован
    from contextlib import ExitStack
    with ExitStack() as stack:
        targets = [
            "services.api.backend_api",
            "webapp.routers.auth_router.backend_api",
            "webapp.routers.interview.backend_api",
            "webapp.routers.stories.backend_api",
            "webapp.routers.stats.backend_api",
            "webapp.routers.realtime.backend_api",
        ]
        for target in targets:
            try:
                stack.enter_context(patch(target, mock))
            except (AttributeError, ModuleNotFoundError):
                pass
        yield mock


# ── Mock user storage ──

@pytest.fixture
def mock_user_storage():
    """Мокаем user_storage во всех модулях-потребителях."""
    mock = MagicMock()
    mock.get_user.return_value = None
    mock.set_broadcast_enabled.return_value = None

    from contextlib import ExitStack
    with ExitStack() as stack:
        targets = [
            "services.storage.user_storage",
            "webapp.routers.settings.user_storage",
        ]
        for target in targets:
            try:
                stack.enter_context(patch(target, mock))
            except (AttributeError, ModuleNotFoundError):
                pass
        yield mock


# ── App & client ──

@pytest.fixture
def test_app(mock_backend_api, mock_user_storage):
    """Создать FastAPI приложение с моками."""
    from webapp.server import create_webapp
    app = create_webapp()
    return app


@pytest.fixture
async def client(test_app):
    """AsyncClient для тестирования HTTP endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as c:
        yield c


# ── Auth helpers ──

@pytest.fixture
def jwt_token():
    """Валидный JWT токен."""
    return make_jwt_token(relative_id=1, telegram_user_id=12345)


@pytest.fixture
def auth_headers(jwt_token):
    """Authorization headers с валидным JWT."""
    return {"Authorization": f"Bearer {jwt_token}"}


@pytest.fixture
def expired_token():
    """Истёкший JWT токен."""
    return make_jwt_token(expired=True)


@pytest.fixture
def expired_headers(expired_token):
    """Authorization headers с истёкшим JWT."""
    return {"Authorization": f"Bearer {expired_token}"}
