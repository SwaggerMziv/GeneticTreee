"""Unit тесты для правил паролей в UserCreateSchema/UserUpdateSchema."""
import pytest
from pydantic import ValidationError

from src.users.schemas import UserCreateSchema, UserUpdateSchema


@pytest.mark.unit
class TestPasswordValidationExtended:
    @pytest.mark.parametrize(
        "password",
        [
            "TestPass123!",
            "With Spaces 123!",
            "!@#$%^&*()_+-=[]{};':\"\\|,.",
            "12345678",
            "Aa1!Aa1!",
            "Z" * 32,
        ],
    )
    def test_password_accepts_allowed_chars(self, password: str):
        s = UserCreateSchema(username="valid_user", password=password)
        assert s.password == password

    @pytest.mark.parametrize(
        "password",
        [
            "пароль123",  # non-ascii
            "密码12345678",
            "with\nnewline",
            "with\ttab",
            "emoji😀pass",
            "zero\u0000byte",
            "\u200bhidden",  # zero-width space
            "line\u2028sep",
        ],
    )
    def test_password_rejects_non_ascii_or_control(self, password: str):
        with pytest.raises(ValidationError):
            UserCreateSchema(username="valid_user", password=password)

    @pytest.mark.parametrize(
        "password",
        [
            "short1!",  # < 8
            "",
        ],
    )
    def test_password_length_enforced(self, password: str):
        with pytest.raises(ValidationError):
            UserCreateSchema(username="valid_user", password=password)

    @pytest.mark.parametrize(
        "password",
        [
            "A" * 33,
            "B" * 200,
        ],
    )
    def test_password_max_length_enforced(self, password: str):
        with pytest.raises(ValidationError):
            UserUpdateSchema(username="valid_user", password=password, is_active=True)

