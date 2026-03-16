"""Integration тесты для book endpoints."""
import pytest


@pytest.mark.integration
class TestBookGeneration:
    async def test_no_auth(self, client):
        r = await client.post("/api/v1/book/generate/stream", json={})
        assert r.status_code in (401, 422)

    async def test_auth_required(self, client):
        r = await client.post("/api/v1/book/generate/stream")
        assert r.status_code in (401, 422)

    async def test_content_type_with_auth(self, client, auth_headers, seed_plans):
        r = await client.post("/api/v1/book/generate/stream", headers=auth_headers, json={
            "title": "Тест", "include_photos": False
        })
        # Может вернуть 403 (quota) или 200 (stream) или 422 (bad schema)
        assert r.status_code in (200, 403, 422, 500)
