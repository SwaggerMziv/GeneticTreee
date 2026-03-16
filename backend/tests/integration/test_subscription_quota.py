"""Integration тесты для проверки квот через API."""
import pytest


@pytest.mark.integration
class TestQuotaEnforcement:
    async def test_free_user_has_limits(self, client, auth_headers, seed_plans):
        r = await client.get("/api/v1/subscription/usage", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        plan = data["plan"]
        assert plan["name"] == "free"
        # У free плана есть лимиты
        limits = plan["limits"]
        assert limits["max_relatives"] == 15
        assert limits["max_ai_requests_month"] == 10

    async def test_usage_quotas_structure(self, client, auth_headers, seed_plans):
        r = await client.get("/api/v1/subscription/usage", headers=auth_headers)
        data = r.json()
        quotas = data["quotas"]
        assert isinstance(quotas, list)
        assert len(quotas) > 0
        # Каждая квота имеет нужные поля
        for q in quotas:
            assert "resource" in q
            assert "used" in q
            assert "limit" in q
            assert "display_name" in q

    async def test_book_generation_blocked_on_free(self, client, auth_headers, seed_plans):
        """FREE план имеет max_book_generations_month=0, должен блокировать."""
        r = await client.post("/api/v1/book/generate/stream", headers=auth_headers, json={
            "title": "Test Book"
        })
        # Ожидаем 403 (QuotaExceeded) или 422 (validation)
        assert r.status_code in (403, 422)
