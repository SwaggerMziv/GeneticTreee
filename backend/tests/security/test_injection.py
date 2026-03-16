"""Security тесты: SQL injection и XSS."""
import pytest


SQL_PAYLOADS = [
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "1; SELECT * FROM users",
]

XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '"><script>alert(1)</script>',
]


@pytest.mark.security
class TestSQLInjection:
    @pytest.mark.parametrize("payload", SQL_PAYLOADS)
    async def test_login_username(self, client, payload):
        r = await client.post("/api/v1/auth/login", json={
            "username": payload, "email": None, "password": "test"
        })
        assert r.status_code in (401, 422)

    @pytest.mark.parametrize("payload", SQL_PAYLOADS)
    async def test_search_users(self, client, auth_headers, payload):
        r = await client.get(f"/api/v1/users/search/{payload}", headers=auth_headers)
        assert r.status_code != 500

    @pytest.mark.parametrize("payload", SQL_PAYLOADS)
    async def test_search_relatives(self, client, auth_headers, test_user, payload):
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relatives/search/{payload}",
            headers=auth_headers
        )
        assert r.status_code != 500


@pytest.mark.security
class TestXSS:
    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    async def test_xss_in_username(self, client, payload):
        r = await client.post("/api/v1/users/", json={
            "username": payload[:20], "password": "TestPass123!"
        })
        if r.status_code == 201:
            assert "<script>" not in r.text

    @pytest.mark.parametrize("payload", XSS_PAYLOADS)
    async def test_xss_in_relative_name(self, client, auth_headers, test_user, seed_plans, payload):
        r = await client.post(
            f"/api/v1/family/{test_user.id}/relatives",
            headers=auth_headers,
            json={"first_name": payload[:64], "gender": "male"}
        )
        assert r.status_code != 500

    async def test_null_byte(self, client, auth_headers, test_user, seed_plans):
        r = await client.post(
            f"/api/v1/family/{test_user.id}/relatives",
            headers=auth_headers,
            json={"first_name": "Test\x00Inject", "gender": "male"}
        )
        assert r.status_code != 500

    async def test_extremely_long_string(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "a" * 10000, "password": "TestPass123!"
        })
        assert r.status_code == 422
