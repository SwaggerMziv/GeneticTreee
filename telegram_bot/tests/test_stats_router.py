"""Тесты stats роутера — /webapp/api/stats endpoint."""
import pytest


@pytest.mark.integration
class TestStats:
    async def test_stats_success(self, client, auth_headers, mock_backend_api):
        """Получение статистики."""
        mock_backend_api.get_stories_count.return_value = 3
        mock_backend_api.get_related_stories.return_value = [
            {"name": "Иван", "stories": [{"title": "s1"}, {"title": "s2"}]},
            {"name": "Мария", "stories": [{"title": "s3"}]},
        ]

        r = await client.get("/webapp/api/stats", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert data["my_stories"] == 3
        assert data["related_relatives"] == 2
        assert data["relatives_stories"] == 3
        assert data["total_stories"] == 6  # 3 + 3

    async def test_stats_empty_data(self, client, auth_headers, mock_backend_api):
        """Статистика с пустыми данными."""
        mock_backend_api.get_stories_count.return_value = 0
        mock_backend_api.get_related_stories.return_value = []

        r = await client.get("/webapp/api/stats", headers=auth_headers)
        assert r.status_code == 200

        data = r.json()
        assert data["my_stories"] == 0
        assert data["related_relatives"] == 0
        assert data["relatives_stories"] == 0
        assert data["total_stories"] == 0

    async def test_stats_no_auth(self, client, mock_backend_api):
        """Без авторизации."""
        r = await client.get("/webapp/api/stats")
        assert r.status_code in (401, 403)

    async def test_stats_correct_totals(self, client, auth_headers, mock_backend_api):
        """Проверка корректности подсчёта."""
        mock_backend_api.get_stories_count.return_value = 10
        mock_backend_api.get_related_stories.return_value = [
            {"name": "А", "stories": [{"title": "s"} for _ in range(5)]},
        ]

        r = await client.get("/webapp/api/stats", headers=auth_headers)
        data = r.json()
        assert data["total_stories"] == 15  # 10 + 5
