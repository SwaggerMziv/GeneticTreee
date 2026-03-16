"""Integration тесты для users endpoints."""
import pytest
from tests.helpers import create_test_user


@pytest.mark.integration
class TestCreateUser:
    async def test_create_success(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "newuser", "password": "NewPass123!"
        })
        assert r.status_code == 201
        assert r.json()["username"] == "newuser"

    async def test_duplicate_username(self, client, test_user):
        r = await client.post("/api/v1/users/", json={
            "username": "testuser", "password": "NewPass123!"
        })
        assert r.status_code == 409

    async def test_duplicate_email(self, client, test_user):
        r = await client.post("/api/v1/users/", json={
            "username": "unique1", "email": "test@example.com", "password": "NewPass123!"
        })
        assert r.status_code == 409

    async def test_short_username(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "ab", "password": "NewPass123!"
        })
        assert r.status_code == 422

    async def test_long_username(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "a" * 21, "password": "NewPass123!"
        })
        assert r.status_code == 422

    async def test_short_password(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "validusr", "password": "Short1!"
        })
        assert r.status_code == 422

    async def test_cyrillic_password(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "validusr2", "password": "кириллица12"
        })
        assert r.status_code == 422

    async def test_invalid_email(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "validusr3", "email": "notanemail", "password": "NewPass123!"
        })
        assert r.status_code == 422


@pytest.mark.integration
class TestGetUser:
    async def test_get_by_id(self, client, auth_headers, test_user):
        r = await client.get(f"/api/v1/users/{test_user.id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == test_user.id

    async def test_get_not_found(self, client, auth_headers):
        r = await client.get("/api/v1/users/99999", headers=auth_headers)
        assert r.status_code == 404

    async def test_get_no_auth(self, client, test_user):
        r = await client.get(f"/api/v1/users/{test_user.id}")
        assert r.status_code == 401


@pytest.mark.integration
class TestGetUsers:
    async def test_list_default(self, client, auth_headers, test_user):
        r = await client.get("/api/v1/users/", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    async def test_pagination(self, client, auth_headers, test_user):
        r = await client.get("/api/v1/users/", headers=auth_headers, params={"skip": 0, "limit": 1})
        assert r.status_code == 200
        assert len(r.json()) <= 1


@pytest.mark.integration
class TestUpdateUser:
    async def test_update_own_profile(self, client, auth_headers, test_user):
        r = await client.patch("/api/v1/users/me", headers=auth_headers, json={
            "username": "updated", "password": "Updated123!"
        })
        assert r.status_code == 200

    async def test_update_by_superuser(self, client, superuser_headers, test_user):
        r = await client.put(f"/api/v1/users/{test_user.id}", headers=superuser_headers, json={
            "username": "supupdated", "password": "Super123!"
        })
        assert r.status_code == 200

    async def test_update_non_superuser(self, client, auth_headers, other_user):
        r = await client.put(f"/api/v1/users/{other_user.id}", headers=auth_headers, json={
            "username": "hacked", "password": "Hacked123!"
        })
        assert r.status_code == 403


@pytest.mark.integration
class TestSuperuserOperations:
    async def test_toggle_superuser(self, client, superuser_headers, test_user):
        r = await client.patch(
            f"/api/v1/users/{test_user.id}/superuser",
            headers=superuser_headers,
            params={"is_superuser": True}
        )
        assert r.status_code == 200

    async def test_activate_user(self, client, superuser_headers, test_session):
        user = await create_test_user(test_session, username="deact", is_active=False)
        r = await client.patch(f"/api/v1/users/{user.id}/activate", headers=superuser_headers)
        assert r.status_code == 200

    async def test_admin_deactivate(self, client, superuser_headers, test_user):
        r = await client.patch(f"/api/v1/users/{test_user.id}/deactivate", headers=superuser_headers)
        assert r.status_code == 200

    async def test_delete_user(self, client, superuser_headers, test_session):
        user = await create_test_user(test_session, username="todelete")
        r = await client.delete(f"/api/v1/users/{user.id}", headers=superuser_headers)
        assert r.status_code == 200

    async def test_delete_non_superuser(self, client, auth_headers, other_user):
        r = await client.delete(f"/api/v1/users/{other_user.id}", headers=auth_headers)
        assert r.status_code == 403


@pytest.mark.integration
class TestSearchUsers:
    async def test_search_by_username(self, client, auth_headers, test_user):
        r = await client.get("/api/v1/users/search/testuser", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1
