"""Telegram initData validation and JWT auth."""
import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qs, unquote

import jwt

from config import config
from services.api import backend_api
from webapp.config import webapp_config

logger = logging.getLogger(__name__)


def validate_telegram_init_data(init_data: str) -> dict | None:
    """
    Валидация initData из Telegram WebApp по официальной документации.

    1. Парсим query string
    2. Собираем data-check-string (все параметры кроме hash, отсортированные по алфавиту)
    3. Вычисляем HMAC-SHA256: secret_key = HMAC-SHA256("WebAppData", bot_token)
    4. Сравниваем с hash из initData

    Returns:
        dict с данными пользователя или None при ошибке валидации
    """
    try:
        parsed = parse_qs(init_data, keep_blank_values=True)
        logger.debug(f"initData parsed keys: {list(parsed.keys())}")

        # Извлекаем hash
        received_hash = parsed.get("hash", [None])[0]
        if not received_hash:
            logger.warning("initData не содержит hash")
            return None

        # Собираем data-check-string
        data_check_parts = []
        for key in sorted(parsed.keys()):
            if key == "hash":
                continue
            value = parsed[key][0]
            data_check_parts.append(f"{key}={value}")

        data_check_string = "\n".join(data_check_parts)

        # Вычисляем secret key
        bot_token = config.BOT_TOKEN
        if not bot_token:
            logger.error("BOT_TOKEN пуст! Проверьте переменную окружения TELEGRAM_BOT_TOKEN")
            return None

        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode("utf-8"),
            hashlib.sha256,
        ).digest()

        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            logger.warning(
                f"initData hash не совпадает. "
                f"BOT_TOKEN starts with: {bot_token[:8]}..., "
                f"received_hash: {received_hash[:16]}..., "
                f"calculated_hash: {calculated_hash[:16]}..."
            )
            return None

        # Проверяем auth_date (не старше 24 часов)
        auth_date_str = parsed.get("auth_date", [None])[0]
        if auth_date_str:
            auth_date = int(auth_date_str)
            age_seconds = time.time() - auth_date
            if age_seconds > 86400:
                logger.warning(f"initData устарел: {age_seconds:.0f}с (>24 часа)")
                return None

        # Парсим user data
        user_data_str = parsed.get("user", [None])[0]
        if not user_data_str:
            logger.warning("initData не содержит user")
            return None

        user_data = json.loads(unquote(user_data_str))
        logger.info(f"initData валиден для user_id={user_data.get('id')}")
        return user_data

    except Exception as e:
        logger.error(f"Ошибка валидации initData: {e}", exc_info=True)
        return None


def create_jwt_token(relative_id: int, telegram_user_id: int) -> str:
    """Создать JWT токен для авторизованного пользователя."""
    payload = {
        "relative_id": relative_id,
        "telegram_user_id": telegram_user_id,
        "exp": int(time.time()) + webapp_config.JWT_EXPIRY_HOURS * 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, webapp_config.WEBAPP_JWT_SECRET, algorithm="HS256")


def decode_jwt_token(token: str) -> dict | None:
    """Декодировать и проверить JWT токен."""
    try:
        payload = jwt.decode(
            token,
            webapp_config.WEBAPP_JWT_SECRET,
            algorithms=["HS256"],
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("JWT токен истёк")
        return None
    except jwt.InvalidTokenError as e:
        logger.debug(f"Невалидный JWT токен: {e}")
        return None


async def authenticate_telegram_user(init_data: str) -> dict | None:
    """
    Полный цикл авторизации:
    1. Валидация initData
    2. Поиск родственника по telegram_user_id
    3. Создание JWT

    Returns:
        dict с token и user info или None
    """
    logger.info("Начало авторизации через initData")

    user_data = validate_telegram_init_data(init_data)
    if not user_data:
        logger.warning("Авторизация провалена: невалидный initData (HMAC или формат)")
        return None

    telegram_user_id = user_data.get("id")
    if not telegram_user_id:
        logger.warning("Авторизация провалена: нет id в user_data")
        return None

    logger.info(f"initData валиден, telegram_user_id={telegram_user_id}, ищем родственника...")

    # Ищем родственника в бэкенде
    relative = await backend_api.get_relative_by_telegram_id(telegram_user_id)
    if not relative:
        logger.warning(
            f"Авторизация провалена: родственник не найден для telegram_user_id={telegram_user_id}. "
            f"Проверьте что BACKEND_URL={backend_api.base_url} доступен и родственник активирован в БД."
        )
        return None

    relative_id = relative.get("id")
    if not relative_id:
        logger.warning(f"Авторизация провалена: нет id в ответе бэкенда: {relative}")
        return None

    token = create_jwt_token(relative_id, telegram_user_id)
    logger.info(f"Авторизация успешна: relative_id={relative_id}, telegram_user_id={telegram_user_id}")

    return {
        "token": token,
        "relative_id": relative_id,
        "telegram_user_id": telegram_user_id,
        "first_name": user_data.get("first_name", ""),
        "last_name": user_data.get("last_name", ""),
        "relative_name": f"{relative.get('first_name', '')} {relative.get('last_name', '')}".strip(),
    }
