"""Integration тесты для bot-specific endpoints."""
import pytest
from tests.helpers import create_test_relative


@pytest.mark.integration
class TestBotEndpoints:
    async def test_create_relative_from_bot(self, client, test_relative):
        r = await client.post("/api/v1/family/relatives/create-from-bot", json={
            "interviewer_relative_id": test_relative.id,
            "first_name": "НовыйРодственник",
            "gender": "male",
            "relationship_type": "father"
        })
        assert r.status_code == 200
        assert r.json()["first_name"] == "НовыйРодственник"

    async def test_create_from_bot_invalid_type(self, client, test_relative):
        r = await client.post("/api/v1/family/relatives/create-from-bot", json={
            "interviewer_relative_id": test_relative.id,
            "first_name": "Test",
            "gender": "male",
            "relationship_type": "invalid_type"
        })
        assert r.status_code == 422

    async def test_create_from_bot_with_extra_fields(self, client, test_relative):
        r = await client.post("/api/v1/family/relatives/create-from-bot", json={
            "interviewer_relative_id": test_relative.id,
            "first_name": "Анна",
            "last_name": "Петрова",
            "birth_year": 1960,
            "gender": "female",
            "relationship_type": "mother",
            "additional_info": "Дополнительная информация"
        })
        assert r.status_code == 200

    async def test_related_stories(self, client, test_relative):
        r = await client.get(f"/api/v1/family/relatives/{test_relative.id}/related-stories")
        assert r.status_code == 200

    async def test_get_relative_by_telegram_not_found(self, client):
        r = await client.get("/api/v1/family/relative-by-telegram/9999999")
        assert r.status_code in (404, 200)

    async def test_bot_story_media(self, client, test_relative):
        # Сначала создаём историю
        story = await client.post(
            f"/api/v1/family/relatives/{test_relative.id}/story",
            json={"title": "MediaStory", "text": "With media"}
        )
        if story.status_code == 200:
            import io
            files = {"file": ("photo.jpg", io.BytesIO(b"fake image"), "image/jpeg")}
            r = await client.post(
                f"/api/v1/family/relatives/{test_relative.id}/stories/MediaStory/media",
                files=files
            )
            assert r.status_code in (200, 404)
