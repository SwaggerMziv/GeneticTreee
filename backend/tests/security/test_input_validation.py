"""Security тесты: валидация граничных значений."""
import uuid
import pytest


@pytest.mark.security
class TestUsernameValidation:
    @pytest.mark.parametrize("username,expected", [
        ("ab", 422),
        ("abc", 201),
        ("a" * 20, 201),
        ("a" * 21, 422),
    ])
    async def test_username_length(self, client, username, expected):
        r = await client.post("/api/v1/users/", json={
            "username": username, "password": "TestPass123!"
        })
        assert r.status_code == expected


@pytest.mark.security
class TestPasswordValidation:
    @pytest.mark.parametrize("password,expected", [
        ("Short1!", 422),
        ("ValidP123!", 201),
        ("a" * 33, 422),
        ("кириллица1", 422),
    ])
    async def test_password_rules(self, client, password, expected):
        uname = f"u{uuid.uuid4().hex[:10]}"
        r = await client.post("/api/v1/users/", json={
            "username": uname, "password": password
        })
        assert r.status_code == expected


@pytest.mark.security
class TestEmailValidation:
    async def test_invalid_email(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "emailtest", "email": "notanemail", "password": "TestPass123!"
        })
        assert r.status_code == 422

    async def test_valid_email(self, client):
        r = await client.post("/api/v1/users/", json={
            "username": "emailok", "email": "valid@email.com", "password": "TestPass123!"
        })
        assert r.status_code == 201


@pytest.mark.security
class TestEnumValidation:
    async def test_invalid_gender(self, client, auth_headers, test_user, seed_plans):
        r = await client.post(
            f"/api/v1/family/{test_user.id}/relatives",
            headers=auth_headers,
            json={"first_name": "Test", "gender": "invalid_gender"}
        )
        assert r.status_code == 422

    async def test_invalid_relationship_type(self, client, auth_headers, test_user, test_relative, second_relative):
        r = await client.post(
            f"/api/v1/family/{test_user.id}/relationships",
            headers=auth_headers,
            json={
                "from_relative_id": test_relative.id,
                "to_relative_id": second_relative.id,
                "relationship_type": "invalid_type"
            }
        )
        assert r.status_code == 422


@pytest.mark.security
class TestPaginationValidation:
    async def test_negative_skip(self, client, auth_headers):
        r = await client.get("/api/v1/users/", headers=auth_headers, params={"skip": -1})
        assert r.status_code != 500

    async def test_zero_limit(self, client, auth_headers):
        r = await client.get("/api/v1/users/", headers=auth_headers, params={"limit": 0})
        assert r.status_code != 500

    async def test_huge_limit(self, client, auth_headers):
        r = await client.get("/api/v1/users/", headers=auth_headers, params={"limit": 999999})
        assert r.status_code != 500


@pytest.mark.security
class TestBotRelativeValidation:
    async def test_birth_year_too_low(self, client, test_relative):
        r = await client.post("/api/v1/family/relatives/create-from-bot", json={
            "interviewer_relative_id": test_relative.id,
            "first_name": "Test", "birth_year": 1799,
            "gender": "male", "relationship_type": "father"
        })
        assert r.status_code == 422

    async def test_birth_year_too_high(self, client, test_relative):
        r = await client.post("/api/v1/family/relatives/create-from-bot", json={
            "interviewer_relative_id": test_relative.id,
            "first_name": "Test", "birth_year": 2101,
            "gender": "male", "relationship_type": "father"
        })
        assert r.status_code == 422

    async def test_birth_year_valid_boundary(self, client, test_relative):
        r = await client.post("/api/v1/family/relatives/create-from-bot", json={
            "interviewer_relative_id": test_relative.id,
            "first_name": "Boundary", "birth_year": 1800,
            "gender": "male", "relationship_type": "father"
        })
        assert r.status_code == 200
