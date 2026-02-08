"""Common commands handlers."""
import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from bot.keyboards import get_main_menu_keyboard, get_story_confirmation_keyboard
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
        "*Как пользоваться ботом*\n\n"
        "*Команды:*\n"
        "/interview — начать интервью\n"
        "/stats — статистика историй\n"
        "/stop — завершить интервью\n"
        "/settings — настройки\n\n"
        "*Процесс создания истории:*\n"
        "1. Отвечаете на 3+ вопросов\n"
        "2. Появляется кнопка «Создать историю»\n"
        "3. Проверяете результат\n"
        "4. Сохраняете или отклоняете\n\n"
        "*Советы для хороших историй:*\n"
        "• Называйте *имена* людей\n"
        "• Указывайте *места* и *даты*\n"
        "• Описывайте *детали*: погоду, одежду, обстановку\n"
        "• Делитесь *эмоциями*\n\n"
        "Короткие ответы типа «да/нет/не помню» не дадут хорошей истории.",
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
    """Stop interview - offer to create story if enough content."""
    current_state = await state.get_state()
    data = await state.get_data()

    if current_state not in [InterviewStates.waiting_answer.state, InterviewStates.confirming_story.state]:
        await message.answer(
            "Интервью не начато.\nНажмите «Начать интервью».",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    messages = data.get("interview_messages", [])
    relative_id = data.get("relative_id")
    question_count = data.get("question_count", 0)

    # If enough messages, offer to create story
    if len(messages) >= 4 and relative_id and question_count >= 3:
        await message.answer("Анализирую ваши ответы...")

        story_result = await ai_service.create_story(messages)
        if story_result:
            title, content, has_content = story_result

            if has_content:
                # Store for confirmation
                await state.update_data(
                    pending_story_title=title,
                    pending_story_text=content,
                )
                await state.set_state(InterviewStates.confirming_story)

                preview = content[:1500] + "..." if len(content) > 1500 else content
                preview = preview.replace("_", "\\_").replace("*", "\\*")

                await message.answer(
                    f"*{title}*\n\n{preview}\n\n---\nСохранить эту историю?",
                    parse_mode="Markdown",
                    reply_markup=get_story_confirmation_keyboard(),
                )
                return
            else:
                await message.answer(
                    f"Недостаточно деталей для истории.\n_{content}_",
                    parse_mode="Markdown",
                )

    # Clear and exit
    await state.update_data(
        interview_messages=[],
        question_count=0,
        pending_story_title=None,
        pending_story_text=None,
    )
    await state.set_state(None)
    user_storage.update_user_interaction(message.from_user.id)

    await message.answer(
        "Интервью завершено.\nНажмите «Начать интервью» чтобы продолжить.",
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
