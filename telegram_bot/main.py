
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from aiogram.types import BotCommand

from bot.instance import bot, dp
from bot.handlers import setup_routers
from bot.scheduler import BroadcastScheduler

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
        BotCommand(command="interview", description="Начать или продолжить интервью"),
        BotCommand(command="stats", description="Статистика ваших историй"),
        BotCommand(command="settings", description="Настройки уведомлений"),
        BotCommand(command="help", description="Помощь и инструкции"),
        BotCommand(command="stop", description="Остановить интервью"),
    ]
    await bot.set_my_commands(commands)


async def main():
    """Main entry point."""
    logger.info("Starting Family Archive Bot...")

    # Setup routers
    main_router = setup_routers()
    dp.include_router(main_router)

    # Set bot commands
    await set_bot_commands()

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
        logger.info("Starting polling...")
        await dp.start_polling(bot, drop_pending_updates=True)
    finally:
        await scheduler.stop()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
