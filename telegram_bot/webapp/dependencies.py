"""FastAPI dependencies for WebApp."""
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from webapp.auth import decode_jwt_token

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    JWT dependency — извлекает данные пользователя из Bearer токена.

    Returns:
        dict с relative_id и telegram_user_id
    """
    payload = decode_jwt_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный или истёкший токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "relative_id": payload["relative_id"],
        "telegram_user_id": payload["telegram_user_id"],
    }
