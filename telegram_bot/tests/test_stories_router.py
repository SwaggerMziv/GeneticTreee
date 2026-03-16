"""Тесты stories роутера — /webapp/api/stories endpoints."""
import io

import pytest


@pytest.mark.integration
class TestGetStories:
    async def test_get_stories_success(self, client, auth_headers, mock_backend_api):
        """Получение списка историй."""
        mock_backend_api.get_stories.return_value = [
            {"key": "story1", "title": "Детство", "text": "Текст"},
            {"key": "story2", "title": "Школа", "text": "Текст 2"},
        ]

        r = await client.get("/webapp/api/stories", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert "stories" in data
        assert len(data["stories"]) == 2

    async def test_get_stories_empty(self, client, auth_headers, mock_backend_api):
        """Пустой список историй."""
        mock_backend_api.get_stories.return_value = []

        r = await client.get("/webapp/api/stories", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["stories"] == []

    async def test_get_stories_no_auth(self, client, mock_backend_api):
        """Без авторизации."""
        r = await client.get("/webapp/api/stories")
        assert r.status_code in (401, 403)


@pytest.mark.integration
class TestGetStoriesCount:
    async def test_count_success(self, client, auth_headers, mock_backend_api):
        """Получение количества историй."""
        mock_backend_api.get_stories_count.return_value = 5

        r = await client.get("/webapp/api/stories/count", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["count"] == 5

    async def test_count_no_auth(self, client, mock_backend_api):
        """Без авторизации."""
        r = await client.get("/webapp/api/stories/count")
        assert r.status_code in (401, 403)


@pytest.mark.integration
class TestUploadStoryMedia:
    async def test_upload_success(self, client, auth_headers, mock_backend_api):
        """Успешная загрузка фото."""
        r = await client.post(
            "/webapp/api/stories/my-story/media",
            headers=auth_headers,
            files={"file": ("photo.jpg", io.BytesIO(b"fake-photo-data"), "image/jpeg")},
        )
        assert r.status_code == 200

    async def test_upload_backend_error(self, client, auth_headers, mock_backend_api):
        """Ошибка бэкенда при загрузке."""
        mock_backend_api.upload_story_media.return_value = None

        r = await client.post(
            "/webapp/api/stories/my-story/media",
            headers=auth_headers,
            files={"file": ("photo.jpg", io.BytesIO(b"fake-photo-data"), "image/jpeg")},
        )
        assert r.status_code == 500
