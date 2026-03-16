"""Unit тесты для хеширования паролей."""
import pytest
from src.users.security import hash_password, verify_password


@pytest.mark.unit
class TestPasswordHashing:
    async def test_hash_returns_correct_format(self):
        result = await hash_password("TestPass123!")
        assert result.startswith("pbkdf2$sha256$310000$")
        parts = result.split("$")
        assert len(parts) == 5

    async def test_hash_salt_randomness(self):
        h1 = await hash_password("SamePassword1!")
        h2 = await hash_password("SamePassword1!")
        assert h1 != h2  # разные соли

    async def test_verify_correct_password(self):
        hashed = await hash_password("MyPassword1!")
        assert await verify_password("MyPassword1!", hashed) is True

    async def test_verify_wrong_password(self):
        hashed = await hash_password("MyPassword1!")
        assert await verify_password("WrongPassword1!", hashed) is False

    async def test_hash_unicode_password(self):
        hashed = await hash_password("пароль123")
        assert await verify_password("пароль123", hashed) is True

    async def test_hash_empty_password_raises(self):
        with pytest.raises(ValueError):
            await hash_password("")

    async def test_hash_none_password_raises(self):
        with pytest.raises((ValueError, TypeError, AttributeError)):
            await hash_password(None)

    async def test_verify_malformed_hash(self):
        assert await verify_password("test", "not$a$valid$hash") is False
        assert await verify_password("test", "") is False
        assert await verify_password("test", "random_string") is False
