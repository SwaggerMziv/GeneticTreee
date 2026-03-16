"""Unit тесты для JWT токенов и Telegram верификации."""
import os
import hashlib
import hmac
import pytest

from src.auth.security import (
    create_access_token_for_user,
    create_refresh_token_for_user,
    revoke_token,
    REVOKED_TOKENS,
    verify_telegram_auth,
    security,
)


@pytest.mark.unit
class TestJWTTokens:
    async def test_create_access_token(self):
        token = create_access_token_for_user(user_id=1)
        assert isinstance(token, str)
        assert len(token) > 0

    async def test_create_refresh_token(self):
        token = create_refresh_token_for_user(user_id=1)
        assert isinstance(token, str)
        assert len(token) > 0

    async def test_access_and_refresh_different(self):
        access = create_access_token_for_user(user_id=1)
        refresh = create_refresh_token_for_user(user_id=1)
        assert access != refresh

    async def test_token_payload_contains_sub(self):
        token = create_access_token_for_user(user_id=42)
        decoded = security._decode_token(token)
        assert decoded.sub == "42"

    async def test_revoke_token(self):
        token = create_access_token_for_user(user_id=1)
        revoke_token(token)
        assert token in REVOKED_TOKENS
        REVOKED_TOKENS.discard(token)

    async def test_unrevoked_token_not_in_blocklist(self):
        token = create_access_token_for_user(user_id=999)
        assert token not in REVOKED_TOKENS


@pytest.mark.unit
class TestTelegramAuth:
    BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ")

    def _compute_hash(self, data: dict) -> str:
        data_check = "\n".join(
            f"{k}={v}" for k, v in sorted(data.items()) if v is not None
        )
        secret = hashlib.sha256(self.BOT_TOKEN.encode()).digest()
        return hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()

    async def test_telegram_valid_hash(self):
        data = {"id": 12345, "first_name": "Test", "auth_date": 1234567890}
        data["hash"] = self._compute_hash(data)
        assert verify_telegram_auth(data.copy(), self.BOT_TOKEN) is True

    async def test_telegram_invalid_hash(self):
        data = {"id": 12345, "first_name": "Test", "auth_date": 1234567890, "hash": "badhash"}
        assert verify_telegram_auth(data.copy(), self.BOT_TOKEN) is False

    async def test_telegram_missing_hash(self):
        data = {"id": 12345, "first_name": "Test", "auth_date": 1234567890}
        assert verify_telegram_auth(data.copy(), self.BOT_TOKEN) is False

    async def test_telegram_none_bot_token(self):
        data = {"id": 12345, "first_name": "Test", "auth_date": 1234567890, "hash": "abc"}
        assert verify_telegram_auth(data.copy(), None) is False

    async def test_telegram_none_values_excluded(self):
        data = {"id": 12345, "first_name": "Test", "last_name": None, "auth_date": 1234567890}
        valid_hash = self._compute_hash(data)
        data["hash"] = valid_hash
        assert verify_telegram_auth(data.copy(), self.BOT_TOKEN) is True

    async def test_telegram_multiple_fields(self):
        data = {
            "id": 12345,
            "first_name": "Test",
            "last_name": "User",
            "username": "testuser",
            "auth_date": 1234567890,
        }
        data["hash"] = self._compute_hash(data)
        assert verify_telegram_auth(data.copy(), self.BOT_TOKEN) is True

    async def test_telegram_data_mutation(self):
        """verify_telegram_auth мутирует dict, удаляя 'hash'."""
        data = {"id": 12345, "first_name": "Test", "auth_date": 1234567890}
        data["hash"] = self._compute_hash(data)
        original = data.copy()
        verify_telegram_auth(data, self.BOT_TOKEN)
        assert "hash" not in data
        assert "hash" in original
