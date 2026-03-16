"""Дополнительные unit тесты для верификации Telegram auth."""
import hashlib
import hmac
import os
import pytest

from src.auth.security import verify_telegram_auth


BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ")


def _compute_hash(data: dict, token: str = BOT_TOKEN) -> str:
    data_check = "\n".join(
        f"{k}={v}" for k, v in sorted(data.items()) if v is not None
    )
    secret = hashlib.sha256(token.encode()).digest()
    return hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()


@pytest.mark.unit
class TestTelegramVerifyExtended:
    async def test_empty_dict(self):
        assert verify_telegram_auth({}, BOT_TOKEN) is False

    async def test_special_chars_in_name(self):
        data = {"id": 1, "first_name": "Тест 🎄 <b>bold</b>", "auth_date": 123}
        data["hash"] = _compute_hash(data)
        assert verify_telegram_auth(data.copy(), BOT_TOKEN) is True

    async def test_integer_values(self):
        data = {"id": 99999, "auth_date": 1700000000}
        data["hash"] = _compute_hash(data)
        assert verify_telegram_auth(data.copy(), BOT_TOKEN) is True

    async def test_all_fields(self):
        data = {
            "id": 12345,
            "first_name": "Ivan",
            "last_name": "Petrov",
            "username": "ipetrov",
            "photo_url": "https://t.me/photo.jpg",
            "auth_date": 1700000000,
        }
        data["hash"] = _compute_hash(data)
        assert verify_telegram_auth(data.copy(), BOT_TOKEN) is True

    async def test_sorted_keys_matter(self):
        """Ключи сортируются по алфавиту — порядок вставки не важен."""
        data1 = {"auth_date": 123, "first_name": "A", "id": 1}
        data2 = {"id": 1, "first_name": "A", "auth_date": 123}
        h1 = _compute_hash(data1)
        h2 = _compute_hash(data2)
        assert h1 == h2

    async def test_empty_string_bot_token(self):
        data = {"id": 1, "auth_date": 123, "hash": "abc"}
        assert verify_telegram_auth(data.copy(), "") is False

    async def test_only_hash_field(self):
        """Dict с одним hash: data_check_string пуст."""
        data = {}
        h = _compute_hash(data)
        data["hash"] = h
        assert verify_telegram_auth(data.copy(), BOT_TOKEN) is True
