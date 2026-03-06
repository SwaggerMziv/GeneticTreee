
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import uvicorn
from aiogram.types import BotCommand, MenuButtonWebApp, WebAppInfo

from bot.instance import bot, dp
from bot.handlers import setup_routers
from bot.scheduler import BroadcastScheduler
from webapp.server import create_webapp
from webapp.config import webapp_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def set_bot_commands():
    """Set bot commands for menu."""
    commands = [
        BotCommand(command="start", description="Начать / Перезапустить бота"),
        BotCommand(command="stats", description="Статистика ваших историй"),
        BotCommand(command="settings", description="Настройки уведомлений"),
        BotCommand(command="help", description="Помощь и инструкции"),
    ]
    await bot.set_my_commands(commands)


async def run_webapp():
    """Запуск FastAPI сервера для Mini App."""
    webapp = create_webapp()
    uvi_config = uvicorn.Config(
        webapp,
        host="0.0.0.0",
        port=webapp_config.WEBAPP_PORT,
        log_level="info",
    )
    server = uvicorn.Server(uvi_config)
    await server.serve()


async def main():
    """Main entry point."""
    logger.info("Starting Family Archive Bot...")

    # Setup routers
    main_router = setup_routers()
    dp.include_router(main_router)

    # Set bot commands
    await set_bot_commands()

    # Set Mini App menu button (left of input field)
    if webapp_config.WEBAPP_URL:
        try:
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="Приложение",
                    web_app=WebAppInfo(url=webapp_config.WEBAPP_URL),
                )
            )
            logger.info(f"Menu button set: {webapp_config.WEBAPP_URL}")
        except Exception as e:
            logger.warning(f"Failed to set menu button: {e}")

    # Check and reset webhook before starting polling
    try:
        webhook_info = await bot.get_webhook_info()
        if webhook_info.url:
            logger.warning(f"Found active webhook: {webhook_info.url}")
            logger.info("Removing webhook...")
            await bot.delete_webhook(drop_pending_updates=True)
            logger.info("Webhook removed successfully")
        else:
            logger.info("No webhook set")
    except Exception as e:
        logger.error(f"Error checking/removing webhook: {e}")
        raise

    await asyncio.sleep(2)

    # Initialize broadcast scheduler
    scheduler = BroadcastScheduler(bot)
    await scheduler.start()

    try:
        logger.info("Starting polling + WebApp server...")
        await asyncio.gather(
            dp.start_polling(bot, drop_pending_updates=True),
            run_webapp(),
        )
    finally:
        await scheduler.stop()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
