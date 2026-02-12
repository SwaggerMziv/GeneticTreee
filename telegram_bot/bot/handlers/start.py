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
                f"Здравствуйте, {relative_data.get('first_name', '')}! 👋\n\n"
                f"Я — бот-интервьюер семейного архива *GeneticTree*. "
                f"Моя задача — помочь вам сохранить воспоминания, истории и события вашей жизни для семьи.\n\n"
                f"*Как проходит интервью:*\n"
                f"• Я задаю вопросы — вы отвечаете *текстом*, *голосовым* 🎤 или отправляете *фото* 📸\n"
                f"• После 3+ ответов можно создать готовую историю\n"
                f"• Фотографии можно присылать в любой момент — они прикрепятся к истории\n\n"
                f"💡 *Подсказка:* чем подробнее ваши ответы (имена, даты, места, детали), тем интереснее и полнее получится история.\n\n"
                f"Готовы начать? Нажмите *«Начать интервью»* 👇",
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
                # Parse error details if available
                try:
                    error_data = e.response.json()
                    error_type = error_data.get("details", {}).get("error_type", "")

                    if error_type == "telegram_user_already_linked":
                        await message.answer(
                            "Этот Telegram аккаунт уже привязан к другому профилю.\n\n"
                            "Один Telegram аккаунт = один родственник в архиве.\n"
                            "Используйте /interview для продолжения интервью.",
                            reply_markup=get_main_menu_keyboard(),
                        )
                    else:
                        await message.answer(
                            "Этот профиль уже активирован!\n\n"
                            "Используйте меню ниже или /interview для интервью.",
                            reply_markup=get_main_menu_keyboard(),
                        )
                except:
                    await message.answer(
                        "Этот профиль уже активирован!\n\n"
                        "Используйте меню ниже или /interview для интервью.",
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
            name_part = user_data.get('name', '').split()[0] if user_data.get('name') else ''
            greeting = f", {name_part}" if name_part else ""
            await message.answer(
                f"С возвращением{greeting}! 👋\n\n"
                "Расскажите ещё одну историю — отвечайте текстом, голосовым 🎤 или отправляйте фото 📸.\n\n"
                "Нажмите *«Начать интервью»* чтобы продолжить.",
                reply_markup=get_main_menu_keyboard(),
                parse_mode="Markdown",
            )
        else:
            await message.answer(
                "👋 Добро пожаловать в *GeneticTree* — бот семейного архива!\n\n"
                "Я помогаю сохранять семейные истории и воспоминания для будущих поколений. "
                "Провожу интервью, принимаю фотографии и создаю красивые истории из ваших ответов.\n\n"
                "*Для начала работы:*\n"
                "Перейдите по персональной ссылке-приглашению от вашего родственника — "
                "она выглядит так: `t.me/...?start=...`\n\n"
                "Если вы уже активированы, нажмите /interview",
                parse_mode="Markdown",
            )
