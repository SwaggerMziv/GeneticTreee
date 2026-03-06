"""Аудит-логирование действий администратора"""

import logging
from typing import Any, Dict, Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.admin.models import AdminAuditLogModel

logger = logging.getLogger(__name__)


def _get_client_ip(request: Request) -> str:
    """Извлечение реального IP клиента"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "unknown"


async def log_admin_action(
    session: AsyncSession,
    admin_user_id: int,
    action: str,
    target_type: str,
    target_id: str,
    request: Request,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """Запись действия администратора в лог аудита"""
    try:
        ip_address = _get_client_ip(request)
        log_entry = AdminAuditLogModel(
            admin_user_id=admin_user_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            ip_address=ip_address,
            details=details,
        )
        session.add(log_entry)
        await session.flush()
    except Exception as e:
        logger.error(f"Ошибка записи аудит-лога: {e}")
