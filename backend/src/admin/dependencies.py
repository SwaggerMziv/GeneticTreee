from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.dependencies import get_database_session
from src.admin.service import AdminService


async def get_admin_service(session: AsyncSession = Depends(get_database_session)) -> AdminService:
    return AdminService(session)
