"""Common commands handlers."""
import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from bot.keyboards import get_main_menu_keyboard
from services.api import backend_api
from services.storage import user_storage

logger = logging.getLogger(__name__)
router = Router()


@router.message(Command("help"))
@router.message(F.text == "❓ Помощь")
async def cmd_help(message: Message):
    """Help command."""
    await message.answer(
        "*Как пользоваться ботом*\n\n"
        "*Команды:*\n"
        "/stats — статистика историй\n"
        "/settings — настройки\n\n"
        "*Интервью и истории:*\n"
        "Откройте приложение через кнопку «🌳 Открыть приложение» в меню.\n"
        "Там вы можете пройти интервью, записать историю голосом или текстом, "
        "добавить фотографии.\n\n"
        "*Советы для хороших историй:*\n"
        "• Называйте *имена* людей\n"
        "• Указывайте *места* и *даты*\n"
        "• Описывайте *детали*: погоду, одежду, обстановку\n"
        "• Делитесь *эмоциями*\n\n"
        "Короткие ответы типа «да/нет/не помню» не дадут хорошей истории.",
        reply_markup=get_main_menu_keyboard(message.from_user.id),
        parse_mode="Markdown",
    )


@router.message(Command("stats"))
@router.message(F.text == "📊 Мои истории")
async def cmd_stats(message: Message, state: FSMContext):
    """Show user's story statistics."""
    data = await state.get_data()
    relative_id = data.get("relative_id")

    if not relative_id:
        # Try to get from storage
        user_data = user_storage.get_user(message.from_user.id)
        if user_data:
            relative_id = user_data["relative_id"]
            await state.update_data(relative_id=relative_id)
        else:
            await message.answer(
                "Вы ещё не активированы. Используйте ссылку-приглашение от родственника.",
                reply_markup=get_main_menu_keyboard(message.from_user.id),
            )
            return

    count = await backend_api.get_stories_count(relative_id)
    total_messages = data.get("total_messages_count", 0)
    session_stories = data.get("stories_in_session", 0)

    # Get broadcast info
    user_data = user_storage.get_user(message.from_user.id)
    broadcast_count = user_data.get("broadcast_count", 0) if user_data else 0

    await message.answer(
        f"📊 *Статистика*\n\n"
        f"📖 Всего историй: *{count}*\n"
        f"💬 Сообщений: *{total_messages}*\n"
        f"✨ За эту сессию: *{session_stories}* историй\n"
        f"📬 Получено напоминаний: *{broadcast_count}*",
        reply_markup=get_main_menu_keyboard(message.from_user.id),
        parse_mode="Markdown",
    )


@router.message(Command("stop"))
@router.message(F.text == "🛑 Завершить")
async def cmd_stop(message: Message, state: FSMContext):
    """Stop any active state and show menu."""
    await state.clear()
    await message.answer(
        "Состояние сброшено.\n\n"
        "Используйте «🌳 Открыть приложение» для интервью.",
        reply_markup=get_main_menu_keyboard(message.from_user.id),
    )


@router.message(F.text == "⏸ Пауза")
async def cmd_pause(message: Message, state: FSMContext):
    """Pause — redirect to mini app."""
    await state.set_state(None)
    user_storage.update_user_interaction(message.from_user.id)
    await message.answer(
        "Продолжите интервью в приложении — нажмите «🌳 Открыть приложение».",
        reply_markup=get_main_menu_keyboard(message.from_user.id),
    )
