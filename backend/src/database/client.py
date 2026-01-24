from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.config import settings
from src.database.base import Base
import asyncio

DATABASE_URL = f"postgresql+asyncpg://{settings.database_username}:{settings.database_password}@{settings.database_host}:{settings.database_port}/{settings.database_name}"
async_engine = create_async_engine(url=DATABASE_URL, echo=True)
async_session = async_sessionmaker[AsyncSession](async_engine, expire_on_commit=False)

async def get_session():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()


async def setup_db():
    from src.users.models import UserModel  # noqa: F401
    from src.family.models import FamilyRelationModel, FamilyRelationshipModel  # noqa: F401
    
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(setup_db())