"""Security тесты: rate limiting."""
import pytest


@pytest.mark.security
class TestRateLimiting:
    async def test_login_rate_limit(self, client):
        """10/minute limit на login."""
        headers = {"X-Forwarded-For": "203.0.113.10"}
        for i in range(11):
            r = await client.post("/api/v1/auth/login", json={
                "username": f"user{i}", "email": None, "password": "test"
            }, headers=headers)
        assert r.status_code == 429

    async def test_register_rate_limit(self, client):
        """10/minute limit на register."""
        headers = {"X-Forwarded-For": "203.0.113.11"}
        for i in range(11):
            r = await client.post("/api/v1/users/", json={
                "username": f"ratelimit{i}", "password": "TestPass123!"
            }, headers=headers)
        assert r.status_code == 429

    async def test_single_request_not_limited(self, client):
        """Один запрос не должен быть заблокирован."""
        r = await client.post("/api/v1/auth/login", json={
            "username": "single", "email": None, "password": "test"
        })
        assert r.status_code != 429
