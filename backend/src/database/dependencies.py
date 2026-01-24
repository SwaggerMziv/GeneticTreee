from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.client import get_session

async def get_database_session(session: AsyncSession = Depends(get_session)):
    return session