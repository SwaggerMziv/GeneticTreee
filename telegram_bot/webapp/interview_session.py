"""In-memory interview session manager."""
import logging
import time
from dataclasses import dataclass, field

from bot.handlers.utils import extract_topics_from_messages

logger = logging.getLogger(__name__)

# Сессия автоматически удаляется после 2 часов неактивности
SESSION_TTL_SECONDS = 2 * 60 * 60


@dataclass
class InterviewSession:
    """Состояние интервью для одного пользователя."""

    relative_id: int
    relative_name: str = ""
    messages: list[dict] = field(default_factory=list)
    question_count: int = 0
    covered_topics: list[str] = field(default_factory=list)
    known_relatives: list[str] = field(default_factory=list)
    pending_relative: dict | None = None
    pending_story: dict | None = None  # {"title": ..., "text": ..., "story_key": ...}
    related_stories_context: list[dict] = field(default_factory=list)
    photos: list[str] = field(default_factory=list)  # base64 фото текущей сессии
    last_activity: float = field(default_factory=time.time)
    # Realtime API session tracking
    realtime_connected: bool = False

    def touch(self):
        """Обновить время последней активности."""
        self.last_activity = time.time()

    @property
    def is_expired(self) -> bool:
        return time.time() - self.last_activity > SESSION_TTL_SECONDS

    @property
    def can_create_story(self) -> bool:
        """Можно ли создать историю (достаточно вопросов)."""
        from config import config
        return self.question_count >= config.MESSAGES_BEFORE_STORY

    @classmethod
    def from_history(
        cls,
        relative_id: int,
        relative_name: str,
        messages_data: list[dict],
        related_stories_context: list[dict] | None = None,
    ) -> "InterviewSession":
        """Восстановить сессию из данных БД.

        Args:
            relative_id: ID родственника
            relative_name: Имя родственника
            messages_data: Пары сообщений из БД [{"ai": ..., "user": ...}, ...]
            related_stories_context: Контекст историй родственников
        """
        session = cls(
            relative_id=relative_id,
            relative_name=relative_name,
        )

        # Восстанавливаем сообщения из пар
        if messages_data:
            for msg_pair in messages_data:
                if msg_pair.get("ai"):
                    session.messages.append({"role": "assistant", "content": msg_pair["ai"]})
                if msg_pair.get("user"):
                    session.messages.append({"role": "user", "content": msg_pair["user"]})
                    session.question_count += 1

        # Восстанавливаем covered_topics из сообщений
        if session.messages:
            session.covered_topics = extract_topics_from_messages(session.messages)

        # Восстанавливаем контекст родственников
        if related_stories_context:
            session.related_stories_context = related_stories_context
            session.known_relatives = [
                r.get("name", "") for r in related_stories_context if r.get("name")
            ]

        return session


class SessionManager:
    """Менеджер in-memory сессий интервью."""

    def __init__(self):
        self._sessions: dict[int, InterviewSession] = {}

    def get(self, relative_id: int) -> InterviewSession | None:
        session = self._sessions.get(relative_id)
        if session and session.is_expired:
            self.remove(relative_id)
            return None
        if session:
            session.touch()
        return session

    def create(self, relative_id: int, relative_name: str = "") -> InterviewSession:
        session = InterviewSession(
            relative_id=relative_id,
            relative_name=relative_name,
        )
        self._sessions[relative_id] = session
        return session

    def get_or_create(self, relative_id: int, relative_name: str = "") -> InterviewSession:
        session = self.get(relative_id)
        if session is None:
            session = self.create(relative_id, relative_name)
        return session

    def remove(self, relative_id: int):
        self._sessions.pop(relative_id, None)

    def cleanup_expired(self):
        """Удалить все истёкшие сессии."""
        expired = [rid for rid, s in self._sessions.items() if s.is_expired]
        for rid in expired:
            del self._sessions[rid]
        if expired:
            logger.info(f"Очищено {len(expired)} истёкших сессий")


# Singleton
session_manager = SessionManager()
