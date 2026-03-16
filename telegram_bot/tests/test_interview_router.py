"""Тесты interview роутера — /webapp/api/interview endpoints."""
import pytest

from webapp.interview_session import InterviewSession, session_manager


@pytest.fixture(autouse=True)
def _clear_sessions():
    """Очищаем сессии перед каждым тестом."""
    session_manager._sessions.clear()
    yield
    session_manager._sessions.clear()


@pytest.mark.integration
class TestInterviewHistory:
    async def test_get_history_success(self, client, auth_headers, mock_backend_api):
        """Получение истории интервью."""
        r = await client.get("/webapp/api/interview/history", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert "messages" in data
        assert "question_count" in data
        assert "can_create_story" in data
        assert "relative_name" in data

    async def test_get_history_no_auth(self, client, mock_backend_api):
        """Без авторизации — 401/403."""
        r = await client.get("/webapp/api/interview/history")
        assert r.status_code in (401, 403)

    async def test_get_history_expired_token(self, client, expired_headers, mock_backend_api):
        """С истёкшим токеном — 401."""
        r = await client.get("/webapp/api/interview/history", headers=expired_headers)
        assert r.status_code == 401

    async def test_get_history_restores_session(self, client, auth_headers, mock_backend_api):
        """История из бэкенда восстанавливает сессию."""
        mock_backend_api.get_interview_messages.return_value = [
            {"ai": "Привет! Расскажи о семье.", "user": "У меня большая семья."},
        ]

        r = await client.get("/webapp/api/interview/history", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert data["question_count"] == 1
        assert len(data["messages"]) == 2  # ai + user

    async def test_get_history_uses_existing_session(self, client, auth_headers, mock_backend_api):
        """Если in-memory сессия существует — использует её."""
        session = session_manager.create(1, "Тест Тестов")
        session.messages = [{"role": "assistant", "content": "Привет!"}]
        session.question_count = 5

        r = await client.get("/webapp/api/interview/history", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert data["question_count"] == 5


@pytest.mark.integration
class TestConfirmStory:
    async def test_save_story(self, client, auth_headers, mock_backend_api):
        """Сохранение истории через confirm-story."""
        session = session_manager.create(1, "Тест")
        session.pending_story = {"title": "Детство", "text": "Текст истории."}

        r = await client.post(
            "/webapp/api/interview/confirm-story",
            headers=auth_headers,
            json={"action": "save"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert "story_key" in data

    async def test_save_no_pending_story(self, client, auth_headers, mock_backend_api):
        """Сохранение без pending_story — ошибка."""
        session_manager.create(1, "Тест")

        r = await client.post(
            "/webapp/api/interview/confirm-story",
            headers=auth_headers,
            json={"action": "save"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False

    async def test_discard_story(self, client, auth_headers, mock_backend_api):
        """Отклонение истории."""
        session = session_manager.create(1, "Тест")
        session.pending_story = {"title": "Test", "text": "Text"}

        r = await client.post(
            "/webapp/api/interview/confirm-story",
            headers=auth_headers,
            json={"action": "discard"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True

    async def test_continue_interview(self, client, auth_headers, mock_backend_api):
        """Продолжение интервью после превью."""
        session = session_manager.create(1, "Тест")
        session.pending_story = {"title": "Test", "text": "Text"}

        r = await client.post(
            "/webapp/api/interview/confirm-story",
            headers=auth_headers,
            json={"action": "continue"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True

    async def test_unknown_action(self, client, auth_headers, mock_backend_api):
        """Неизвестное действие."""
        session_manager.create(1, "Тест")

        r = await client.post(
            "/webapp/api/interview/confirm-story",
            headers=auth_headers,
            json={"action": "unknown"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False

    async def test_no_session(self, client, auth_headers, mock_backend_api):
        """Нет сессии — ошибка."""
        r = await client.post(
            "/webapp/api/interview/confirm-story",
            headers=auth_headers,
            json={"action": "save"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False


@pytest.mark.integration
class TestCreateRelative:
    async def test_create_success(self, client, auth_headers, mock_backend_api):
        """Успешное создание родственника."""
        session_manager.create(1, "Тест")

        r = await client.post(
            "/webapp/api/interview/create-relative",
            headers=auth_headers,
            json={
                "first_name": "Иван",
                "relationship_type": "father",
                "gender": "male",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert "data" in data

    async def test_create_backend_failure(self, client, auth_headers, mock_backend_api):
        """Ошибка бэкенда при создании."""
        mock_backend_api.create_relative_from_bot.return_value = None
        session_manager.create(1, "Тест")

        r = await client.post(
            "/webapp/api/interview/create-relative",
            headers=auth_headers,
            json={
                "first_name": "Иван",
                "relationship_type": "father",
                "gender": "male",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False

    async def test_create_adds_to_known_list(self, client, auth_headers, mock_backend_api):
        """Созданный родственник добавляется в known_relatives."""
        session = session_manager.create(1, "Тест")
        assert "Иван" not in session.known_relatives

        r = await client.post(
            "/webapp/api/interview/create-relative",
            headers=auth_headers,
            json={
                "first_name": "Иван",
                "relationship_type": "father",
                "gender": "male",
            },
        )
        assert r.status_code == 200
        assert "Иван" in session.known_relatives
