"""Settings handlers."""
import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from bot.keyboards import get_main_menu_keyboard, get_broadcast_settings_keyboard
from services.storage import user_storage

logger = logging.getLogger(__name__)
router = Router()


@router.message(Command("settings"))
@router.message(F.text == "⚙️ Настройки")
async def cmd_settings(message: Message):
    """Show settings menu."""
    user_data = user_storage.get_user(message.from_user.id)

    if not user_data:
        await message.answer(
            "Вы ещё не активированы. Используйте ссылку-приглашение от родственника.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    enabled = user_data.get("enabled_broadcast", True)

    await message.answer(
        "⚙️ **Настройки**\n\n"
        "Здесь вы можете управлять рассылкой напоминаний.\n\n"
        "Напоминания приходят каждые 12 часов с интересными вопросами, "
        "которые помогут вам вспомнить истории из жизни.",
        reply_markup=get_broadcast_settings_keyboard(enabled),
        parse_mode="Markdown",
    )


@router.callback_query(F.data.startswith("broadcast_toggle_"))
async def toggle_broadcast(callback: CallbackQuery):
    """Toggle broadcast setting."""
    # Parse new state from callback data
    new_state = callback.data.split("_")[-1] == "True"

    user_storage.set_broadcast_enabled(callback.from_user.id, new_state)

    status = "включены" if new_state else "выключены"
    await callback.answer(f"Напоминания {status}")

    await callback.message.edit_reply_markup(
        reply_markup=get_broadcast_settings_keyboard(new_state)
    )


@router.callback_query(F.data == "noop")
async def noop_callback(callback: CallbackQuery):
    """Handle noop callback (info buttons)."""
    await callback.answer()


@router.callback_query(F.data == "start_interview_from_broadcast")
async def start_interview_from_broadcast(callback: CallbackQuery):
    """Handle interview start from broadcast message."""
    await callback.answer("Отправьте /interview чтобы начать!")
    await callback.message.answer(
        "Отлично! Нажмите кнопку ниже или отправьте /interview чтобы начать интервью.",
        reply_markup=get_main_menu_keyboard(),
    )
