"""Unit тесты для валидации username в схемах пользователей."""
import pytest

from pydantic import ValidationError

from src.users.schemas import UserCreateSchema, UserUpdateSchema


@pytest.mark.unit
class TestUsernameValidation:
    @pytest.mark.parametrize(
        "username",
        [
            "abc",
            "user_1",
            "USER_1",
            "user-1",
            "u" * 20,
            "имя_123",  # unicode word chars
            "тест-тест",
            "a_b-c_d-e",
        ],
    )
    def test_valid_usernames_create(self, username: str):
        s = UserCreateSchema(username=username, password="TestPass123!")
        assert s.username == username

    @pytest.mark.parametrize(
        "username",
        [
            "ab",  # too short
            "a" * 21,  # too long
            " space",
            "has space",
            "tab\tname",
            "newline\nname",
            "semi;colon",
            "quote\"name",
            "slash/name",
            "back\\slash",
            "../etc",
            "<script>",
            "😀😀😀",
            "user.name",
            "user@name",
            "user:name",
            "user,name",
            "user#name",
            "user%name",
        ],
    )
    def test_invalid_usernames_create(self, username: str):
        with pytest.raises(ValidationError):
            UserCreateSchema(username=username, password="TestPass123!")

    @pytest.mark.parametrize(
        "username",
        [
            "abc",
            "user_1",
            "user-1",
            "имя_123",
            "u" * 20,
        ],
    )
    def test_valid_usernames_update(self, username: str):
        s = UserUpdateSchema(username=username, password="TestPass123!", is_active=True)
        assert s.username == username

    @pytest.mark.parametrize(
        "username",
        [
            "ab",
            "a" * 21,
            "has space",
            "<script>alert(1)</script>",
            "' OR 1=1 --",
        ],
    )
    def test_invalid_usernames_update(self, username: str):
        with pytest.raises(ValidationError):
            UserUpdateSchema(username=username, password="TestPass123!", is_active=True)

