"""Integration тесты для family relationships endpoints."""
import pytest
from tests.helpers import create_test_relationship


@pytest.mark.integration
class TestCreateRelationship:
    async def test_create_success(self, client, auth_headers, test_user, test_relative, second_relative):
        r = await client.post(f"/api/v1/family/{test_user.id}/relationships", headers=auth_headers, json={
            "from_relative_id": test_relative.id,
            "to_relative_id": second_relative.id,
            "relationship_type": "father"
        })
        assert r.status_code == 200
        assert r.json()["relationship_type"] == "father"

    async def test_invalid_type(self, client, auth_headers, test_user, test_relative, second_relative):
        r = await client.post(f"/api/v1/family/{test_user.id}/relationships", headers=auth_headers, json={
            "from_relative_id": test_relative.id,
            "to_relative_id": second_relative.id,
            "relationship_type": "invalid_type"
        })
        assert r.status_code == 422

    async def test_no_auth(self, client, test_user):
        r = await client.post(f"/api/v1/family/{test_user.id}/relationships", json={
            "from_relative_id": 1, "to_relative_id": 2, "relationship_type": "father"
        })
        assert r.status_code == 401


@pytest.mark.integration
class TestGetRelationships:
    async def test_list(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.get(f"/api/v1/family/{test_user.id}/relationships", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    async def test_get_by_id(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        rel = await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relationships/{rel.id}",
            headers=auth_headers
        )
        assert r.status_code == 200


@pytest.mark.integration
class TestTraversal:
    async def test_get_children(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relationships/children/{test_relative.id}",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_get_parents(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relationships/parents/{second_relative.id}",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_get_siblings(self, client, auth_headers, test_user, test_relative):
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relationships/siblings/{test_relative.id}",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_get_grandparents(self, client, auth_headers, test_user, test_relative):
        r = await client.get(
            f"/api/v1/family/{test_user.id}/relationships/grandparents/{test_relative.id}",
            headers=auth_headers
        )
        assert r.status_code == 200


@pytest.mark.integration
class TestFamilyTree:
    async def test_get_tree(self, client, auth_headers, test_user):
        r = await client.get(f"/api/v1/family/{test_user.id}/family-tree", headers=auth_headers)
        assert r.status_code == 200

    async def test_statistics(self, client, auth_headers, test_user, test_relative):
        r = await client.get(f"/api/v1/family/{test_user.id}/statistics", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_relatives" in data
        assert "total_relationships" in data


@pytest.mark.integration
class TestRelationshipLifecycle:
    async def test_update(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        rel = await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.put(
            f"/api/v1/family/{test_user.id}/relationships/{rel.id}",
            headers=auth_headers,
            json={"relationship_type": "mother"}
        )
        assert r.status_code == 200

    async def test_deactivate(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        rel = await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.patch(
            f"/api/v1/family/{test_user.id}/relationships/{rel.id}/deactivate",
            headers=auth_headers
        )
        assert r.status_code == 200

    async def test_delete(self, client, auth_headers, test_user, test_relative, second_relative, test_session):
        rel = await create_test_relationship(test_session, test_user.id, test_relative.id, second_relative.id)
        r = await client.delete(
            f"/api/v1/family/{test_user.id}/relationships/{rel.id}",
            headers=auth_headers
        )
        assert r.status_code == 200
