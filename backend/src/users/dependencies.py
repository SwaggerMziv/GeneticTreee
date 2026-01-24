from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.dependencies import get_database_session
from src.users.repository import UserRepository
from src.users.service import UserService

async def get_user_repository(session: AsyncSession = Depends(get_database_session)):
    return UserRepository(session)


async def get_user_service(repository: UserRepository = Depends(get_user_repository)):
    return UserService(repository)

