"""Тесты валидации авторизации — HMAC, JWT create/decode."""
import hashlib
import hmac
import json
import time
from unittest.mock import patch
from urllib.parse import urlencode

import jwt as pyjwt
import pytest

from webapp.auth import validate_telegram_init_data, create_jwt_token, decode_jwt_token
from webapp.config import webapp_config


BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"


def _make_init_data(bot_token: str, user_data: dict, auth_date: int = None) -> str:
    """Собрать initData с HMAC подписью."""
    params = {
        "user": json.dumps(user_data),
        "auth_date": str(auth_date or int(time.time())),
    }
    data_check_parts = [f"{k}={v}" for k, v in sorted(params.items())]
    data_check_string = "\n".join(data_check_parts)

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calc_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    params["hash"] = calc_hash
    return urlencode(params)


@pytest.mark.unit
class TestValidateTelegramInitData:
    def test_valid_hmac(self):
        """Валидная HMAC подпись."""
        user_data = {"id": 12345, "first_name": "Test"}
        init_data = _make_init_data(BOT_TOKEN, user_data)

        result = validate_telegram_init_data(init_data)
        assert result is not None
        assert result["id"] == 12345

    def test_invalid_hmac(self):
        """Невалидная HMAC подпись."""
        user_data = {"id": 12345, "first_name": "Test"}
        init_data = _make_init_data(BOT_TOKEN, user_data)
        # Портим hash
        init_data = init_data.replace("hash=", "hash=0000")

        result = validate_telegram_init_data(init_data)
        assert result is None

    def test_missing_hash(self):
        """initData без hash."""
        result = validate_telegram_init_data("user=%7B%22id%22%3A123%7D&auth_date=1234567890")
        assert result is None

    def test_expired_auth_date(self):
        """auth_date старше 24 часов."""
        user_data = {"id": 12345, "first_name": "Test"}
        expired_date = int(time.time()) - 90000
        init_data = _make_init_data(BOT_TOKEN, user_data, auth_date=expired_date)

        result = validate_telegram_init_data(init_data)
        assert result is None

    def test_no_user_field(self):
        """initData без поля user."""
        params = {"auth_date": str(int(time.time()))}
        data_check_parts = [f"{k}={v}" for k, v in sorted(params.items())]
        data_check_string = "\n".join(data_check_parts)
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calc_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        params["hash"] = calc_hash

        result = validate_telegram_init_data(urlencode(params))
        assert result is None

    def test_no_bot_token(self):
        """BOT_TOKEN пустой."""
        user_data = {"id": 12345, "first_name": "Test"}
        init_data = _make_init_data(BOT_TOKEN, user_data)

        with patch("webapp.auth.config") as mock_config:
            mock_config.BOT_TOKEN = ""
            result = validate_telegram_init_data(init_data)
        assert result is None

    def test_malformed_init_data(self):
        """Некорректный формат initData."""
        result = validate_telegram_init_data("completely-broken-data")
        assert result is None

    def test_unicode_user_data(self):
        """Unicode в данных пользователя."""
        user_data = {"id": 12345, "first_name": "Тест", "last_name": "Кириллица"}
        init_data = _make_init_data(BOT_TOKEN, user_data)

        result = validate_telegram_init_data(init_data)
        assert result is not None
        assert result["first_name"] == "Тест"


@pytest.mark.unit
class TestJWTToken:
    def test_create_token(self):
        """Создание JWT токена."""
        token = create_jwt_token(relative_id=1, telegram_user_id=12345)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_valid_token(self):
        """Декодирование валидного токена."""
        token = create_jwt_token(relative_id=42, telegram_user_id=99999)
        payload = decode_jwt_token(token)

        assert payload is not None
        assert payload["relative_id"] == 42
        assert payload["telegram_user_id"] == 99999

    def test_decode_expired_token(self):
        """Истёкший токен."""
        payload = {
            "relative_id": 1,
            "telegram_user_id": 12345,
            "exp": int(time.time()) - 3600,
            "iat": int(time.time()) - 7200,
        }
        token = pyjwt.encode(payload, webapp_config.WEBAPP_JWT_SECRET, algorithm="HS256")

        result = decode_jwt_token(token)
        assert result is None

    def test_decode_invalid_token(self):
        """Невалидный токен."""
        result = decode_jwt_token("invalid.token.here")
        assert result is None

    def test_decode_wrong_secret(self):
        """Токен с неправильным секретом."""
        payload = {
            "relative_id": 1,
            "telegram_user_id": 12345,
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        token = pyjwt.encode(payload, "wrong-secret", algorithm="HS256")

        result = decode_jwt_token(token)
        assert result is None

    def test_token_contains_required_fields(self):
        """Токен содержит все обязательные поля."""
        token = create_jwt_token(relative_id=1, telegram_user_id=12345)
        payload = decode_jwt_token(token)

        assert "relative_id" in payload
        assert "telegram_user_id" in payload
        assert "exp" in payload
        assert "iat" in payload
