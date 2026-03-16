"""Unit тесты для иерархии исключений и декораторов."""
import pytest
from unittest.mock import MagicMock

from src.exceptions import (
    BaseAppException,
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
    ResourceInactiveError,
    DatabaseConstraintError,
    DatabaseTimeoutError,
    DatabaseConnectionError,
    DatabaseIntegrityError,
    raise_if_not_found,
    raise_if_inactive,
)


@pytest.mark.unit
class TestExceptionHierarchy:
    async def test_base_exception_defaults(self):
        exc = BaseAppException("test error")
        assert exc.message == "test error"
        assert exc.status_code == 500
        assert exc.details == {}

    async def test_base_exception_custom(self):
        exc = BaseAppException("custom", status_code=418, details={"key": "val"})
        assert exc.status_code == 418
        assert exc.details == {"key": "val"}

    async def test_resource_not_found(self):
        exc = ResourceNotFoundError("User", 42)
        assert exc.status_code == 404
        assert "User" in exc.message
        assert "42" in exc.message
        assert exc.details["error_type"] == "not_found"

    async def test_resource_already_exists(self):
        exc = ResourceAlreadyExistsError("User", "email", "test@test.com")
        assert exc.status_code == 409
        assert exc.details["error_type"] == "already_exists"

    async def test_resource_inactive(self):
        exc = ResourceInactiveError("User", 1)
        assert exc.status_code == 410
        assert exc.details["error_type"] == "inactive"

    async def test_database_constraint(self):
        exc = DatabaseConstraintError("unique_username")
        assert exc.status_code == 409
        assert "unique_username" in exc.message

    async def test_database_timeout(self):
        exc = DatabaseTimeoutError("get_user")
        assert exc.status_code == 500
        assert "get_user" in exc.message

    async def test_database_connection(self):
        exc = DatabaseConnectionError()
        assert exc.status_code == 500

    async def test_database_integrity(self):
        exc = DatabaseIntegrityError("duplicate key")
        assert exc.status_code == 500


@pytest.mark.unit
class TestHelperFunctions:
    async def test_raise_if_not_found_none(self):
        with pytest.raises(ResourceNotFoundError):
            raise_if_not_found(None, "User", 1)

    async def test_raise_if_not_found_found(self):
        obj = {"id": 1}
        result = raise_if_not_found(obj, "User", 1)
        assert result == obj

    async def test_raise_if_inactive_active(self):
        obj = MagicMock()
        obj.is_active = True
        result = raise_if_inactive(obj, "User")
        assert result == obj

    async def test_raise_if_inactive_inactive(self):
        obj = MagicMock()
        obj.is_active = False
        obj.id = 1
        with pytest.raises(ResourceInactiveError):
            raise_if_inactive(obj, "User")

    async def test_raise_if_inactive_no_attr(self):
        """Объект без is_active не вызывает исключения."""
        obj = object()
        result = raise_if_inactive(obj, "User")
        assert result == obj
