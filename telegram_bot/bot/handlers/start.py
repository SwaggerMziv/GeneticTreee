"""Start command handler."""
import logging
import httpx
from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from bot.keyboards import get_main_menu_keyboard
from services.api import backend_api
from services.storage import user_storage

logger = logging.getLogger(__name__)
router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    """Handle /start command with optional invitation token."""
    args = message.text.split(maxsplit=1)

    if len(args) > 1:
        # Invitation flow: /start <token>
        token = args[1]

        try:
            relative_data = await backend_api.activate_user(
                token=token,
                telegram_user_id=message.from_user.id,
                username=message.from_user.username,
            )

            relative_name = (
                f"{relative_data.get('first_name', '')} {relative_data.get('last_name', '')}".strip()
            )

            # Save to FSM state
            await state.update_data(
                relative_id=relative_data["id"],
                relative_name=relative_name,
                interview_messages=[],
                total_messages_count=0,
            )

            # Save to storage for broadcasts
            user_storage.add_user(
                telegram_id=message.from_user.id,
                relative_id=relative_data["id"],
                name=relative_name,
                enabled_broadcast=True,
            )

            await message.answer(
                f"Здравствуйте, {relative_data.get('first_name', 'дорогой друг')}!\n\n"
                f"Добро пожаловать в семейный архив. Я помогу вам сохранить "
                f"ваши воспоминания и истории для потомков.\n\n"
                f"📖 **Как это работает:**\n"
                f"• Я буду задавать вам вопросы о вашей жизни\n"
                f"• Вы можете отвечать текстом или голосовыми сообщениями\n"
                f"• Из ваших ответов я создам красивые истории\n\n"
                f"🎤 **Голосовые сообщения:**\n"
                f"Можете записывать голосовые - я их расшифрую!\n\n"
                f"📬 **Напоминания:**\n"
                f"Я буду присылать вам вопросы для размышлений. "
                f"Это можно отключить в настройках.\n\n"
                f"Готовы начать?",
                reply_markup=get_main_menu_keyboard(),
                parse_mode="Markdown",
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                await message.answer(
                    "Неверная или устаревшая ссылка-приглашение.\n"
                    "Попросите родственника отправить вам новую ссылку."
                )
            elif e.response.status_code == 400:
                await message.answer(
                    "Вы уже активированы!\n\n"
                    "Используйте меню ниже или напишите /interview чтобы продолжить интервью.",
                    reply_markup=get_main_menu_keyboard(),
                )
            else:
                await message.answer("Произошла ошибка. Попробуйте позже.")
        except Exception as e:
            logger.error(f"Unexpected error in start command: {e}")
            await message.answer("Произошла ошибка при активации. Попробуйте позже.")
    else:
        # Regular start without token - check if already activated
        user_data = user_storage.get_user(message.from_user.id)
        if user_data:
            # User exists in storage, restore FSM state
            await state.update_data(
                relative_id=user_data["relative_id"],
                relative_name=user_data.get("name", ""),
                interview_messages=[],
                total_messages_count=0,
            )
            await message.answer(
                f"С возвращением{', ' + user_data.get('name', '').split()[0] if user_data.get('name') else ''}!\n\n"
                "Нажмите 'Начать интервью' чтобы продолжить делиться историями.",
                reply_markup=get_main_menu_keyboard(),
            )
        else:
            await message.answer(
                "👋 Добро пожаловать в бот семейного архива!\n\n"
                "Этот бот помогает сохранять семейные истории и воспоминания.\n\n"
                "**Для начала работы:**\n"
                "Используйте персональную ссылку-приглашение, которую вам "
                "отправил ваш родственник.\n\n"
                "Если вы уже активированы, нажмите /interview для начала интервью.",
                parse_mode="Markdown",
            )
