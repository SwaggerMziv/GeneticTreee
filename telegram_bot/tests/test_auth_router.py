"""Тесты auth роутера — /webapp/api/auth endpoints."""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode
from unittest.mock import patch

import pytest

from tests.conftest import make_jwt_token


def build_valid_init_data(bot_token: str, user_data: dict = None) -> str:
    """Собрать валидный initData с HMAC подписью."""
    if user_data is None:
        user_data = {"id": 12345, "first_name": "Test", "last_name": "User"}

    params = {
        "user": json.dumps(user_data),
        "auth_date": str(int(time.time())),
        "query_id": "test-query-id",
    }

    # Сортируем и собираем data-check-string
    data_check_parts = [f"{k}={v}" for k, v in sorted(params.items())]
    data_check_string = "\n".join(data_check_parts)

    # HMAC-SHA256
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    params["hash"] = calculated_hash
    return urlencode(params)


@pytest.mark.integration
class TestAuthEndpoint:
    async def test_valid_init_data(self, client, mock_backend_api):
        """Успешная авторизация с валидным initData."""
        bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        init_data = build_valid_init_data(bot_token)

        r = await client.post("/webapp/api/auth", json={"init_data": init_data})
        assert r.status_code == 200

        data = r.json()
        assert "token" in data
        assert data["relative_id"] == 1
        assert data["telegram_user_id"] == 12345

    async def test_invalid_init_data(self, client, mock_backend_api):
        """Невалидный initData — подпись не совпадает."""
        r = await client.post("/webapp/api/auth", json={"init_data": "invalid_data_string"})
        assert r.status_code == 401

    async def test_empty_init_data(self, client, mock_backend_api):
        """Пустой initData."""
        r = await client.post("/webapp/api/auth", json={"init_data": ""})
        assert r.status_code == 401

    async def test_no_user_in_backend(self, client, mock_backend_api):
        """Родственник не найден в бэкенде."""
        mock_backend_api.get_relative_by_telegram_id.return_value = None
        bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        init_data = build_valid_init_data(bot_token)

        r = await client.post("/webapp/api/auth", json={"init_data": init_data})
        assert r.status_code == 401

    async def test_expired_init_data(self, client, mock_backend_api):
        """initData старше 24 часов — отклоняется."""
        bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        user_data = {"id": 12345, "first_name": "Test", "last_name": "User"}

        params = {
            "user": json.dumps(user_data),
            "auth_date": str(int(time.time()) - 90000),  # 25 часов назад
            "query_id": "test-query-id",
        }
        data_check_parts = [f"{k}={v}" for k, v in sorted(params.items())]
        data_check_string = "\n".join(data_check_parts)
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        params["hash"] = calculated_hash

        r = await client.post("/webapp/api/auth", json={"init_data": urlencode(params)})
        assert r.status_code == 401

    async def test_response_structure(self, client, mock_backend_api):
        """Проверяем структуру ответа AuthResponse."""
        bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        init_data = build_valid_init_data(bot_token)

        r = await client.post("/webapp/api/auth", json={"init_data": init_data})
        assert r.status_code == 200

        data = r.json()
        assert "token" in data
        assert "relative_id" in data
        assert "telegram_user_id" in data
        assert "first_name" in data
        assert "last_name" in data
        assert "relative_name" in data


@pytest.mark.integration
class TestAuthByTelegramId:
    async def test_success(self, client, mock_backend_api):
        """Успешная авторизация по telegram_user_id."""
        r = await client.post("/webapp/api/auth/by-telegram-id", json={"telegram_user_id": 12345})
        assert r.status_code == 200

        data = r.json()
        assert "token" in data
        assert data["relative_id"] == 1

    async def test_not_found(self, client, mock_backend_api):
        """Родственник не найден."""
        mock_backend_api.get_relative_by_telegram_id.return_value = None

        r = await client.post("/webapp/api/auth/by-telegram-id", json={"telegram_user_id": 99999})
        assert r.status_code == 401

    async def test_no_relative_id_in_response(self, client, mock_backend_api):
        """Бэкенд вернул данные без id."""
        mock_backend_api.get_relative_by_telegram_id.return_value = {
            "first_name": "Test", "last_name": "User",
        }

        r = await client.post("/webapp/api/auth/by-telegram-id", json={"telegram_user_id": 12345})
        assert r.status_code == 401


@pytest.mark.integration
class TestAuthHealth:
    async def test_health_check(self, client, mock_backend_api):
        """Health endpoint возвращает конфигурацию."""
        r = await client.get("/webapp/api/auth/health")
        assert r.status_code == 200

        data = r.json()
        assert "bot_token_configured" in data
        assert "backend_url" in data
        assert data["bot_token_configured"] is True
