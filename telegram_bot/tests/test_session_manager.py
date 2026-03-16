"""Тесты InterviewSession и SessionManager."""
import time
from unittest.mock import patch

import pytest

from webapp.interview_session import InterviewSession, SessionManager, SESSION_TTL_SECONDS


@pytest.fixture
def manager():
    """Чистый SessionManager."""
    return SessionManager()


@pytest.mark.unit
class TestInterviewSession:
    def test_create_session(self):
        """Создание сессии."""
        session = InterviewSession(relative_id=1, relative_name="Тест")
        assert session.relative_id == 1
        assert session.relative_name == "Тест"
        assert session.messages == []
        assert session.question_count == 0

    def test_touch_updates_activity(self):
        """touch() обновляет время активности."""
        session = InterviewSession(relative_id=1)
        old_time = session.last_activity
        time.sleep(0.01)
        session.touch()
        assert session.last_activity > old_time

    def test_is_expired(self):
        """Проверка истечения сессии."""
        session = InterviewSession(relative_id=1)
        assert session.is_expired is False

        session.last_activity = time.time() - SESSION_TTL_SECONDS - 1
        assert session.is_expired is True

    def test_can_create_story(self):
        """can_create_story зависит от MESSAGES_BEFORE_STORY."""
        session = InterviewSession(relative_id=1)
        session.question_count = 0

        # config импортируется лениво внутри can_create_story
        with patch("config.config") as mock_config:
            mock_config.MESSAGES_BEFORE_STORY = 6
            assert session.can_create_story is False

            session.question_count = 6
            assert session.can_create_story is True

            session.question_count = 10
            assert session.can_create_story is True

    def test_from_history_empty(self):
        """Восстановление из пустой истории."""
        session = InterviewSession.from_history(
            relative_id=1,
            relative_name="Тест",
            messages_data=[],
        )
        assert session.relative_id == 1
        assert session.messages == []
        assert session.question_count == 0

    def test_from_history_with_data(self):
        """Восстановление из данных БД."""
        messages_data = [
            {"ai": "Привет!", "user": "Здравствуйте"},
            {"ai": "Расскажите о семье", "user": "У меня большая семья"},
        ]
        session = InterviewSession.from_history(
            relative_id=1,
            relative_name="Тест",
            messages_data=messages_data,
        )
        assert session.question_count == 2
        assert len(session.messages) == 4  # 2 пары = 4 сообщения

    def test_from_history_with_related_stories(self):
        """Восстановление с контекстом родственников."""
        related = [
            {"name": "Иван", "stories": [{"title": "s1"}]},
            {"name": "Мария", "stories": []},
        ]
        session = InterviewSession.from_history(
            relative_id=1,
            relative_name="Тест",
            messages_data=[],
            related_stories_context=related,
        )
        assert len(session.related_stories_context) == 2
        assert "Иван" in session.known_relatives
        assert "Мария" in session.known_relatives

    def test_pending_story(self):
        """Pending story workflow."""
        session = InterviewSession(relative_id=1)
        assert session.pending_story is None

        session.pending_story = {"title": "Детство", "text": "Текст истории"}
        assert session.pending_story["title"] == "Детство"

        session.pending_story = None
        assert session.pending_story is None

    def test_pending_relative(self):
        """Pending relative workflow."""
        session = InterviewSession(relative_id=1)
        assert session.pending_relative is None

        session.pending_relative = {"name": "Иван", "role": "father"}
        assert session.pending_relative["name"] == "Иван"


@pytest.mark.unit
class TestSessionManager:
    def test_create_session(self, manager):
        """Создание сессии через менеджер."""
        session = manager.create(1, "Тест")
        assert session.relative_id == 1
        assert session.relative_name == "Тест"

    def test_get_session(self, manager):
        """Получение сессии."""
        manager.create(1, "Тест")
        session = manager.get(1)
        assert session is not None
        assert session.relative_id == 1

    def test_get_nonexistent(self, manager):
        """Получение несуществующей сессии."""
        assert manager.get(999) is None

    def test_get_expired_session(self, manager):
        """Получение истёкшей сессии — возвращает None и удаляет."""
        session = manager.create(1, "Тест")
        session.last_activity = time.time() - SESSION_TTL_SECONDS - 1

        result = manager.get(1)
        assert result is None
        assert 1 not in manager._sessions

    def test_get_or_create(self, manager):
        """get_or_create создаёт если нет."""
        session = manager.get_or_create(1, "Тест")
        assert session.relative_id == 1

        session2 = manager.get_or_create(1, "Другое")
        assert session2 is session  # Тот же объект

    def test_remove_session(self, manager):
        """Удаление сессии."""
        manager.create(1, "Тест")
        manager.remove(1)
        assert manager.get(1) is None

    def test_remove_nonexistent(self, manager):
        """Удаление несуществующей сессии — без ошибки."""
        manager.remove(999)  # Не должно бросить

    def test_cleanup_expired(self, manager):
        """Очистка истёкших сессий."""
        s1 = manager.create(1, "A")
        s2 = manager.create(2, "B")
        s3 = manager.create(3, "C")

        s1.last_activity = time.time() - SESSION_TTL_SECONDS - 1
        s3.last_activity = time.time() - SESSION_TTL_SECONDS - 1

        manager.cleanup_expired()

        assert manager.get(1) is None
        assert manager.get(2) is not None
        assert manager.get(3) is None
