"""Interview handlers."""
import os
import logging
import tempfile
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardRemove
from aiogram.fsm.context import FSMContext

from bot.instance import bot
from bot.keyboards import get_main_menu_keyboard, get_interview_keyboard
from bot.states import InterviewStates
from bot.handlers.utils import extract_topics_from_messages
from config import config
from services.api import backend_api
from services.ai import ai_service
from services.storage import user_storage

logger = logging.getLogger(__name__)
router = Router()


@router.message(Command("interview"))
@router.message(F.text == "📖 Начать интервью")
async def start_interview(message: Message, state: FSMContext):
    """Start or continue the interview process."""
    data = await state.get_data()

    if not data.get("relative_id"):
        # Try to restore from storage
        user_data = user_storage.get_user(message.from_user.id)
        if user_data:
            await state.update_data(
                relative_id=user_data["relative_id"],
                relative_name=user_data.get("name", ""),
                interview_messages=[],
                total_messages_count=0,
            )
            data = await state.get_data()
        else:
            await message.answer(
                "Сначала пройдите активацию по ссылке-приглашению от родственника.",
                reply_markup=ReplyKeyboardRemove(),
            )
            return

    relative_name = data.get("relative_name", "")
    messages = data.get("interview_messages", [])

    # Send thinking indicator
    thinking_msg = await message.answer("...")

    # Get first/next question from AI
    covered_topics = extract_topics_from_messages(messages) if messages else []
    first_question, success = await ai_service.get_interview_question(
        messages, relative_name, covered_topics
    )

    # Delete thinking message
    await thinking_msg.delete()

    if not success:
        await message.answer(
            "⚠️ AI-ассистент временно недоступен.\nПопробуйте позже.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    # Update state
    if not messages:
        messages = [{"role": "assistant", "content": first_question}]
        intro = f"Привет! Давай начнём.\n\n{first_question}\n\n_Можно текстом или голосовым_"
    else:
        messages.append({"role": "assistant", "content": first_question})
        intro = f"Продолжим.\n\n{first_question}"

    await state.update_data(interview_messages=messages)
    await state.set_state(InterviewStates.waiting_answer)

    # Update interaction time
    user_storage.update_user_interaction(message.from_user.id)

    await message.answer(
        intro,
        reply_markup=get_interview_keyboard(),
        parse_mode="Markdown",
    )


@router.message(InterviewStates.waiting_answer, F.voice)
async def handle_voice(message: Message, state: FSMContext):
    """Handle voice messages during interview."""
    import asyncio

    data = await state.get_data()

    if not data.get("relative_id"):
        await message.answer("Сначала пройдите активацию по ссылке-приглашению.")
        return

    # Check voice duration - warn if too long
    voice_duration = message.voice.duration if message.voice else 0
    if voice_duration > 180:  # 3 minutes
        await message.answer(
            "⚠️ Голосовое сообщение очень длинное. "
            "Расшифровка может занять некоторое время..."
        )

    # Show transcription indicator
    transcribe_msg = await message.answer("🎧 Расшифровываю голосовое сообщение...")

    file_path = None
    try:
        # Download voice file with timeout
        try:
            file = await asyncio.wait_for(
                bot.get_file(message.voice.file_id),
                timeout=30
            )
        except asyncio.TimeoutError:
            logger.error("Timeout getting voice file info")
            await transcribe_msg.edit_text(
                "⏱️ Не удалось получить файл. Попробуйте записать короче или написать текстом."
            )
            return

        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp_file:
            file_path = tmp_file.name

        try:
            await asyncio.wait_for(
                bot.download_file(file.file_path, destination=file_path),
                timeout=60
            )
        except asyncio.TimeoutError:
            logger.error("Timeout downloading voice file")
            await transcribe_msg.edit_text(
                "⏱️ Загрузка файла заняла слишком много времени. "
                "Попробуйте записать короче или написать текстом."
            )
            return

        # Transcribe with timeout
        try:
            text = await asyncio.wait_for(
                ai_service.transcribe_voice(file_path),
                timeout=120  # 2 minutes for transcription
            )
        except asyncio.TimeoutError:
            logger.error("Timeout transcribing voice")
            await transcribe_msg.edit_text(
                "⏱️ Расшифровка заняла слишком много времени. "
                "Попробуйте записать сообщение короче или написать текстом."
            )
            return

        await transcribe_msg.delete()

        if text:
            # Escape markdown special characters in transcription
            escaped_text = text.replace("_", "\\_").replace("*", "\\*").replace("`", "\\`")
            await message.answer(f"📝 *Расшифровка:*\n_{escaped_text}_", parse_mode="Markdown")
            await process_interview_answer(message, state, text)
        else:
            await message.answer(
                "🔇 Не удалось распознать речь в голосовом сообщении.\n\n"
                "Попробуйте:\n"
                "• Записать сообщение в тихом месте\n"
                "• Говорить чётче и громче\n"
                "• Или просто напишите текстом"
            )

    except Exception as e:
        logger.error(f"Error handling voice message: {e}", exc_info=True)
        try:
            await transcribe_msg.delete()
        except:
            pass
        await message.answer(
            "⚠️ Произошла ошибка при обработке голосового сообщения.\n"
            "Пожалуйста, попробуйте написать текстом."
        )
    finally:
        # Clean up temp file
        if file_path:
            try:
                os.remove(file_path)
            except:
                pass


@router.message(InterviewStates.waiting_answer, F.text)
async def handle_text(message: Message, state: FSMContext):
    """Handle text messages during interview."""
    # Ignore menu buttons
    if message.text in ["⏸ Пауза", "🛑 Завершить", "⚙️ Настройки"]:
        return

    data = await state.get_data()

    if not data.get("relative_id"):
        await message.answer("Сначала пройдите активацию по ссылке-приглашению.")
        return

    await process_interview_answer(message, state, message.text)


async def process_interview_answer(message: Message, state: FSMContext, answer_text: str):
    """Process interview answer and get next question."""
    data = await state.get_data()
    messages = data.get("interview_messages", [])
    relative_id = data["relative_id"]
    relative_name = data.get("relative_name", "")
    total_count = data.get("total_messages_count", 0)
    stories_in_session = data.get("stories_in_session", 0)

    # Add user answer to conversation
    messages.append({"role": "user", "content": answer_text})
    total_count += 1

    # Check if we should create a story
    user_message_count = sum(1 for m in messages if m["role"] == "user")

    if (
        user_message_count > 0
        and user_message_count % config.MESSAGES_BEFORE_STORY == 0
    ):
        # Create story from recent messages (4 Q&A pairs = 8 messages + initial question)
        # Formula: MESSAGES_BEFORE_STORY * 2 gets all Q&A pairs
        messages_to_take = config.MESSAGES_BEFORE_STORY * 2 + 1
        recent_messages = messages[-messages_to_take:]

        await message.answer("✨ Сохраняю историю...")

        story_result = await ai_service.create_story(recent_messages)
        if story_result:
            title, story_text = story_result
            success = await backend_api.save_story(relative_id, title, story_text)
            if success:
                stories_in_session += 1
                # Show more of the story (up to 1500 chars) or full if shorter
                preview_length = min(len(story_text), 1500)
                story_preview = story_text[:preview_length]
                if len(story_text) > preview_length:
                    story_preview += "..."

                # Escape markdown special characters
                story_preview = story_preview.replace("_", "\\_").replace("*", "\\*")

                await message.answer(
                    f"📖 *{title}*\n\n"
                    f"{story_preview}",
                    parse_mode="Markdown",
                )
                # Trim if too long to avoid token limits
                if len(messages) > config.MAX_CONVERSATION_LENGTH:
                    messages = messages[-18:]  # Keep more context for 4 questions

    # Show thinking indicator
    thinking_msg = await message.answer("...")

    # Extract covered topics to avoid repetition
    covered_topics = extract_topics_from_messages(messages)

    # Get AI response with topic awareness
    ai_question, success = await ai_service.get_interview_question(
        messages, relative_name, covered_topics
    )

    # Delete thinking message
    await thinking_msg.delete()

    if not success:
        await message.answer(
            "⚠️ AI-ассистент временно недоступен.\n\n"
            "Ваш ответ сохранён. Попробуйте продолжить позже.",
            reply_markup=get_main_menu_keyboard(),
        )
        await state.set_state(None)
        return

    messages.append({"role": "assistant", "content": ai_question})

    # Update state
    await state.update_data(
        interview_messages=messages,
        total_messages_count=total_count,
        stories_in_session=stories_in_session,
    )

    # Update interaction time
    user_storage.update_user_interaction(message.from_user.id)

    # Send next question
    await message.answer(ai_question, reply_markup=get_interview_keyboard())
