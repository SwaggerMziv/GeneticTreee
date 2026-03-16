"""Integration тесты для admin endpoints."""
import pytest


@pytest.mark.integration
class TestAdminAccess:
    """Все admin endpoints требуют superuser."""

    ADMIN_ENDPOINTS = [
        ("GET", "/api/v1/admin/dashboard"),
        ("GET", "/api/v1/admin/dashboard/charts"),
        ("GET", "/api/v1/admin/users"),
        ("GET", "/api/v1/admin/relatives"),
        ("GET", "/api/v1/admin/stories"),
        ("GET", "/api/v1/admin/telegram"),
        ("GET", "/api/v1/admin/audit-logs"),
        ("GET", "/api/v1/admin/ai/usage"),
        ("GET", "/api/v1/admin/ai/stats"),
        ("GET", "/api/v1/admin/books"),
        ("GET", "/api/v1/admin/subscriptions"),
        ("GET", "/api/v1/admin/payments"),
        ("GET", "/api/v1/admin/subscription-stats"),
    ]

    @pytest.mark.parametrize("method,url", ADMIN_ENDPOINTS)
    async def test_non_superuser_blocked(self, client, auth_headers, method, url):
        if method == "GET":
            r = await client.get(url, headers=auth_headers)
        else:
            r = await client.post(url, headers=auth_headers)
        assert r.status_code == 403

    @pytest.mark.parametrize("method,url", ADMIN_ENDPOINTS)
    async def test_no_auth_blocked(self, client, method, url):
        if method == "GET":
            r = await client.get(url)
        else:
            r = await client.post(url)
        assert r.status_code in (401, 403)


@pytest.mark.integration
class TestAdminDashboard:
    async def test_dashboard_stats(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/dashboard", headers=superuser_headers)
        assert r.status_code == 200

    async def test_dashboard_charts(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/dashboard/charts", headers=superuser_headers)
        assert r.status_code == 200


@pytest.mark.integration
class TestAdminUsers:
    async def test_users_list(self, client, superuser_headers, test_user):
        r = await client.get("/api/v1/admin/users", headers=superuser_headers)
        assert r.status_code == 200

    async def test_user_relatives(self, client, superuser_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/admin/users/{test_user.id}/relatives", headers=superuser_headers)
        assert r.status_code == 200

    async def test_user_tree(self, client, superuser_headers, test_user):
        r = await client.get(f"/api/v1/admin/users/{test_user.id}/tree", headers=superuser_headers)
        assert r.status_code == 200

    async def test_reset_password(self, client, superuser_headers, test_user):
        r = await client.post(
            f"/api/v1/admin/users/{test_user.id}/reset-password",
            headers=superuser_headers,
            json={"new_password": "NewReset123!"}
        )
        assert r.status_code == 200


@pytest.mark.integration
class TestAdminContent:
    async def test_all_relatives(self, client, superuser_headers, test_relative):
        r = await client.get("/api/v1/admin/relatives", headers=superuser_headers)
        assert r.status_code == 200

    async def test_all_stories(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/stories", headers=superuser_headers)
        assert r.status_code == 200


@pytest.mark.integration
class TestAdminMonitoring:
    async def test_telegram_stats(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/telegram", headers=superuser_headers)
        assert r.status_code == 200

    async def test_audit_logs(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/audit-logs", headers=superuser_headers)
        assert r.status_code == 200

    async def test_ai_usage(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/ai/usage", headers=superuser_headers)
        assert r.status_code == 200

    async def test_ai_stats(self, client, superuser_headers):
        r = await client.get("/api/v1/admin/ai/stats", headers=superuser_headers)
        assert r.status_code == 200


@pytest.mark.integration
class TestAdminSubscriptions:
    async def test_subscriptions_list(self, client, superuser_headers, seed_plans):
        r = await client.get("/api/v1/admin/subscriptions", headers=superuser_headers)
        assert r.status_code == 200

    async def test_payments_list(self, client, superuser_headers, seed_plans):
        r = await client.get("/api/v1/admin/payments", headers=superuser_headers)
        assert r.status_code == 200

    async def test_subscription_stats(self, client, superuser_headers, seed_plans):
        r = await client.get("/api/v1/admin/subscription-stats", headers=superuser_headers)
        assert r.status_code == 200

    async def test_set_user_plan(self, client, superuser_headers, test_user, seed_plans):
        r = await client.post(
            f"/api/v1/admin/users/{test_user.id}/set-plan",
            headers=superuser_headers,
            params={"plan_name": "pro"}
        )
        assert r.status_code == 200
