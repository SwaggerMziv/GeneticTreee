"""Тесты settings роутера — /webapp/api/settings endpoints."""
import pytest


@pytest.mark.integration
class TestGetSettings:
    async def test_get_default_settings(self, client, auth_headers, mock_user_storage):
        """Настройки по умолчанию для нового пользователя."""
        mock_user_storage.get_user.return_value = None

        r = await client.get("/webapp/api/settings", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert data["broadcast_enabled"] is True
        assert data["name"] == ""
        assert data["added_at"] is None

    async def test_get_existing_settings(self, client, auth_headers, mock_user_storage):
        """Настройки существующего пользователя."""
        mock_user_storage.get_user.return_value = {
            "enabled_broadcast": False,
            "name": "Тестов Тест",
            "added_at": "2024-01-01T00:00:00",
        }

        r = await client.get("/webapp/api/settings", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert data["broadcast_enabled"] is False
        assert data["name"] == "Тестов Тест"
        assert data["added_at"] == "2024-01-01T00:00:00"

    async def test_get_settings_no_auth(self, client, mock_user_storage):
        """Без авторизации."""
        r = await client.get("/webapp/api/settings")
        assert r.status_code in (401, 403)


@pytest.mark.integration
class TestUpdateSettings:
    async def test_update_broadcast(self, client, auth_headers, mock_user_storage):
        """Обновление настройки broadcast."""
        r = await client.put(
            "/webapp/api/settings",
            headers=auth_headers,
            json={"broadcast_enabled": False},
        )
        assert r.status_code == 200

        data = r.json()
        assert data["success"] is True
        assert data["broadcast_enabled"] is False

    async def test_update_no_auth(self, client, mock_user_storage):
        """Без авторизации."""
        r = await client.put(
            "/webapp/api/settings",
            json={"broadcast_enabled": False},
        )
        assert r.status_code in (401, 403)
