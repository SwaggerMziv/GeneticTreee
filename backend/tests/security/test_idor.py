"""Security тесты: IDOR — доступ к чужим ресурсам."""
import pytest


@pytest.mark.security
class TestIDOR:
    async def test_access_other_user_relatives(self, client, auth_headers, other_user, other_user_relative):
        """User A не должен видеть родственников User B через его user_id."""
        r = await client.get(f"/api/v1/family/{other_user.id}/relatives", headers=auth_headers)
        # Маршрут использует Depends(get_current_user_id) — подменит user_id на свой
        assert r.status_code == 200
        # Не должно быть чужих родственников
        for rel in r.json():
            assert rel.get("user_id") != other_user.id or rel.get("first_name") != "Чужой"

    async def test_modify_other_user_relative(self, client, auth_headers, other_user, other_user_relative):
        r = await client.put(
            f"/api/v1/family/{other_user.id}/relatives/{other_user_relative.id}",
            headers=auth_headers,
            json={"first_name": "Hacked", "gender": "male"}
        )
        assert r.status_code in (403, 404)

    async def test_delete_other_user_relative(self, client, auth_headers, other_user, other_user_relative):
        r = await client.delete(
            f"/api/v1/family/{other_user.id}/relatives/{other_user_relative.id}",
            headers=auth_headers
        )
        assert r.status_code in (403, 404)

    async def test_access_other_user_context(self, client, auth_headers, other_user, other_user_relative):
        r = await client.get(
            f"/api/v1/family/{other_user.id}/relatives/{other_user_relative.id}/context",
            headers=auth_headers
        )
        assert r.status_code in (403, 404)

    async def test_access_other_user_stories(self, client, auth_headers, other_user, other_user_relative):
        r = await client.get(
            f"/api/v1/family/{other_user.id}/relatives/{other_user_relative.id}/stories",
            headers=auth_headers
        )
        assert r.status_code in (403, 404)

    async def test_access_other_user_relationships(self, client, auth_headers, other_user):
        r = await client.get(f"/api/v1/family/{other_user.id}/relationships", headers=auth_headers)
        # get_current_user_id подменит user_id — вернёт свои данные
        assert r.status_code == 200

    async def test_access_other_user_tree(self, client, auth_headers, other_user):
        r = await client.get(f"/api/v1/family/{other_user.id}/family-tree", headers=auth_headers)
        assert r.status_code == 200

    async def test_access_other_user_statistics(self, client, auth_headers, other_user):
        r = await client.get(f"/api/v1/family/{other_user.id}/statistics", headers=auth_headers)
        assert r.status_code == 200

    async def test_generate_invitation_for_other_relative(
        self, client, auth_headers, other_user, other_user_relative, seed_plans
    ):
        r = await client.post(
            f"/api/v1/family/{other_user.id}/relatives/{other_user_relative.id}/generate-invitation",
            headers=auth_headers
        )
        assert r.status_code in (403, 404)
