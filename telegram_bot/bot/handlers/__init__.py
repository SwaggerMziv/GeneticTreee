"""Handlers package."""
from aiogram import Router

from bot.handlers.start import router as start_router
from bot.handlers.commands import router as commands_router
from bot.handlers.interview import router as interview_router
from bot.handlers.settings import router as settings_router


def setup_routers() -> Router:
    """Setup and return main router with all handlers."""
    main_router = Router()
    main_router.include_router(start_router)
    main_router.include_router(commands_router)
    main_router.include_router(settings_router)
    main_router.include_router(interview_router)  # Should be last (catch-all)
    return main_router


__all__ = ["setup_routers"]
