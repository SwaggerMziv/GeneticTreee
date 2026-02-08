"""Interview handlers."""
import json
import os
import logging
import tempfile
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardRemove, CallbackQuery
from aiogram.fsm.context import FSMContext

from bot.instance import bot
from bot.keyboards import (
    get_main_menu_keyboard,
    get_interview_keyboard,
    get_story_confirmation_keyboard,
    get_relationship_keyboard,
    get_relative_confirmation_keyboard,
    get_photo_collection_keyboard,
)
from bot.states import InterviewStates
from bot.handlers.utils import extract_topics_from_messages
from config import config
from services.api import backend_api
from services.ai import ai_service
from services.storage import user_storage

logger = logging.getLogger(__name__)
router = Router()

# Relationship type translations for display
RELATIONSHIP_TRANSLATIONS = {
    "mother": "Мать",
    "father": "Отец",
    "brother": "Брат",
    "sister": "Сестра",
    "grandfather": "Дедушка",
    "grandmother": "Бабушка",
    "uncle": "Дядя",
    "aunt": "Тётя",
    "son": "Сын",
    "daughter": "Дочь",
    "spouse": "Супруг(а)",
}

# Minimum questions before story can be created
MIN_QUESTIONS_FOR_STORY = 3


def get_progress_text(question_num: int) -> str:
    """Get progress indicator text."""
    if question_num < MIN_QUESTIONS_FOR_STORY:
        remaining = MIN_QUESTIONS_FOR_STORY - question_num
        return f"[Вопрос {question_num} | Ещё {remaining} до создания истории]"
    else:
        return f"[Вопрос {question_num} | Можно создать историю]"


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
                question_count=0,
            )
            data = await state.get_data()
        else:
            await message.answer(
                "Сначала пройдите активацию по ссылке-приглашению от родственника.",
                reply_markup=ReplyKeyboardRemove(),
            )
            return

    relative_id = data.get("relative_id")
    relative_name = data.get("relative_name", "")
    messages = data.get("interview_messages", [])
    question_count = data.get("question_count", 0)

    # Проверяем наличие сохраненного broadcast вопроса (только для нового интервью)
    first_question = None
    success = True
    if not messages:  # Только если это начало нового интервью
        saved_broadcast_question = user_storage.get_and_clear_broadcast_question(message.from_user.id)
        if saved_broadcast_question:
            first_question = saved_broadcast_question
            logger.info(f"Using saved broadcast question for user {message.from_user.id}")

    # Если нет сохраненного вопроса, генерируем через AI
    if not first_question:
        # Send thinking indicator
        thinking_msg = await message.answer("Подбираю вопрос...")

        # Get related stories context for AI enrichment
        related_stories_context = await backend_api.get_related_stories(relative_id)

        # Get first/next question from AI
        covered_topics = extract_topics_from_messages(messages) if messages else []
        first_question, success = await ai_service.get_interview_question(
            messages, relative_name, covered_topics, related_stories_context
        )

        # Delete thinking message
        await thinking_msg.delete()

    if not success:
        await message.answer(
            "AI-ассистент временно недоступен. Попробуйте позже.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    # Update question count
    question_count += 1

    # Update state
    if not messages:
        messages = [{"role": "assistant", "content": first_question}]
    else:
        messages.append({"role": "assistant", "content": first_question})

    await state.update_data(
        interview_messages=messages,
        question_count=question_count,
    )
    await state.set_state(InterviewStates.waiting_answer)

    # Update interaction time
    user_storage.update_user_interaction(message.from_user.id)

    # Build response with progress
    progress = get_progress_text(question_count)

    if question_count == 1:
        response_text = f"Давай начнём!\n\n{first_question}\n\n{progress}\n\n_Можно текстом или голосовым_"
    else:
        response_text = f"{first_question}\n\n{progress}"

    await message.answer(
        response_text,
        reply_markup=get_interview_keyboard(question_count, MIN_QUESTIONS_FOR_STORY),
        parse_mode="Markdown",
    )


@router.message(InterviewStates.waiting_answer, F.text == "✨ Создать историю")
async def create_story_manually(message: Message, state: FSMContext):
    """User requested to create story from current interview."""
    data = await state.get_data()
    question_count = data.get("question_count", 0)

    if question_count < MIN_QUESTIONS_FOR_STORY:
        await message.answer(
            f"Нужно ответить минимум на {MIN_QUESTIONS_FOR_STORY} вопроса.\n"
            f"Сейчас: {question_count}",
            reply_markup=get_interview_keyboard(question_count, MIN_QUESTIONS_FOR_STORY),
        )
        return

    await create_story_from_messages(message, state)


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
            "Голосовое сообщение очень длинное. "
            "Расшифровка может занять некоторое время..."
        )

    # Show transcription indicator
    transcribe_msg = await message.answer("Расшифровываю...")

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
                "Не удалось получить файл. Попробуйте записать короче или написать текстом."
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
                "Загрузка файла заняла слишком много времени. "
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
                "Расшифровка заняла слишком много времени. "
                "Попробуйте записать сообщение короче или написать текстом."
            )
            return

        await transcribe_msg.delete()

        if text:
            # Escape markdown special characters in transcription
            escaped_text = text.replace("_", "\\_").replace("*", "\\*").replace("`", "\\`")
            await message.answer(f"*Расшифровка:*\n_{escaped_text}_", parse_mode="Markdown")
            await process_interview_answer(message, state, text)
        else:
            await message.answer(
                "Не удалось распознать речь.\n\n"
                "Попробуйте:\n"
                "- Записать в тихом месте\n"
                "- Говорить чётче\n"
                "- Или напишите текстом"
            )

    except Exception as e:
        logger.error(f"Error handling voice message: {e}", exc_info=True)
        try:
            await transcribe_msg.delete()
        except:
            pass
        await message.answer(
            "Произошла ошибка при обработке голосового сообщения.\n"
            "Пожалуйста, напишите текстом."
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
    if message.text in ["⏸ Пауза", "🛑 Завершить", "⚙️ Настройки", "✨ Создать историю"]:
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
    question_count = data.get("question_count", 0)
    known_relatives = data.get("known_relatives", [])

    # Add user answer to conversation
    messages.append({"role": "user", "content": answer_text})

    # Update state with new message immediately
    await state.update_data(interview_messages=messages)

    # Show thinking indicator
    thinking_msg = await message.answer("...")

    # Check for mentioned relatives in the answer
    mentioned = await ai_service.analyze_for_mentioned_relatives(
        answer_text, existing_relatives=known_relatives
    )

    if mentioned and mentioned.get("found") and mentioned.get("name"):
        # Found a new relative mention - switch to collecting info
        await thinking_msg.delete()

        await state.update_data(
            mentioned_relative=mentioned,
            relative_info_collected={},
            relative_questions_asked=0,
            saved_answer_text=answer_text,  # Save for later continuation
        )
        await state.set_state(InterviewStates.collecting_relative_info)

        # Get first question about the relative
        question = await ai_service.get_relative_info_question(
            mentioned_name=mentioned["name"],
            probable_role=mentioned.get("probable_role", "other"),
            context=mentioned.get("context", ""),
            already_collected={},
            question_number=0,
        )

        name = mentioned["name"]
        role = mentioned.get("probable_role", "родственник")
        role_ru = RELATIONSHIP_TRANSLATIONS.get(role, "родственник")

        await message.answer(
            f"Интересно! Ты упомянул(а) {name} ({role_ru}).\n\n"
            f"Хочу узнать больше. {question}\n\n"
            f"_Можешь написать \"пропустить\" чтобы вернуться к интервью_",
            parse_mode="Markdown",
        )
        return

    # Regular flow - continue with interview
    # Extract covered topics to avoid repetition
    covered_topics = extract_topics_from_messages(messages)

    # Get related stories context for AI enrichment
    related_stories_context = await backend_api.get_related_stories(relative_id)

    # Get AI response with topic awareness and family context
    ai_question, success = await ai_service.get_interview_question(
        messages, relative_name, covered_topics, related_stories_context
    )

    # Delete thinking message
    await thinking_msg.delete()

    if not success:
        await message.answer(
            "AI-ассистент временно недоступен.\n\n"
            "Ваш ответ сохранён. Попробуйте продолжить позже.",
            reply_markup=get_main_menu_keyboard(),
        )
        await state.set_state(None)
        return

    # Increment question count
    question_count += 1

    # Добавляем подсказку после 7 вопросов
    MAX_QUESTIONS_BEFORE_HINT = 7
    if question_count >= MAX_QUESTIONS_BEFORE_HINT and question_count % 3 == 1:
        ai_question += "\n\n_Подсказка: у вас уже достаточно материала! Нажмите «Создать историю» чтобы сохранить рассказанное._"

    messages.append({"role": "assistant", "content": ai_question})

    # Update state
    await state.update_data(
        interview_messages=messages,
        question_count=question_count,
    )

    # Update interaction time
    user_storage.update_user_interaction(message.from_user.id)

    # Build response with progress
    progress = get_progress_text(question_count)
    response_text = f"{ai_question}\n\n{progress}"

    # Send next question
    await message.answer(
        response_text,
        reply_markup=get_interview_keyboard(question_count, MIN_QUESTIONS_FOR_STORY),
    )


async def create_story_from_messages(message: Message, state: FSMContext):
    """Create story from current interview messages."""
    data = await state.get_data()
    messages = data.get("interview_messages", [])
    relative_id = data["relative_id"]

    if len(messages) < 2:
        await message.answer(
            "Недостаточно сообщений для создания истории.",
            reply_markup=get_interview_keyboard(data.get("question_count", 0), MIN_QUESTIONS_FOR_STORY),
        )
        return

    await message.answer("Анализирую ваши ответы...")

    story_result = await ai_service.create_story(messages)

    if not story_result:
        await message.answer(
            "Не удалось создать историю. Попробуйте ответить на ещё несколько вопросов.",
            reply_markup=get_interview_keyboard(data.get("question_count", 0), MIN_QUESTIONS_FOR_STORY),
        )
        return

    title, content, has_content = story_result

    if not has_content:
        # AI determined there's not enough content
        await message.answer(
            f"*Недостаточно информации для истории*\n\n"
            f"_{content}_\n\n"
            f"Попробуйте ответить на вопросы более подробно - расскажите о конкретных событиях, людях, местах.",
            parse_mode="Markdown",
            reply_markup=get_interview_keyboard(data.get("question_count", 0), MIN_QUESTIONS_FOR_STORY),
        )
        return

    # Store pending story for confirmation
    await state.update_data(
        pending_story_title=title,
        pending_story_text=content,
    )
    await state.set_state(InterviewStates.confirming_story)

    # Show preview (up to 1500 chars)
    preview_length = min(len(content), 1500)
    story_preview = content[:preview_length]
    if len(content) > preview_length:
        story_preview += "..."

    # Escape markdown
    story_preview = story_preview.replace("_", "\\_").replace("*", "\\*")
    escaped_title = title.replace("_", "\\_").replace("*", "\\*")

    await message.answer(
        f"*{escaped_title}*\n\n"
        f"{story_preview}\n\n"
        f"---\n"
        f"Сохранить эту историю?",
        parse_mode="Markdown",
        reply_markup=get_story_confirmation_keyboard(),
    )


@router.callback_query(InterviewStates.confirming_story, F.data == "story_save")
async def confirm_story_save(callback: CallbackQuery, state: FSMContext):
    """Save the confirmed story and offer to add photos."""
    data = await state.get_data()
    relative_id = data["relative_id"]
    title = data.get("pending_story_title", "История")
    text = data.get("pending_story_text", "")

    # Save to backend
    success = await backend_api.save_story(relative_id, title, text)

    await callback.answer()

    if success:
        # Save story key for photo uploads
        await state.update_data(
            saved_story_key=title,
            story_photo_count=0,
        )
        await state.set_state(InterviewStates.collecting_story_photos)

        await callback.message.edit_text(
            f"*{title}*\n\n"
            f"История сохранена!\n\n"
            f"📸 Хотите добавить фотографии к этой истории? (до 5 штук)\n"
            f"Отправьте фото или нажмите «Пропустить»",
            parse_mode="Markdown",
        )

        await callback.message.answer(
            "Отправьте фото или выберите действие:",
            reply_markup=get_photo_collection_keyboard(),
        )
    else:
        await callback.message.edit_text(
            "Не удалось сохранить историю. Попробуйте ещё раз.",
        )
        await state.set_state(InterviewStates.waiting_answer)


@router.callback_query(InterviewStates.confirming_story, F.data == "story_discard")
async def confirm_story_discard(callback: CallbackQuery, state: FSMContext):
    """Discard the story and continue."""
    await callback.answer("История отклонена")

    # Clear pending story
    await state.update_data(
        pending_story_title=None,
        pending_story_text=None,
    )
    await state.set_state(InterviewStates.waiting_answer)

    data = await state.get_data()
    question_count = data.get("question_count", 0)

    await callback.message.edit_text(
        "История отклонена. Продолжим интервью - попробуйте ответить подробнее.",
    )

    await callback.message.answer(
        "Продолжаем?",
        reply_markup=get_interview_keyboard(question_count, MIN_QUESTIONS_FOR_STORY),
    )


@router.callback_query(InterviewStates.confirming_story, F.data == "story_continue")
async def confirm_story_continue(callback: CallbackQuery, state: FSMContext):
    """Continue interview without saving story."""
    await callback.answer()

    # Clear pending story but keep messages
    await state.update_data(
        pending_story_title=None,
        pending_story_text=None,
    )
    await state.set_state(InterviewStates.waiting_answer)

    data = await state.get_data()
    question_count = data.get("question_count", 0)
    messages = data.get("interview_messages", [])
    relative_id = data["relative_id"]
    relative_name = data.get("relative_name", "")

    await callback.message.edit_text(
        "Хорошо, продолжим интервью - добавим больше деталей.",
    )

    # Get next question
    thinking_msg = await callback.message.answer("...")

    covered_topics = extract_topics_from_messages(messages)
    related_stories_context = await backend_api.get_related_stories(relative_id)

    ai_question, success = await ai_service.get_interview_question(
        messages, relative_name, covered_topics, related_stories_context
    )

    await thinking_msg.delete()

    if success:
        question_count += 1
        messages.append({"role": "assistant", "content": ai_question})
        await state.update_data(
            interview_messages=messages,
            question_count=question_count,
        )

        progress = get_progress_text(question_count)
        await callback.message.answer(
            f"{ai_question}\n\n{progress}",
            reply_markup=get_interview_keyboard(question_count, MIN_QUESTIONS_FOR_STORY),
        )
    else:
        await callback.message.answer(
            "AI временно недоступен. Попробуйте позже.",
            reply_markup=get_main_menu_keyboard(),
        )


# ============ Relative Info Collection Handlers ============


@router.message(InterviewStates.collecting_relative_info, F.text)
async def handle_relative_info(message: Message, state: FSMContext):
    """Handle answers about the mentioned relative."""
    data = await state.get_data()
    mentioned = data.get("mentioned_relative", {})
    collected = data.get("relative_info_collected", {})
    questions_asked = data.get("relative_questions_asked", 0)

    # Check for skip command
    if message.text.lower() in ["пропустить", "skip", "отмена", "cancel"]:
        await return_to_interview(message, state)
        return

    # Extract info from the answer
    extracted = await ai_service.extract_relative_info_from_answer(
        answer=message.text,
        mentioned_name=mentioned.get("name", ""),
        question_asked=f"Вопрос {questions_asked + 1}",
    )

    # Merge extracted info into collected
    for key, value in extracted.items():
        if value:
            collected[key] = value

    # Also store raw answer
    collected[f"answer_{questions_asked}"] = message.text
    questions_asked += 1

    if questions_asked >= 3:
        # Collected enough info - show role selection
        await state.update_data(
            relative_info_collected=collected,
            relative_questions_asked=questions_asked,
        )
        await state.set_state(InterviewStates.selecting_relative_role)

        name = mentioned.get("name", "этого человека")
        probable_role = mentioned.get("probable_role", "other")
        role_ru = RELATIONSHIP_TRANSLATIONS.get(probable_role, "родственник")

        await message.answer(
            f"Отлично! Собрал информацию о {name}.\n\n"
            f"Кем {name} тебе приходится?\n"
            f"_(предполагаю: {role_ru})_",
            parse_mode="Markdown",
            reply_markup=get_relationship_keyboard(),
        )
    else:
        # Ask next question
        await state.update_data(
            relative_info_collected=collected,
            relative_questions_asked=questions_asked,
        )

        question = await ai_service.get_relative_info_question(
            mentioned_name=mentioned.get("name", ""),
            probable_role=mentioned.get("probable_role", "other"),
            context=mentioned.get("context", ""),
            already_collected=collected,
            question_number=questions_asked,
        )

        await message.answer(
            f"{question}\n\n"
            f"_({questions_asked + 1}/3 вопросов. Напиши \"пропустить\" для возврата к интервью)_",
            parse_mode="Markdown",
        )


@router.callback_query(InterviewStates.selecting_relative_role, F.data.startswith("rel_"))
async def handle_relationship_selection(callback: CallbackQuery, state: FSMContext):
    """Handle relationship type selection."""
    role = callback.data.replace("rel_", "")

    if role == "skip":
        await callback.answer("Пропущено")
        await callback.message.delete()
        await return_to_interview(callback.message, state)
        return

    data = await state.get_data()
    mentioned = data.get("mentioned_relative", {})
    collected = data.get("relative_info_collected", {})
    relative_id = data.get("relative_id")

    # Prepare data for API
    name = mentioned.get("name", "")

    # Валидация: имя не должно быть ролью
    ROLE_NAMES = {
        "мама", "папа", "мать", "отец", "бабушка", "дедушка",
        "брат", "сестра", "дядя", "тётя", "тетя", "сын", "дочь",
        "муж", "жена", "супруг", "супруга", "дед", "баба",
        "mother", "father", "brother", "sister", "grandmother", "grandfather"
    }
    name_lower = name.lower().strip()
    if name_lower in ROLE_NAMES or not name.strip():
        await callback.answer("Нужно реальное имя")
        await callback.message.edit_text(
            "Для создания профиля нужно знать настоящее имя человека, а не только роль.\n"
            "Расскажите о нём подробнее при следующем упоминании, назвав его имя."
        )
        await return_to_interview(callback.message, state)
        return

    await callback.answer("Создаю профиль...")
    # Try to get full name from collected info
    full_name = collected.get("full_name")
    if full_name:
        name_parts = full_name.split()
        first_name = name_parts[0] if name_parts else name
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else None
    else:
        first_name = name
        last_name = None

    birth_year = collected.get("birth_year")
    if birth_year and isinstance(birth_year, str):
        try:
            birth_year = int(birth_year)
        except ValueError:
            birth_year = None

    # Determine gender from role
    female_roles = {"mother", "grandmother", "sister", "aunt", "daughter", "niece"}
    male_roles = {"father", "grandfather", "brother", "uncle", "son", "nephew"}
    if role in female_roles:
        gender = "female"
    elif role in male_roles:
        gender = "male"
    else:
        gender = "other"

    # Format additional info
    additional_info = json.dumps(collected, ensure_ascii=False) if collected else None

    # Create relative via API
    try:
        result = await backend_api.create_relative_from_bot(
            interviewer_relative_id=relative_id,
            first_name=first_name,
            relationship_type=role,
            last_name=last_name,
            birth_year=birth_year,
            gender=gender,
            additional_info=additional_info,
        )

        if result:
            role_ru = RELATIONSHIP_TRANSLATIONS.get(role, "родственник")
            await callback.message.edit_text(
                f"✅ Профиль создан!\n\n"
                f"*{first_name}* ({role_ru})\n"
                f"Добавлен в семейное дерево.",
                parse_mode="Markdown",
            )

            # Add to known relatives
            known_relatives = data.get("known_relatives", [])
            known_relatives.append(name)
            await state.update_data(known_relatives=known_relatives)

        else:
            await callback.message.edit_text(
                "❌ Не удалось создать профиль. Продолжим интервью."
            )

    except Exception as e:
        logger.error(f"Error creating relative: {e}")
        await callback.message.edit_text(
            "❌ Произошла ошибка при создании профиля. Продолжим интервью."
        )

    # Return to interview
    await return_to_interview(callback.message, state)


async def return_to_interview(message: Message, state: FSMContext):
    """Return to the main interview flow."""
    data = await state.get_data()

    # Clear relative collection data
    await state.update_data(
        mentioned_relative=None,
        relative_info_collected=None,
        relative_questions_asked=0,
        saved_answer_text=None,
    )
    await state.set_state(InterviewStates.waiting_answer)

    messages = data.get("interview_messages", [])
    question_count = data.get("question_count", 0)
    relative_id = data.get("relative_id")
    relative_name = data.get("relative_name", "")

    # Get next interview question
    thinking_msg = await message.answer("Продолжаем интервью...")

    covered_topics = extract_topics_from_messages(messages)
    related_stories_context = await backend_api.get_related_stories(relative_id)

    ai_question, success = await ai_service.get_interview_question(
        messages, relative_name, covered_topics, related_stories_context
    )

    await thinking_msg.delete()

    if success:
        question_count += 1
        messages.append({"role": "assistant", "content": ai_question})
        await state.update_data(
            interview_messages=messages,
            question_count=question_count,
        )

        progress = get_progress_text(question_count)
        await message.answer(
            f"{ai_question}\n\n{progress}",
            reply_markup=get_interview_keyboard(question_count, MIN_QUESTIONS_FOR_STORY),
        )
    else:
        await message.answer(
            "AI временно недоступен. Попробуйте позже.",
            reply_markup=get_main_menu_keyboard(),
        )


# ============ Story Photo Collection Handlers ============

MAX_PHOTOS_PER_STORY = 5


@router.message(InterviewStates.collecting_story_photos, F.photo)
async def handle_story_photo(message: Message, state: FSMContext):
    """Handle photo upload for story."""
    data = await state.get_data()
    relative_id = data.get("relative_id")
    story_key = data.get("saved_story_key")
    photo_count = data.get("story_photo_count", 0)

    if not relative_id or not story_key:
        await message.answer(
            "Произошла ошибка. Начните интервью заново.",
            reply_markup=get_main_menu_keyboard(),
        )
        await state.clear()
        return

    if photo_count >= MAX_PHOTOS_PER_STORY:
        await message.answer(
            f"Достигнут лимит в {MAX_PHOTOS_PER_STORY} фотографий.\n"
            "Нажмите «Готово» для завершения.",
        )
        return

    # Show loading indicator
    processing_msg = await message.answer("📤 Загружаю фото...")

    try:
        # Get the largest photo
        photo = message.photo[-1]
        file = await bot.get_file(photo.file_id)

        # Download file
        file_bytes = await bot.download_file(file.file_path)
        photo_data = file_bytes.read()

        # Upload to backend
        result = await backend_api.upload_story_media(
            relative_id,
            story_key,
            photo_data,
            f"photo_{photo_count + 1}.jpg",
        )

        await processing_msg.delete()

        if result:
            photo_count += 1
            await state.update_data(story_photo_count=photo_count)

            remaining = MAX_PHOTOS_PER_STORY - photo_count
            if remaining > 0:
                await message.answer(
                    f"✅ Фото добавлено ({photo_count}/{MAX_PHOTOS_PER_STORY})\n"
                    f"Можно добавить ещё {remaining}",
                    reply_markup=get_photo_collection_keyboard(photo_count),
                )
            else:
                await message.answer(
                    f"✅ Добавлено {MAX_PHOTOS_PER_STORY} фотографий (максимум).",
                )
                await finish_photo_collection(message, state)
        else:
            await message.answer(
                "❌ Не удалось загрузить фото. Попробуйте другое изображение.",
            )
    except Exception as e:
        logger.error(f"Error uploading story photo: {e}")
        try:
            await processing_msg.delete()
        except Exception:
            pass
        await message.answer("❌ Ошибка при загрузке фото. Попробуйте ещё раз.")


@router.message(InterviewStates.collecting_story_photos, F.text == "✅ Готово, сохранить историю")
async def finish_photo_collection_done(message: Message, state: FSMContext):
    """Finish photo collection - done button."""
    await finish_photo_collection(message, state)


@router.message(InterviewStates.collecting_story_photos, F.text == "⏭ Пропустить фото")
async def finish_photo_collection_skip(message: Message, state: FSMContext):
    """Finish photo collection - skip button."""
    await finish_photo_collection(message, state)


async def finish_photo_collection(message: Message, state: FSMContext):
    """Finish photo collection and return to main menu."""
    data = await state.get_data()
    photo_count = data.get("story_photo_count", 0)
    story_key = data.get("saved_story_key", "История")

    # Clear story photo data
    await state.update_data(
        saved_story_key=None,
        story_photo_count=0,
        pending_story_title=None,
        pending_story_text=None,
        interview_messages=[],
        question_count=0,
    )
    await state.set_state(None)

    if photo_count > 0:
        await message.answer(
            f"📖 История «{story_key}» сохранена с {photo_count} фото!\n\n"
            "Хотите рассказать ещё одну историю?",
            reply_markup=get_main_menu_keyboard(),
        )
    else:
        await message.answer(
            f"📖 История «{story_key}» сохранена!\n\n"
            "Хотите рассказать ещё одну историю?",
            reply_markup=get_main_menu_keyboard(),
        )
