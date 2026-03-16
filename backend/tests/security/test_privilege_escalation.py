"""Security тесты: эскалация привилегий."""
import pytest


@pytest.mark.security
class TestPrivilegeEscalation:
    async def test_non_superuser_toggle_superuser(self, client, auth_headers, test_user):
        r = await client.patch(
            f"/api/v1/users/{test_user.id}/superuser",
            headers=auth_headers,
            params={"is_superuser": True}
        )
        assert r.status_code == 403

    async def test_non_superuser_delete_user(self, client, auth_headers, other_user):
        r = await client.delete(f"/api/v1/users/{other_user.id}", headers=auth_headers)
        assert r.status_code == 403

    async def test_non_superuser_activate_other(self, client, auth_headers, other_user):
        r = await client.patch(f"/api/v1/users/{other_user.id}/activate", headers=auth_headers)
        assert r.status_code == 403

    async def test_non_superuser_deactivate_other(self, client, auth_headers, other_user):
        r = await client.patch(f"/api/v1/users/{other_user.id}/deactivate", headers=auth_headers)
        assert r.status_code == 403

    async def test_non_superuser_update_other(self, client, auth_headers, other_user):
        r = await client.put(
            f"/api/v1/users/{other_user.id}",
            headers=auth_headers,
            json={"username": "hacked", "password": "Hacked123!"}
        )
        assert r.status_code == 403

    async def test_non_superuser_admin_dashboard(self, client, auth_headers):
        r = await client.get("/api/v1/admin/dashboard", headers=auth_headers)
        assert r.status_code == 403

    async def test_non_superuser_admin_users(self, client, auth_headers):
        r = await client.get("/api/v1/admin/users", headers=auth_headers)
        assert r.status_code == 403

    async def test_non_superuser_set_plan(self, client, auth_headers, test_user, seed_plans):
        r = await client.post(
            f"/api/v1/admin/users/{test_user.id}/set-plan",
            headers=auth_headers,
            params={"plan_name": "premium"}
        )
        assert r.status_code == 403

    async def test_non_superuser_reset_password(self, client, auth_headers, other_user):
        r = await client.post(
            f"/api/v1/admin/users/{other_user.id}/reset-password",
            headers=auth_headers,
            json={"new_password": "Hacked123!"}
        )
        assert r.status_code == 403

    async def test_non_superuser_delete_story_admin(self, client, auth_headers):
        r = await client.delete("/api/v1/admin/relatives/1/stories/test", headers=auth_headers)
        assert r.status_code == 403
