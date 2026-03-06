"""Settings endpoint."""
import logging

from fastapi import APIRouter, Depends

from services.storage import user_storage
from webapp.dependencies import get_current_user
from webapp.schemas import SettingsResponse, SettingsUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(user: dict = Depends(get_current_user)):
    """Получить текущие настройки."""
    telegram_user_id = user["telegram_user_id"]
    user_data = user_storage.get_user(telegram_user_id)

    if not user_data:
        return SettingsResponse(
            broadcast_enabled=True,
            name="",
            added_at=None,
        )

    return SettingsResponse(
        broadcast_enabled=user_data.get("enabled_broadcast", True),
        name=user_data.get("name", ""),
        added_at=user_data.get("added_at"),
    )


@router.put("")
async def update_settings(
    request: SettingsUpdateRequest,
    user: dict = Depends(get_current_user),
):
    """Обновить настройки."""
    telegram_user_id = user["telegram_user_id"]

    user_storage.set_broadcast_enabled(telegram_user_id, request.broadcast_enabled)

    return {"success": True, "broadcast_enabled": request.broadcast_enabled}
