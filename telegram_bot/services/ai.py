"""AI service for interview and story generation."""
import logging
from openai import AsyncOpenAI
from config import config, INTERVIEW_SYSTEM_PROMPT, STORY_SUMMARY_PROMPT

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
    ) -> tuple[str, bool]:
        """Get next interview question from AI.

        Returns:
            tuple[str, bool]: (question, success)
        """
        try:
            system_content = INTERVIEW_SYSTEM_PROMPT

            if relative_name:
                system_content += f"\n\nИмя собеседника: {relative_name}. Можешь иногда обращаться по имени."

            if covered_topics:
                system_content += f"\n\nУЖЕ ОБСУДИЛИ (не спрашивай об этом снова): {', '.join(covered_topics)}"

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

    async def create_story(self, messages: list[dict]) -> tuple[str, str] | None:
        """Create a story from interview messages.

        Returns:
            tuple[str, str] | None: (title, story_text) or None if failed
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
                        "content": f"Создай полную, детальную историю на основе этого диалога. Используй ВСЕ детали, которые рассказал человек:\n\n{dialog_text}",
                    },
                ],
                temperature=0.8,
                max_tokens=2500,
            )

            result = response.choices[0].message.content
            return self._parse_story_response(result)

        except Exception as e:
            logger.error(f"Error creating story: {e}")
            return None

    def _parse_story_response(self, result: str) -> tuple[str, str]:
        """Parse AI response into title and story text."""
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

        return title, story_text

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


# Singleton instance
ai_service = AIService()
