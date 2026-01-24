"""Keyboard menus."""
from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)


def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    """Get main menu keyboard."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📖 Начать интервью")],
            [KeyboardButton(text="📊 Мои истории"), KeyboardButton(text="❓ Помощь")],
            [KeyboardButton(text="⚙️ Настройки")],
        ],
        resize_keyboard=True,
    )


def get_interview_keyboard() -> ReplyKeyboardMarkup:
    """Get keyboard during interview."""
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="⏸ Пауза"), KeyboardButton(text="🛑 Завершить")],
        ],
        resize_keyboard=True,
    )


def get_broadcast_settings_keyboard(enabled: bool) -> InlineKeyboardMarkup:
    """Get inline keyboard for broadcast settings."""
    status = "✅ Включены" if enabled else "❌ Выключены"
    toggle_text = "🔕 Выключить" if enabled else "🔔 Включить"

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"Рассылки: {status}", callback_data="noop")],
            [
                InlineKeyboardButton(
                    text=toggle_text, callback_data=f"broadcast_toggle_{not enabled}"
                )
            ],
        ]
    )
