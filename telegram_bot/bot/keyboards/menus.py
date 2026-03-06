"""Keyboard menus."""
from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from webapp.config import webapp_config


def get_main_menu_keyboard(telegram_user_id: int = None) -> ReplyKeyboardMarkup:
    """Get main menu keyboard.

    Args:
        telegram_user_id: если передан, добавляется в URL webapp как fallback
                          для авторизации (нужно при ngrok free tier, где initData пустой)
    """
    buttons = []

    # Кнопка Mini App — первая
    if webapp_config.WEBAPP_URL:
        url = webapp_config.WEBAPP_URL
        if telegram_user_id:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}tg_id={telegram_user_id}"
        buttons.append([
            KeyboardButton(
                text="🌳 Открыть приложение",
                web_app=WebAppInfo(url=url),
            )
        ])

    buttons.extend([
        [KeyboardButton(text="📊 Мои истории"), KeyboardButton(text="❓ Помощь")],
        [KeyboardButton(text="⚙️ Настройки")],
    ])

    return ReplyKeyboardMarkup(
        keyboard=buttons,
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
