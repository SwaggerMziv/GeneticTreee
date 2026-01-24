"""Common commands handlers."""
import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from bot.keyboards import get_main_menu_keyboard
from bot.states import InterviewStates
from services.api import backend_api
from services.ai import ai_service
from services.storage import user_storage

logger = logging.getLogger(__name__)
router = Router()


@router.message(Command("help"))
@router.message(F.text == "❓ Помощь")
async def cmd_help(message: Message):
    """Help command."""
    await message.answer(
        "📚 **Инструкция по использованию бота**\n\n"
        "**Основные команды:**\n"
        "• /interview - начать или продолжить интервью\n"
        "• /stats - посмотреть сколько историй сохранено\n"
        "• /stop - остановить текущее интервью\n"
        "• /settings - настройки уведомлений\n\n"
        "**Как проходит интервью:**\n"
        "1. Я задаю вам вопросы о вашей жизни\n"
        "2. Вы отвечаете текстом или голосовым сообщением\n"
        "3. После каждых нескольких ответов я создаю историю\n"
        "4. Истории сохраняются в вашем семейном древе\n\n"
        "**Советы:**\n"
        "• Отвечайте подробно - чем больше деталей, тем интереснее история\n"
        "• Называйте имена людей, места, даты\n"
        "• Делитесь эмоциями - что вы чувствовали\n"
        "• Голосовые сообщения удобны для длинных историй\n\n"
        "**Напоминания:**\n"
        "Я буду присылать вам вопросы раз в 12 часов. "
        "Отключить их можно в /settings.",
        reply_markup=get_main_menu_keyboard(),
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
                reply_markup=get_main_menu_keyboard(),
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
        reply_markup=get_main_menu_keyboard(),
        parse_mode="Markdown",
    )


@router.message(Command("stop"))
@router.message(F.text == "🛑 Завершить")
async def cmd_stop(message: Message, state: FSMContext):
    """Stop interview and save remaining messages as story."""
    current_state = await state.get_state()
    data = await state.get_data()

    if current_state != InterviewStates.waiting_answer.state:
        await message.answer(
            "Интервью не было начато. Нажмите 'Начать интервью' чтобы начать.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    messages = data.get("interview_messages", [])
    relative_id = data.get("relative_id")

    # Try to create story from remaining messages
    if len(messages) >= 2 and relative_id:
        await message.answer("⏳ Сохраняю вашу историю...")

        story_result = await ai_service.create_story(messages)
        if story_result:
            title, story_text = story_result
            success = await backend_api.save_story(relative_id, title, story_text)
            if success:
                await message.answer(
                    f"✅ История сохранена!\n\n" f"📖 **{title}**",
                    parse_mode="Markdown",
                )

    await state.update_data(interview_messages=[])
    await state.set_state(None)

    # Update interaction time
    user_storage.update_user_interaction(message.from_user.id)

    await message.answer(
        "Интервью завершено. Спасибо за ваши истории!\n\n"
        "Когда захотите продолжить - нажмите 'Начать интервью'.",
        reply_markup=get_main_menu_keyboard(),
    )


@router.message(F.text == "⏸ Пауза")
async def cmd_pause(message: Message, state: FSMContext):
    """Pause interview."""
    await state.set_state(None)
    user_storage.update_user_interaction(message.from_user.id)
    await message.answer(
        "Интервью на паузе. Ваши ответы сохранены.\n\n"
        "Нажмите 'Начать интервью' чтобы продолжить.",
        reply_markup=get_main_menu_keyboard(),
    )
