"""Integration тесты для auth endpoints."""
import os
import hashlib
import hmac
import time
import pytest

from tests.helpers import create_test_user


BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ")


def _make_telegram_hash(data: dict) -> str:
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(data.items()) if v is not None)
    secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
    return hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()


@pytest.mark.integration
class TestLogin:
    async def test_login_with_username(self, client, test_user):
        r = await client.post("/api/v1/auth/login", json={
            "username": "testuser", "email": None, "password": "TestPassword1!"
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_login_wrong_password(self, client, test_user):
        r = await client.post("/api/v1/auth/login", json={
            "username": "testuser", "email": None, "password": "WrongPass1!"
        })
        assert r.status_code == 401

    async def test_login_nonexistent_user(self, client):
        r = await client.post("/api/v1/auth/login", json={
            "username": "nobody", "email": None, "password": "Test1234!"
        })
        assert r.status_code == 401

    async def test_login_no_credentials(self, client):
        r = await client.post("/api/v1/auth/login", json={
            "username": None, "email": None, "password": "Test1234!"
        })
        assert r.status_code in (400, 401)

    async def test_login_deactivated_user(self, client, test_session):
        user = await create_test_user(test_session, username="inactive", is_active=False)
        r = await client.post("/api/v1/auth/login", json={
            "username": "inactive", "email": None, "password": "TestPassword1!"
        })
        assert r.status_code == 403

    async def test_login_sets_cookies(self, client, test_user):
        r = await client.post("/api/v1/auth/login", json={
            "username": "testuser", "email": None, "password": "TestPassword1!"
        })
        assert r.status_code == 200
        cookies = r.cookies
        assert "access_token" in cookies or "access_token" in r.headers.get("set-cookie", "")


@pytest.mark.integration
class TestRefresh:
    async def test_refresh_valid_token(self, client, refresh_headers):
        r = await client.post("/api/v1/auth/refresh", headers=refresh_headers)
        assert r.status_code == 200
        assert "access_token" in r.json()

    async def test_refresh_invalid_token(self, client):
        r = await client.post("/api/v1/auth/refresh", headers={"Authorization": "Bearer invalid"})
        assert r.status_code == 401

    async def test_refresh_no_token(self, client):
        r = await client.post("/api/v1/auth/refresh")
        assert r.status_code == 401


@pytest.mark.integration
class TestMe:
    async def test_me_authenticated(self, client, auth_headers, test_user):
        r = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "testuser"
        assert data["id"] == test_user.id

    async def test_me_no_auth(self, client):
        r = await client.get("/api/v1/auth/me")
        assert r.status_code == 401

    async def test_me_sub(self, client, auth_headers, test_user):
        r = await client.get("/api/v1/auth/me/sub", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["sub"] == test_user.id


@pytest.mark.integration
class TestTelegramAuth:
    async def test_telegram_valid_data(self, client, test_session):
        data = {"id": 99999, "first_name": "TgUser", "auth_date": int(time.time())}
        data["hash"] = _make_telegram_hash(data)
        r = await client.post("/api/v1/auth/telegram", json=data)
        assert r.status_code == 200
        assert "access_token" in r.json()

    async def test_telegram_invalid_hash(self, client):
        data = {"id": 88888, "first_name": "Bad", "auth_date": int(time.time()), "hash": "badhash"}
        r = await client.post("/api/v1/auth/telegram", json=data)
        assert r.status_code == 401


@pytest.mark.integration
class TestLogout:
    async def test_logout(self, client, auth_headers):
        r = await client.delete("/api/v1/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "OK"

    async def test_logout_no_auth(self, client):
        r = await client.delete("/api/v1/auth/logout")
        assert r.status_code == 401
