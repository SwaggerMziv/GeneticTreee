"""FastAPI WebApp server for Telegram Mini App."""
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from webapp.config import webapp_config
from webapp.routers import interview, transcribe, stories, stats, settings, auth_router, tts

logger = logging.getLogger(__name__)


def create_webapp() -> FastAPI:
    """Создать и настроить FastAPI приложение для Mini App."""
    app = FastAPI(
        title="GeneticTree Mini App",
        docs_url="/webapp/docs",
        openapi_url="/webapp/openapi.json",
    )

    # CORS для Telegram WebApp
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Роутеры API
    app.include_router(auth_router.router, prefix="/webapp/api")
    app.include_router(interview.router, prefix="/webapp/api")
    app.include_router(transcribe.router, prefix="/webapp/api")
    app.include_router(stories.router, prefix="/webapp/api")
    app.include_router(stats.router, prefix="/webapp/api")
    app.include_router(settings.router, prefix="/webapp/api")
    app.include_router(tts.router, prefix="/webapp/api")

    # Статика (сбилденный Next.js)
    static_dir = Path(__file__).parent.parent / webapp_config.WEBAPP_STATIC_DIR
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
        logger.info(f"Статика подключена: {static_dir}")
    else:
        logger.warning(f"Директория статики не найдена: {static_dir}")

    return app
