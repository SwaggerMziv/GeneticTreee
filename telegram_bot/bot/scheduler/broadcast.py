"""Broadcast scheduler for periodic question reminders."""
import asyncio
import logging
import random
from datetime import datetime, timedelta
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from config import config, BROADCAST_QUESTIONS
from services.storage import user_storage

logger = logging.getLogger(__name__)


class BroadcastScheduler:
    """Scheduler for sending periodic question reminders to users."""

    def __init__(self, bot: Bot):
        self.bot = bot
        self.running = False
        self.task: asyncio.Task | None = None

    async def start(self):
        """Start the broadcast scheduler."""
        if not config.BROADCAST_ENABLED:
            logger.info("Broadcast scheduler disabled in config")
            return

        self.running = True
        self.task = asyncio.create_task(self._scheduler_loop())
        logger.info(
            f"Broadcast scheduler started (interval: {config.BROADCAST_INTERVAL_HOURS}h)"
        )

    async def stop(self):
        """Stop the broadcast scheduler."""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Broadcast scheduler stopped")

    async def _scheduler_loop(self):
        """Main scheduler loop."""
        while self.running:
            try:
                await self._check_and_broadcast()
                # Sleep for 1 hour, then check again
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(300)  # Wait 5 min on error

    async def _check_and_broadcast(self):
        """Check if it's time to broadcast and send messages."""
        last_broadcast = user_storage.get_last_broadcast_time()
        now = datetime.now()

        # Check if enough time has passed since last broadcast
        if last_broadcast:
            hours_since = (now - last_broadcast).total_seconds() / 3600
            if hours_since < config.BROADCAST_INTERVAL_HOURS:
                logger.debug(
                    f"Skipping broadcast, only {hours_since:.1f}h since last one"
                )
                return

        logger.info("Starting broadcast...")
        await self._send_broadcasts()

    async def _send_broadcasts(self):
        """Send broadcast messages to all subscribed users."""
        users = user_storage.get_users_for_broadcast()

        if not users:
            logger.info("No users for broadcast")
            return

        success_count = 0
        error_count = 0

        for user in users:
            try:
                # Get next question for this user (cycling through questions)
                question_index = user_storage.get_next_question_index(
                    user["telegram_id"], len(BROADCAST_QUESTIONS)
                )
                question = BROADCAST_QUESTIONS[question_index]

                # Add some variety with random greeting
                greetings = [
                    "Здравствуйте",
                    "Добрый день",
                    "Привет",
                ]
                greeting = random.choice(greetings)

                name = user.get("name", "").split()[0] if user.get("name") else ""
                name_part = f", {name}" if name else ""

                message_text = (
                    f"{greeting}{name_part}! 📬\n\n"
                    f"У меня есть для вас вопрос:\n\n"
                    f"💭 *{question}*\n\n"
                    f"Нажмите кнопку ниже, чтобы поделиться историей!"
                )

                keyboard = InlineKeyboardMarkup(
                    inline_keyboard=[
                        [
                            InlineKeyboardButton(
                                text="📖 Рассказать историю",
                                callback_data="start_interview_from_broadcast",
                            )
                        ],
                        [
                            InlineKeyboardButton(
                                text="🔕 Отключить напоминания",
                                callback_data="broadcast_toggle_False",
                            )
                        ],
                    ]
                )

                await self.bot.send_message(
                    chat_id=user["telegram_id"],
                    text=message_text,
                    reply_markup=keyboard,
                    parse_mode="Markdown",
                )

                # Record broadcast
                user_storage.record_broadcast(
                    user["telegram_id"], question, question_index
                )
                success_count += 1

                # Small delay between messages to avoid rate limits
                await asyncio.sleep(0.1)

            except Exception as e:
                error_str = str(e)
                if "blocked" in error_str.lower() or "deactivated" in error_str.lower():
                    # User blocked the bot - disable broadcasts for them
                    user_storage.set_broadcast_enabled(user["telegram_id"], False)
                    logger.info(
                        f"User {user['telegram_id']} blocked bot, disabled broadcasts"
                    )
                else:
                    logger.error(
                        f"Error sending broadcast to {user['telegram_id']}: {e}"
                    )
                error_count += 1

        logger.info(
            f"Broadcast complete: {success_count} sent, {error_count} errors"
        )

    async def send_single_broadcast(self, telegram_id: int) -> bool:
        """Send a single broadcast to a specific user (for testing)."""
        user = user_storage.get_user(telegram_id)
        if not user:
            return False

        try:
            question_index = user_storage.get_next_question_index(
                telegram_id, len(BROADCAST_QUESTIONS)
            )
            question = BROADCAST_QUESTIONS[question_index]

            await self.bot.send_message(
                chat_id=telegram_id,
                text=f"📬 *Тестовое напоминание:*\n\n💭 {question}",
                parse_mode="Markdown",
            )
            return True
        except Exception as e:
            logger.error(f"Error sending test broadcast: {e}")
            return False
