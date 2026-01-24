from functools import wraps
from typing import Optional, Any, Callable, ParamSpec, TypeVar
from fastapi import HTTPException, status
from src.core.logger import get_logger
from sqlalchemy.exc import (
    IntegrityError,
    DataError,
    DatabaseError,
    OperationalError,
    TimeoutError as SQLAlchemyTimeoutError,
    DisconnectionError,
    InvalidRequestError,
    ProgrammingError,
    StatementError,
)

P = ParamSpec('P')
T = TypeVar('T')

logger = get_logger(__name__)

class BaseAppException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[dict] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=self.status_code,
            detail={
                "message": self.message,
                "details": self.details
            }
        )


class DatabaseException(BaseAppException):
    def __init__(self, message: str, original_error: Optional[Exception] = None, details: Optional[dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details or {}
        )
        self.original_error = original_error
        if original_error:
            self.details['original_error'] = str(original_error)


class DatabaseConnectionError(DatabaseException):
    def __init__(self, original_error: Optional[Exception] = None):
        super().__init__(
            message="Failed to connect to database",
            original_error=original_error,
            details={"error_type": "connection_error"}
        )


class DatabaseTimeoutError(DatabaseException):
    def __init__(self, operation: str, original_error: Optional[Exception] = None):
        super().__init__(
            message=f"Database operation '{operation}' timed out",
            original_error=original_error,
            details={"error_type": "timeout_error", "operation": operation}
        )


class DatabaseConstraintError(DatabaseException):
    def __init__(self, constraint: str, original_error: Optional[Exception] = None):
        super().__init__(
            message=f"Database constraint violation: {constraint}",
            original_error=original_error,
            details={"error_type": "constraint_error", "constraint": constraint}
        )


class DatabaseIntegrityError(DatabaseException):
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(
            message=f"Data integrity error: {message}",
            original_error=original_error,
            details={"error_type": "integrity_error"}
        )


class DatabaseDataError(DatabaseException):
    def __init__(self, field: str, original_error: Optional[Exception] = None):
        super().__init__(
            message=f"Invalid data format for field: {field}",
            original_error=original_error,
            details={"error_type": "data_error", "field": field}
        )


class ResourceException(BaseAppException):
    pass


class ResourceNotFoundError(ResourceException):
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            message=f"{resource_type} with id={resource_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "error_type": "not_found",
                "resource_type": resource_type,
                "resource_id": str(resource_id)
            }
        )


class ResourceAlreadyExistsError(ResourceException):
    def __init__(self, resource_type: str, field: str, value: Any):
        super().__init__(
            message=f"{resource_type} with {field}={value} already exists",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "error_type": "already_exists",
                "resource_type": resource_type,
                "field": field,
                "value": str(value)
            }
        )


class ResourceInactiveError(ResourceException):
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            message=f"{resource_type} with id={resource_id} is inactive",
            status_code=status.HTTP_410_GONE,
            details={
                "error_type": "inactive",
                "resource_type": resource_type,
                "resource_id": str(resource_id)
            }
        )



class BulkOperationError(BaseAppException):
    def __init__(self, operation: str, failed_count: int, total_count: int, errors: list):
        super().__init__(
            message=f"Bulk {operation} failed: {failed_count}/{total_count} items",
            status_code=status.HTTP_207_MULTI_STATUS,
            details={
                "error_type": "bulk_operation_error",
                "operation": operation,
                "failed_count": failed_count,
                "total_count": total_count,
                "errors": errors
            }
        )



def handle_database_errors(func: Callable[P, T]) -> Callable[P, T]:
    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        try:
            return await func(*args, **kwargs)

        except IntegrityError as e:
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Integrity error in {func.__name__}: {error_msg}")

            if "unique constraint" in error_msg.lower():
                if "username" in error_msg.lower():
                    raise DatabaseConstraintError("unique_username", e)
                elif "email" in error_msg.lower():
                    raise DatabaseConstraintError("unique_email", e)
                elif "telegram_id" in error_msg.lower():
                    raise DatabaseConstraintError("unique_telegram_id", e)
                else:
                    raise DatabaseConstraintError("unique_constraint", e)

            elif "foreign key" in error_msg.lower():
                raise DatabaseConstraintError("foreign_key_violation", e)

            else:
                raise DatabaseIntegrityError(error_msg, e)

        except DataError as e:
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Data error in {func.__name__}: {error_msg}")
            raise DatabaseDataError("unknown_field", e)

        except (OperationalError, DisconnectionError) as e:
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Connection error in {func.__name__}: {error_msg}")
            raise DatabaseConnectionError(e)

        except SQLAlchemyTimeoutError as e:
            logger.error(f"Timeout in {func.__name__}: {str(e)}")
            raise DatabaseTimeoutError(func.__name__, e)

        except (ProgrammingError, InvalidRequestError, StatementError) as e:
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Programming error in {func.__name__}: {error_msg}")
            raise DatabaseException(f"Database query error: {error_msg}", e)

        except DatabaseError as e:
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Database error in {func.__name__}: {error_msg}")
            raise DatabaseException(f"Database error: {error_msg}", e)

        except BaseAppException:
            raise

        except Exception as e:
            logger.exception(f"Unexpected error in {func.__name__}: {str(e)}")
            raise DatabaseException(f"Unexpected error: {str(e)}", e)

    return wrapper


def handle_not_found(resource_type: str):
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            result = await func(*args, **kwargs)
            if result is None:
                resource_id = kwargs.get('id') or (args[1] if len(args) > 1 else 'unknown')
                raise ResourceNotFoundError(resource_type, resource_id)
            return result
        return wrapper
    return decorator



def validate_active_status(func: Callable[P, T]) -> Callable[P, T]:
    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        result = await func(*args, **kwargs)
        if result and hasattr(result, 'is_active') and not result.is_active:
            resource_type = result.__class__.__name__.replace('Model', '')
            resource_id = getattr(result, 'id', 'unknown')
            raise ResourceInactiveError(resource_type, resource_id)
        return result
    return wrapper


def raise_if_not_found(result: Optional[Any], resource_type: str, resource_id: Any) -> Any:
    if result is None:
        raise ResourceNotFoundError(resource_type, resource_id)
    return result


def raise_if_inactive(result: Any, resource_type: str) -> Any:
    if result and hasattr(result, 'is_active') and not result.is_active:
        resource_id = getattr(result, 'id', 'unknown')
        raise ResourceInactiveError(resource_type, resource_id)
    return result

