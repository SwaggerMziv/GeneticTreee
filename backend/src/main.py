from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from src.users.router import router as users_router
from src.family.router import router as family_router
from src.exceptions import BaseAppException
from src.auth.router import router as auth_router
from src.core.cors import setup_cors
from src.core.middleware import setup_middleware
from src.core.router import router as core_router
from src.storage.s3.router import router as storage_router
from src.ai.router import router as ai_router
from src.book.router import router as book_router
from src.admin.router import router as admin_router
from src.subscription.router import router as subscription_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация при старте: seed тарифов, запуск шедулера"""
    from src.database.client import async_session
    from src.subscription.seed import seed_plans

    async with async_session() as session:
        try:
            await seed_plans(session)
            await session.commit()
        except Exception as e:
            await session.rollback()
            import logging
            logging.getLogger(__name__).error(f"Ошибка seed тарифов: {e}")

    # Запуск APScheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from src.subscription.scheduler import (
            check_expiring_subscriptions,
            expire_past_due_subscriptions,
        )

        scheduler = AsyncIOScheduler()

        async def _check_expiring():
            async with async_session() as session:
                try:
                    await check_expiring_subscriptions(session)
                    await session.commit()
                except Exception:
                    await session.rollback()

        async def _expire_past_due():
            async with async_session() as session:
                try:
                    await expire_past_due_subscriptions(session)
                    await session.commit()
                except Exception:
                    await session.rollback()

        scheduler.add_job(_check_expiring, "cron", hour=2, minute=0)
        scheduler.add_job(_expire_past_due, "cron", hour=3, minute=0)
        scheduler.start()
        app.state.scheduler = scheduler
    except ImportError:
        pass  # APScheduler не установлен — пропускаем

    yield

    # Shutdown
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)


app = FastAPI(
    title="GenericTree API",
    version="0.0.1",
    description="GenericTree API is a RESTful API for the GenericTree project.",
    lifespan=lifespan,
)

@app.exception_handler(BaseAppException)
async def base_app_exception_handler(request: Request, exc: BaseAppException):
    """Обработчик для всех исключений приложения"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.message,
            "details": exc.details
        }
    )

app.include_router(users_router)
app.include_router(family_router)
app.include_router(auth_router)
app.include_router(core_router)
app.include_router(storage_router)
app.include_router(ai_router)
app.include_router(book_router)
app.include_router(admin_router)
app.include_router(subscription_router)

setup_cors(app)
setup_middleware(app)

