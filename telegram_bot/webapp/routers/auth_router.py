"""Auth endpoint for Telegram Mini App."""
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from webapp.auth import validate_telegram_init_data, create_jwt_token
from webapp.schemas import AuthRequest, AuthResponse
from services.api import backend_api
from config import config

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])


@router.post("/auth", response_model=AuthResponse)
async def auth(request: AuthRequest):
    """
    Авторизация через Telegram initData.

    Клиент отправляет raw initData из window.Telegram.WebApp.initData.
    Сервер валидирует HMAC подпись и выдаёт JWT.
    """
    # Шаг 1: Валидация initData (HMAC)
    user_data = validate_telegram_init_data(request.init_data)
    if not user_data:
        logger.warning(f"initData validation failed. Data length: {len(request.init_data)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ошибка проверки подписи Telegram. Попробуйте закрыть и открыть приложение заново.",
        )

    # Шаг 2: Извлекаем telegram_user_id
    telegram_user_id = user_data.get("id")
    if not telegram_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram не передал данные пользователя.",
        )

    # Шаг 3: Ищем родственника в бэкенде
    relative = await backend_api.get_relative_by_telegram_id(telegram_user_id)
    if not relative:
        logger.warning(
            f"Relative not found for telegram_user_id={telegram_user_id}. "
            f"BACKEND_URL={backend_api.base_url}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Профиль не найден. Убедитесь, что вы перешли по ссылке-приглашению от родственника и активировали бота.",
        )

    relative_id = relative.get("id")
    if not relative_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не удалось определить профиль.",
        )

    # Шаг 4: Создаём JWT
    token = create_jwt_token(relative_id, telegram_user_id)
    logger.info(f"Auth success: relative_id={relative_id}, telegram_user_id={telegram_user_id}")

    return AuthResponse(
        token=token,
        relative_id=relative_id,
        telegram_user_id=telegram_user_id,
        first_name=user_data.get("first_name", ""),
        last_name=user_data.get("last_name", ""),
        relative_name=f"{relative.get('first_name', '')} {relative.get('last_name', '')}".strip(),
    )


class TokenAuthRequest(BaseModel):
    telegram_user_id: int


@router.post("/auth/by-telegram-id", response_model=AuthResponse)
async def auth_by_telegram_id(request: TokenAuthRequest):
    """
    Fallback-авторизация по telegram_user_id.

    Используется когда Telegram initData недоступна
    (например, ngrok free tier ломает Mini App flow).
    Менее безопасна, но позволяет работать в dev/testing окружении.
    """
    relative = await backend_api.get_relative_by_telegram_id(request.telegram_user_id)
    if not relative:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Родственник не найден для данного Telegram ID.",
        )

    relative_id = relative.get("id")
    if not relative_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не удалось определить профиль.",
        )

    token = create_jwt_token(relative_id, request.telegram_user_id)

    return AuthResponse(
        token=token,
        relative_id=relative_id,
        telegram_user_id=request.telegram_user_id,
        first_name=relative.get("first_name", ""),
        last_name=relative.get("last_name", ""),
        relative_name=f"{relative.get('first_name', '')} {relative.get('last_name', '')}".strip(),
    )


@router.get("/auth/health")
async def auth_health():
    """Диагностика: проверяет конфигурацию авторизации."""
    bot_token_set = bool(config.BOT_TOKEN)
    backend_url = backend_api.base_url

    # Проверяем доступность бэкенда
    backend_ok = False
    backend_error = None
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{backend_url}/api/v1/users/", timeout=5.0)
            backend_ok = resp.status_code in (200, 401, 403, 404, 405)
    except Exception as e:
        backend_error = str(e)

    return {
        "bot_token_configured": bot_token_set,
        "bot_token_prefix": config.BOT_TOKEN[:8] + "..." if bot_token_set else None,
        "backend_url": backend_url,
        "backend_reachable": backend_ok,
        "backend_error": backend_error,
    }
