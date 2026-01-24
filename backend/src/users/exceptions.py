from typing import Any
from fastapi import status
from src.exceptions import BaseAppException


class UserException(BaseAppException):
    pass


class UserNotFoundError(UserException):
    def __init__(self, identifier: str, value: Any):
        super().__init__(
            message=f"User with {identifier}={value} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "error_type": "user_not_found",
                "identifier": identifier,
                "value": str(value)
            }
        )


class UserAlreadyExistsError(UserException):
    def __init__(self, field: str, value: Any):
        super().__init__(
            message=f"User with {field}={value} already exists",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "error_type": "user_already_exists",
                "field": field,
                "value": str(value)
            }
        )


class UserInactiveError(UserException):
    def __init__(self, user_id: int):
        super().__init__(
            message=f"User with id={user_id} is inactive",
            status_code=status.HTTP_403_FORBIDDEN,
            details={
                "error_type": "user_inactive",
                "user_id": user_id
            }
        )


