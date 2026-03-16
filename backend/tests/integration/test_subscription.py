"""Integration тесты для subscription endpoints."""
import pytest


@pytest.mark.integration
class TestPlans:
    async def test_get_plans(self, client, seed_plans):
        r = await client.get("/api/v1/subscription/plans")
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 3
        names = [p["name"] for p in plans]
        assert "free" in names
        assert "pro" in names
        assert "premium" in names


@pytest.mark.integration
class TestMySubscription:
    async def test_get_my(self, client, auth_headers, seed_plans):
        r = await client.get("/api/v1/subscription/my", headers=auth_headers)
        assert r.status_code == 200

    async def test_no_auth(self, client):
        r = await client.get("/api/v1/subscription/my")
        assert r.status_code == 401


@pytest.mark.integration
class TestUsage:
    async def test_get_usage(self, client, auth_headers, seed_plans):
        r = await client.get("/api/v1/subscription/usage", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "plan" in data
        assert "quotas" in data
        assert "period_start" in data

    async def test_usage_no_auth(self, client):
        r = await client.get("/api/v1/subscription/usage")
        assert r.status_code == 401


@pytest.mark.integration
class TestPayments:
    async def test_get_payments(self, client, auth_headers, seed_plans):
        r = await client.get("/api/v1/subscription/payments", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    async def test_payments_no_auth(self, client):
        r = await client.get("/api/v1/subscription/payments")
        assert r.status_code == 401


@pytest.mark.integration
class TestCheckoutCancel:
    async def test_checkout_no_auth(self, client):
        r = await client.post("/api/v1/subscription/checkout", json={
            "plan_name": "pro", "billing_period": "monthly", "return_url": "http://test.com"
        })
        assert r.status_code == 401

    async def test_cancel_no_auth(self, client):
        r = await client.post("/api/v1/subscription/cancel")
        assert r.status_code == 401


@pytest.mark.integration
class TestBotQuota:
    async def test_check_unknown_user(self, client, seed_plans):
        r = await client.get("/api/v1/subscription/check-bot-quota/999999999", params={"resource": "ai_requests"})
        assert r.status_code == 200
        assert r.json()["allowed"] is False

    async def test_check_invalid_resource(self, client, seed_plans):
        r = await client.get("/api/v1/subscription/check-bot-quota/1", params={"resource": "fake_resource"})
        assert r.status_code == 200
        assert r.json()["allowed"] is False
