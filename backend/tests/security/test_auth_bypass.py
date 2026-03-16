"""Security тесты: обход аутентификации."""
import os
import time
import jwt
import pytest


JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "test-secret-key-for-jwt-tokens-32chars!")


@pytest.mark.security
class TestAuthBypass:
    PROTECTED_ENDPOINTS = [
        ("GET", "/api/v1/auth/me"),
        ("DELETE", "/api/v1/auth/logout"),
        ("GET", "/api/v1/users/"),
        ("GET", "/api/v1/ai/chat-history"),
        ("GET", "/api/v1/subscription/my"),
        ("GET", "/api/v1/subscription/usage"),
    ]

    @pytest.mark.parametrize("method,url", PROTECTED_ENDPOINTS)
    async def test_no_token(self, client, method, url):
        if method == "GET":
            r = await client.get(url)
        else:
            r = await client.delete(url)
        assert r.status_code == 401

    async def test_expired_jwt(self, client):
        payload = {"sub": "1", "type": "access", "exp": int(time.time()) - 3600}
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401

    async def test_malformed_jwt(self, client):
        r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt"})
        assert r.status_code == 401

    async def test_wrong_secret(self, client):
        payload = {"sub": "1", "type": "access", "exp": int(time.time()) + 3600}
        token = jwt.encode(payload, "completely-wrong-secret", algorithm="HS256")
        r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401

    async def test_empty_bearer(self, client):
        r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer "})
        assert r.status_code == 401

    async def test_no_bearer_prefix(self, client):
        r = await client.get("/api/v1/auth/me", headers={"Authorization": "Token abc"})
        assert r.status_code == 401

    async def test_revoked_token(self, client, test_user, auth_headers):
        # Logout revokes the token
        r = await client.delete("/api/v1/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        # Reuse same token
        r2 = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert r2.status_code in (401, 403)

    async def test_deactivated_user_token(self, client, test_session, superuser_headers):
        from tests.helpers import create_test_user, get_auth_headers
        user = await create_test_user(test_session, username="deactme", is_active=True)
        headers = get_auth_headers(user.id)
        # Деактивируем
        await client.patch(f"/api/v1/users/{user.id}/deactivate", headers=superuser_headers)
        # Пробуем использовать
        r = await client.get("/api/v1/auth/me", headers=headers)
        assert r.status_code in (401, 403)
