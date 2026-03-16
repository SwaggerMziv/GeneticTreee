"""Integration тесты для invitation и bot endpoints."""
import pytest
from tests.helpers import create_test_relative


@pytest.mark.integration
class TestInvitations:
    async def test_generate_invitation(self, client, auth_headers, test_user, test_relative, seed_plans):
        r = await client.post(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/generate-invitation",
            headers=auth_headers
        )
        assert r.status_code == 200
        data = r.json()
        assert "invitation_url" in data
        assert "token" in data

    async def test_activate_invitation(self, client, auth_headers, test_user, test_relative, seed_plans):
        # Генерируем приглашение
        gen = await client.post(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/generate-invitation",
            headers=auth_headers
        )
        token = gen.json()["token"]
        # Активируем (публичный эндпоинт)
        r = await client.post("/api/v1/family/activate-invitation", json={
            "token": token, "telegram_user_id": 12345, "telegram_username": "testbot"
        })
        assert r.status_code == 200
        assert r.json()["is_activated"] is True

    async def test_activate_invalid_token(self, client):
        r = await client.post("/api/v1/family/activate-invitation", json={
            "token": "invalid_token_xxx", "telegram_user_id": 12345
        })
        assert r.status_code in (404, 400)

    async def test_activate_already_activated(self, client, auth_headers, test_user, test_relative, seed_plans):
        gen = await client.post(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/generate-invitation",
            headers=auth_headers
        )
        token = gen.json()["token"]
        # Первая активация
        await client.post("/api/v1/family/activate-invitation", json={
            "token": token, "telegram_user_id": 11111
        })
        # Повторная
        r = await client.post("/api/v1/family/activate-invitation", json={
            "token": token, "telegram_user_id": 22222
        })
        assert r.status_code in (409, 400)


@pytest.mark.integration
class TestPublicBotEndpoints:
    async def test_interview_messages(self, client, test_relative):
        r = await client.get(f"/api/v1/family/relatives/{test_relative.id}/interview-messages")
        assert r.status_code == 200

    async def test_save_interview_message(self, client, test_relative):
        r = await client.post(
            f"/api/v1/family/relatives/{test_relative.id}/interview-message",
            json={"user_message": "Привет", "ai_response": "Расскажите о себе"}
        )
        assert r.status_code == 200

    async def test_create_story_from_bot(self, client, test_relative):
        r = await client.post(
            f"/api/v1/family/relatives/{test_relative.id}/story",
            json={"title": "Бот-история", "text": "Текст от бота"}
        )
        assert r.status_code == 200
        assert r.json()["title"] == "Бот-история"

    async def test_get_stories_public(self, client, test_relative):
        r = await client.get(f"/api/v1/family/relatives/{test_relative.id}/stories")
        assert r.status_code == 200

    async def test_stories_count(self, client, test_relative):
        r = await client.get(f"/api/v1/family/relatives/{test_relative.id}/stories-count")
        assert r.status_code == 200
        assert "count" in r.json()

    async def test_active_telegram_users(self, client):
        r = await client.get("/api/v1/family/relatives/active-telegram")
        assert r.status_code == 200
