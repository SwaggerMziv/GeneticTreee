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


def get_interview_keyboard(question_num: int = 0, min_questions: int = 3) -> ReplyKeyboardMarkup:
    """Get keyboard during interview with progress info.

    Args:
        question_num: Current question number (1-based)
        min_questions: Minimum questions before story can be created
    """
    buttons = []

    # Show "Create story" button only after minimum questions
    if question_num >= min_questions:
        buttons.append([KeyboardButton(text="✨ Создать историю")])

    buttons.append([KeyboardButton(text="⏸ Пауза"), KeyboardButton(text="🛑 Завершить")])

    return ReplyKeyboardMarkup(keyboard=buttons, resize_keyboard=True)


def get_story_confirmation_keyboard() -> InlineKeyboardMarkup:
    """Get inline keyboard for story confirmation."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Сохранить", callback_data="story_save"),
                InlineKeyboardButton(text="❌ Отклонить", callback_data="story_discard"),
            ],
            [
                InlineKeyboardButton(text="✏️ Продолжить интервью", callback_data="story_continue"),
            ],
        ]
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


def get_relationship_keyboard() -> InlineKeyboardMarkup:
    """Get inline keyboard for selecting relationship type."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="👩 Мать", callback_data="rel_mother"),
                InlineKeyboardButton(text="👨 Отец", callback_data="rel_father"),
            ],
            [
                InlineKeyboardButton(text="👫 Брат", callback_data="rel_brother"),
                InlineKeyboardButton(text="👭 Сестра", callback_data="rel_sister"),
            ],
            [
                InlineKeyboardButton(text="👴 Дедушка", callback_data="rel_grandfather"),
                InlineKeyboardButton(text="👵 Бабушка", callback_data="rel_grandmother"),
            ],
            [
                InlineKeyboardButton(text="👤 Дядя", callback_data="rel_uncle"),
                InlineKeyboardButton(text="👤 Тётя", callback_data="rel_aunt"),
            ],
            [
                InlineKeyboardButton(text="👦 Сын", callback_data="rel_son"),
                InlineKeyboardButton(text="👧 Дочь", callback_data="rel_daughter"),
            ],
            [
                InlineKeyboardButton(text="💑 Супруг(а)", callback_data="rel_spouse"),
            ],
            [
                InlineKeyboardButton(text="❌ Пропустить", callback_data="rel_skip"),
            ],
        ]
    )


def get_relative_confirmation_keyboard() -> InlineKeyboardMarkup:
    """Get inline keyboard for confirming relative creation."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Создать профиль", callback_data="rel_confirm"),
                InlineKeyboardButton(text="❌ Отмена", callback_data="rel_cancel"),
            ],
        ]
    )


def get_photo_collection_keyboard(photo_count: int = 0) -> ReplyKeyboardMarkup:
    """Get keyboard for collecting story photos.

    Args:
        photo_count: Current number of photos uploaded
    """
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="✅ Готово, сохранить историю")],
            [KeyboardButton(text="⏭ Пропустить фото")],
        ],
        resize_keyboard=True,
    )
