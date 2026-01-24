
from authx import AuthX, AuthXConfig, TokenPayload
from fastapi import Depends, HTTPException
from typing import Any, Dict
import hashlib
import hmac
from src.config import (
    settings,

)

authx_config = AuthXConfig()
authx_config.JWT_SECRET_KEY = settings.jwt_secret_key
authx_config.JWT_TOKEN_LOCATION = ["cookies", "headers"]
authx_config.JWT_ACCESS_COOKIE_NAME = "access_token"
authx_config.JWT_REFRESH_COOKIE_NAME = "refresh_token"
authx_config.JWT_ACCESS_COOKIE_PATH = "/"  # Путь для access cookie
authx_config.JWT_REFRESH_COOKIE_PATH = "/"  # Путь для refresh cookie
authx_config.JWT_COOKIE_CSRF_PROTECT = False


security = AuthX(config=authx_config)

# In-memory blocklist
REVOKED_TOKENS: set[str] = set()

@security.set_callback_token_blocklist
def is_token_revoked(token: str) -> bool:
    return token in REVOKED_TOKENS

def revoke_token(token: str) -> None:
    REVOKED_TOKENS.add(token)

def create_access_token_for_user(user_id: int, **extra: Any) -> str:
    return security.create_access_token(uid=str(user_id), **extra)

def create_refresh_token_for_user(user_id: int, **extra: Any) -> str:
    return security.create_refresh_token(uid=str(user_id), **extra)


async def get_current_payload(payload: TokenPayload = Depends(security.access_token_required)) -> TokenPayload:
    return payload


async def get_current_user_id(payload: TokenPayload = Depends(get_current_payload)) -> int:
    try:
        return int(payload.sub)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid subject in token") from exc


def verify_telegram_auth(auth_data: Dict[str, Any], bot_token: str | None) -> bool:
    """Проверка подлинности данных от Telegram Login Widget"""
    if not bot_token:
        return False

    check_hash = auth_data.pop('hash', None)
    if not check_hash:
        return False

    # Исключаем None значения - Telegram не включает пустые поля в хэш
    data_check_arr = [
        f"{key}={value}"
        for key, value in sorted(auth_data.items())
        if value is not None
    ]
    data_check_string = '\n'.join(data_check_arr)

    secret_key = hashlib.sha256(bot_token.encode()).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return hmac.compare_digest(calculated_hash, check_hash)