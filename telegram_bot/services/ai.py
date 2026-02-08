"""AI service for interview and story generation."""
import json
import logging
from openai import AsyncOpenAI
from config import (
    config,
    INTERVIEW_SYSTEM_PROMPT,
    STORY_SUMMARY_PROMPT,
    RELATIVE_DETECTION_PROMPT,
    RELATIVE_INFO_QUESTION_PROMPT,
)

logger = logging.getLogger(__name__)

# Fallback questions when AI is unavailable
FALLBACK_QUESTIONS = [
    "Расскажи про своих родителей. Какими они были?",
    "Кто был твоим лучшим другом в детстве?",
    "Чем ты занимаешься по работе? Как к этому пришёл?",
    "Есть семейные традиции, которые вы соблюдаете?",
    "Какой совет дал бы себе молодому?",
    "Был момент, который изменил твою жизнь?",
    "Расскажи про своих бабушку и дедушку.",
]


class AIService:
    """Service for AI-powered interview functionality."""

    def __init__(self, api_key: str = None):
        self.client = AsyncOpenAI(api_key=api_key or config.OPENAI_API_KEY)

    async def get_interview_question(
        self,
        messages: list[dict],
        relative_name: str = "",
        covered_topics: list[str] = None,
        related_stories_context: list[dict] = None,
    ) -> tuple[str, bool]:
        """Get next interview question from AI.

        Args:
            messages: Conversation history
            relative_name: Name of the person being interviewed
            covered_topics: Topics already discussed
            related_stories_context: Stories from related family members for context

        Returns:
            tuple[str, bool]: (question, success)
        """
        try:
            system_content = INTERVIEW_SYSTEM_PROMPT

            if relative_name:
                system_content += f"\n\nИмя собеседника: {relative_name}. Можешь иногда обращаться по имени."

            if covered_topics:
                system_content += f"\n\nУЖЕ ОБСУДИЛИ (не спрашивай об этом снова): {', '.join(covered_topics)}"

            # Add family context from related stories
            if related_stories_context:
                family_context = self._format_family_context(related_stories_context)
                if family_context:
                    system_content += f"\n\n{family_context}"

            if messages:
                user_messages_count = sum(1 for m in messages if m["role"] == "user")
                if user_messages_count >= 2:
                    system_content += (
                        "\n\nПора переходить к новой теме, если текущая исчерпана."
                    )

            response = await self.client.chat.completions.create(
                model=config.INTERVIEW_MODEL,
                messages=[{"role": "system", "content": system_content}, *messages],
                temperature=0.9,
                max_tokens=150,
            )
            return response.choices[0].message.content, True

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error getting AI question: {error_msg}")

            if (
                "quota" in error_msg.lower()
                or "429" in error_msg
                or "insufficient_quota" in error_msg.lower()
            ):
                return None, False

            question_index = len(messages) // 2 % len(FALLBACK_QUESTIONS)
            return FALLBACK_QUESTIONS[question_index], True

    def _format_family_context(self, related_stories: list[dict]) -> str:
        """Format related stories into context for AI prompt."""
        if not related_stories:
            return ""

        # Translate relationship types to Russian
        relationship_translations = {
            "father": "отец",
            "mother": "мать",
            "parent": "родитель",
            "son": "сын",
            "daughter": "дочь",
            "child": "ребёнок",
            "brother": "брат",
            "sister": "сестра",
            "grandfather": "дедушка",
            "grandmother": "бабушка",
            "grandson": "внук",
            "granddaughter": "внучка",
            "uncle": "дядя",
            "aunt": "тётя",
            "cousin": "двоюродный брат/сестра",
            "nephew": "племянник",
            "niece": "племянница",
            "spouse": "супруг(а)",
            "husband": "муж",
            "wife": "жена",
        }

        context_parts = ["═══ ИСТОРИИ ОТ РОДСТВЕННИКОВ ═══"]

        for relative in related_stories[:5]:  # Limit to 5 relatives to avoid token overflow
            name = relative.get("name", "Родственник")
            rel_type = relative.get("relationship", "родственник")
            rel_type_ru = relationship_translations.get(rel_type.lower(), rel_type)

            stories = relative.get("stories", [])
            if not stories:
                continue

            context_parts.append(f"\n{name} ({rel_type_ru}):")

            for story in stories[:3]:  # Limit to 3 stories per relative
                title = story.get("title", "История")
                preview = story.get("preview", "")
                if preview:
                    # Truncate long previews
                    if len(preview) > 300:
                        preview = preview[:300] + "..."
                    context_parts.append(f"  • {title}: {preview}")

        if len(context_parts) == 1:
            return ""

        context_parts.append("\nИспользуй эти истории как зацепки для вопросов!")

        return "\n".join(context_parts)

    async def create_story(self, messages: list[dict]) -> tuple[str, str, bool] | None:
        """Create a story from interview messages.

        Returns:
            tuple[str, str, bool] | None: (title, story_text, has_content) or None if failed
            - has_content: True if story has real content, False if insufficient data
        """
        if len(messages) < 2:
            return None

        try:
            dialog_text = ""
            for msg in messages:
                role = "Интервьюер" if msg["role"] == "assistant" else "Рассказчик"
                dialog_text += f"{role}: {msg['content']}\n\n"

            response = await self.client.chat.completions.create(
                model=config.STORY_SUMMARY_MODEL,
                messages=[
                    {"role": "system", "content": STORY_SUMMARY_PROMPT},
                    {
                        "role": "user",
                        "content": f"Проанализируй диалог и создай историю ТОЛЬКО если есть реальный контент:\n\n{dialog_text}",
                    },
                ],
                temperature=0.3,  # Низкая температура для точных фактических историй
                max_tokens=2500,
            )

            result = response.choices[0].message.content
            return self._parse_story_response(result)

        except Exception as e:
            logger.error(f"Error creating story: {e}")
            return None

    def _parse_story_response(self, result: str) -> tuple[str, str, bool]:
        """Parse AI response into title, story text, and content flag.

        Returns:
            tuple[str, str, bool]: (title, story_text/reason, has_content)
        """
        # Check for insufficient data marker
        if "НЕДОСТАТОЧНО_ДАННЫХ:" in result:
            reason = result.split("НЕДОСТАТОЧНО_ДАННЫХ:")[-1].strip()
            return "Недостаточно данных", reason, False

        lines = result.strip().split("\n")
        title = "История из интервью"
        story_text = ""

        for i, line in enumerate(lines):
            if line.startswith("НАЗВАНИЕ:"):
                title = line.replace("НАЗВАНИЕ:", "").strip()
            elif line.startswith("ИСТОРИЯ:"):
                story_text = "\n".join(lines[i + 1 :]).strip()
                break

        if not story_text:
            story_text = result

        # Additional validation - check if story is too short or generic
        if len(story_text) < 50:
            return title, "История слишком короткая - расскажите больше деталей.", False

        return title, story_text, True

    async def transcribe_voice(self, voice_file_path: str) -> str | None:
        """Transcribe voice message using Whisper API.

        Handles ogg/opus format from Telegram and converts if needed.
        """
        import subprocess
        import shutil

        converted_path = None
        file_to_transcribe = voice_file_path

        try:
            # Check if ffmpeg is available and convert ogg to mp3 for better compatibility
            if voice_file_path.endswith('.ogg') and shutil.which('ffmpeg'):
                converted_path = voice_file_path.replace('.ogg', '.mp3')
                try:
                    # Convert ogg to mp3 using ffmpeg (faster and more reliable)
                    result = subprocess.run(
                        ['ffmpeg', '-y', '-i', voice_file_path, '-acodec', 'libmp3lame',
                         '-ab', '128k', '-ar', '16000', converted_path],
                        capture_output=True,
                        timeout=30
                    )
                    if result.returncode == 0:
                        file_to_transcribe = converted_path
                        logger.info("Converted ogg to mp3 for transcription")
                except subprocess.TimeoutExpired:
                    logger.warning("FFmpeg conversion timed out, using original file")
                except Exception as conv_err:
                    logger.warning(f"FFmpeg conversion failed: {conv_err}, using original file")

            # Transcribe
            with open(file_to_transcribe, "rb") as audio_file:
                transcription = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="ru",
                    prompt="Семейное интервью на русском языке. Имена людей, названия мест, даты, события из жизни.",
                    response_format="text",
                )

            return transcription.strip() if transcription else None

        except Exception as e:
            logger.error(f"Error transcribing voice: {e}", exc_info=True)
            return None
        finally:
            # Clean up converted file
            if converted_path:
                try:
                    import os
                    os.remove(converted_path)
                except:
                    pass

    async def analyze_for_mentioned_relatives(
        self,
        answer_text: str,
        existing_relatives: list[str] = None,
    ) -> dict | None:
        """
        Analyze interview answer for mentions of relatives.

        Args:
            answer_text: The user's answer to analyze
            existing_relatives: List of already known relative names to skip

        Returns:
            dict with keys: found, name, probable_role, context, has_details
            or None if analysis failed
        """
        try:
            # Skip if answer is too short
            if len(answer_text) < 15:
                return {"found": False}

            prompt = RELATIVE_DETECTION_PROMPT + answer_text

            # Add existing relatives to avoid duplicates
            if existing_relatives:
                prompt += f"\n\nУЖЕ ИЗВЕСТНЫЕ РОДСТВЕННИКИ (не включай их): {', '.join(existing_relatives)}"

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Use faster model for detection
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
            )

            result_text = response.choices[0].message.content.strip()

            # Parse JSON response
            # Handle potential markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            result = json.loads(result_text)

            # Validate required fields
            if not isinstance(result.get("found"), bool):
                result["found"] = False

            # Skip if no name found
            if result.get("found") and not result.get("name"):
                result["found"] = False

            # Skip if name is in existing relatives
            if existing_relatives and result.get("name"):
                name_lower = result["name"].lower()
                for existing in existing_relatives:
                    if existing.lower() in name_lower or name_lower in existing.lower():
                        result["found"] = False
                        break

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse relative detection response: {e}")
            return {"found": False}
        except Exception as e:
            logger.error(f"Error analyzing for relatives: {e}")
            return None

    async def get_relative_info_question(
        self,
        mentioned_name: str,
        probable_role: str,
        context: str,
        already_collected: dict,
        question_number: int,
    ) -> str:
        """
        Generate a follow-up question to collect info about a mentioned relative.

        Args:
            mentioned_name: Name of the mentioned relative
            probable_role: Probable relationship (mother, father, etc.)
            context: Original context where relative was mentioned
            already_collected: Info already collected about this relative
            question_number: Current question number (0, 1, 2)

        Returns:
            str: The question to ask
        """
        try:
            # Format collected info
            collected_info = "Пока ничего не собрано"
            if already_collected:
                collected_parts = []
                for key, value in already_collected.items():
                    if value:
                        collected_parts.append(f"- {key}: {value}")
                if collected_parts:
                    collected_info = "\n".join(collected_parts)

            # Translate role to Russian for prompt
            role_translations = {
                "mother": "мать",
                "father": "отец",
                "brother": "брат",
                "sister": "сестра",
                "grandfather": "дедушка",
                "grandmother": "бабушка",
                "uncle": "дядя",
                "aunt": "тётя",
                "son": "сын",
                "daughter": "дочь",
                "spouse": "супруг(а)",
                "other": "родственник",
            }
            role_ru = role_translations.get(probable_role, "родственник")

            prompt = RELATIVE_INFO_QUESTION_PROMPT.format(
                name=mentioned_name,
                role=role_ru,
                context=context or "не указан",
                collected_info=collected_info,
                question_number=question_number + 1,
            )

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=100,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Error generating relative info question: {e}")
            # Fallback questions
            fallback_questions = [
                f"Как полностью звали {mentioned_name}?",
                f"Сколько примерно лет было {mentioned_name}?",
                f"Чем занимался(ась) {mentioned_name}?",
            ]
            return fallback_questions[question_number % len(fallback_questions)]

    async def extract_relative_info_from_answer(
        self,
        answer: str,
        mentioned_name: str,
        question_asked: str,
    ) -> dict:
        """
        Extract structured information from user's answer about a relative.

        Args:
            answer: User's answer
            mentioned_name: Name of the relative
            question_asked: The question that was asked

        Returns:
            dict with extracted info (name, birth_year, occupation, etc.)
        """
        try:
            prompt = f"""Извлеки информацию о родственнике из ответа.

Имя родственника: {mentioned_name}
Вопрос: {question_asked}
Ответ: {answer}

Верни JSON с полями (null если информации нет):
{{
    "full_name": "полное имя если указано",
    "birth_year": число или null,
    "occupation": "профессия/занятие",
    "other_details": "другие детали"
}}

ТОЛЬКО JSON без markdown:"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=150,
            )

            result_text = response.choices[0].message.content.strip()

            # Handle markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            return json.loads(result_text)

        except Exception as e:
            logger.error(f"Error extracting relative info: {e}")
            return {"raw_answer": answer}


# Singleton instance
ai_service = AIService()
