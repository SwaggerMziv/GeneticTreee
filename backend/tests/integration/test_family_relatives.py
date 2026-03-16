"""Integration тесты для family relatives endpoints."""
import pytest
from tests.helpers import create_test_relative


@pytest.mark.integration
class TestCreateRelative:
    async def test_create_success(self, client, auth_headers, test_user, seed_plans):
        r = await client.post(f"/api/v1/family/{test_user.id}/relatives", headers=auth_headers, json={
            "first_name": "Пётр", "last_name": "Петров", "gender": "male"
        })
        assert r.status_code == 200
        assert r.json()["first_name"] == "Пётр"

    async def test_create_minimal(self, client, auth_headers, test_user, seed_plans):
        r = await client.post(f"/api/v1/family/{test_user.id}/relatives", headers=auth_headers, json={
            "first_name": "Минимал"
        })
        assert r.status_code == 200

    async def test_create_all_fields(self, client, auth_headers, test_user, seed_plans):
        r = await client.post(f"/api/v1/family/{test_user.id}/relatives", headers=auth_headers, json={
            "first_name": "Полный", "last_name": "Набор", "middle_name": "Данных",
            "gender": "female", "contact_info": "+7999", "generation": 1
        })
        assert r.status_code == 200
        data = r.json()
        assert data["first_name"] == "Полный"
        assert data["middle_name"] == "Данных"

    async def test_create_no_auth(self, client, test_user):
        r = await client.post(f"/api/v1/family/{test_user.id}/relatives", json={
            "first_name": "NoAuth"
        })
        assert r.status_code == 401


@pytest.mark.integration
class TestGetRelatives:
    async def test_list(self, client, auth_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/family/{test_user.id}/relatives", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    async def test_get_by_id(self, client, auth_headers, test_user, test_relative):
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}",
            headers=auth_headers
        )
        assert r.status_code == 200
        assert r.json()["id"] == test_relative.id

    async def test_alive(self, client, auth_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/family/{test_user.id}/relatives/alive", headers=auth_headers)
        assert r.status_code == 200

    async def test_deceased(self, client, auth_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/family/{test_user.id}/relatives/deceased", headers=auth_headers)
        assert r.status_code == 200

    async def test_search(self, client, auth_headers, test_user, test_relative):
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relatives/search/Иван",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_by_gender(self, client, auth_headers, test_user, test_relative):
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relatives/gender/male",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_activated(self, client, auth_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/family/{test_user.id}/relatives/activated", headers=auth_headers)
        assert r.status_code == 200

    async def test_not_activated(self, client, auth_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/family/{test_user.id}/relatives/not-activated", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1


@pytest.mark.integration
class TestUpdateRelative:
    async def test_update_success(self, client, auth_headers, test_user, test_relative):
        r = await client.put(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}",
            headers=auth_headers,
            json={"first_name": "Обновлён", "gender": "male"}
        )
        assert r.status_code == 200
        assert r.json()["first_name"] == "Обновлён"


@pytest.mark.integration
class TestContext:
    async def test_update_context(self, client, auth_headers, test_user, test_relative):
        r = await client.patch(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/context",
            headers=auth_headers,
            json={"key": "test_key", "value": "test_value"}
        )
        assert r.status_code == 200

    async def test_get_context(self, client, auth_headers, test_user, test_relative):
        # Сначала создадим ключ
        await client.patch(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/context",
            headers=auth_headers,
            json={"key": "mykey", "value": "myval"}
        )
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/context",
            headers=auth_headers
        )
        assert r.status_code == 200
        assert "mykey" in r.json().get("context", {})

    async def test_delete_context_key(self, client, auth_headers, test_user, test_relative):
        # Создаём и удаляем ключ
        await client.patch(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/context",
            headers=auth_headers,
            json={"key": "toremove", "value": "val"}
        )
        r = await client.patch(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/context",
            headers=auth_headers,
            json={"key": "toremove", "value": None}
        )
        assert r.status_code == 200


@pytest.mark.integration
class TestRelativeLifecycle:
    async def test_deactivate(self, client, auth_headers, test_user, test_relative):
        r = await client.patch(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/deactivate",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_activate(self, client, auth_headers, test_user, test_relative):
        r = await client.patch(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/activate",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_delete(self, client, auth_headers, test_user, test_session):
        rel = await create_test_relative(test_session, test_user.id, first_name="ToDelete")
        r = await client.delete(
            f"/api/v1/family/{test_user.id}/relatives/{rel.id}",
            headers=auth_headers
        )
        assert r.status_code == 200
