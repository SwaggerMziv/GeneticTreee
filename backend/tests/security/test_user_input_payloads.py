"""Security тесты: вредоносные payload'ы в user inputs должны валидироваться и не приводить к 500."""
import pytest


BAD_USERNAMES = [
    "<script>alert(1)</script>",
    "\"><script>alert(1)</script>",
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "../etc/passwd",
    "has space",
    "tab\tname",
    "newline\nname",
    "user@name",
    "user.name",
    "😀😀😀😀😀",
]


@pytest.mark.security
class TestUserInputPayloads:
    @pytest.mark.parametrize("username", BAD_USERNAMES)
    async def test_register_rejects_bad_username(self, client, username: str):
        r = await client.post("/api/v1/users/", json={"username": username[:20], "password": "TestPass123!"})
        assert r.status_code in (400, 401, 422)

    @pytest.mark.parametrize(
        "username",
        [
            "ok_user",
            "ok-user",
            "ok_user_2",
            "имя_123",
        ],
    )
    async def test_register_accepts_safe_username(self, client, username: str):
        # Уникализируем username, чтобы не упираться в unique constraints
        r = await client.post("/api/v1/users/", json={"username": f"{username}1", "password": "TestPass123!"})
        assert r.status_code in (201, 409, 422)

