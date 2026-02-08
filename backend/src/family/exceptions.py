from typing import Optional
from fastapi import status
from src.exceptions import BaseAppException

class ValidationException(BaseAppException):
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[dict] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details or {}
        )
        if field:
            self.details['field'] = field


class InvalidDateRangeError(ValidationException):
    def __init__(self, start_field: str, end_field: str):
        super().__init__(
            message=f"{start_field} must be before {end_field}",
            details={
                "error_type": "invalid_date_range",
                "start_field": start_field,
                "end_field": end_field
            }
        )


class FamilyRelationException(BaseAppException):
    pass


class RelativeNotFoundError(FamilyRelationException):
    def __init__(self, relative_id: int):
        super().__init__(
            message=f"Relative with id={relative_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "error_type": "relative_not_found",
                "relative_id": relative_id
            }
        )


class RelativeAccessDeniedError(FamilyRelationException):
    def __init__(self, relative_id: int, user_id: int):
        super().__init__(
            message=f"User {user_id} has no access to relative {relative_id}",
            status_code=status.HTTP_403_FORBIDDEN,
            details={
                "error_type": "access_denied",
                "relative_id": relative_id,
                "user_id": user_id
            }
        )


class RelationshipException(BaseAppException):
    pass


class RelationshipNotFoundError(RelationshipException):
    def __init__(self, relationship_id: int):
        super().__init__(
            message=f"Relationship with id={relationship_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "error_type": "relationship_not_found",
                "relationship_id": relationship_id
            }
        )


class RelationshipAlreadyExistsError(RelationshipException):
    def __init__(self, from_id: int, to_id: int):
        super().__init__(
            message=f"Relationship between {from_id} and {to_id} already exists",
            status_code=status.HTTP_409_CONFLICT,
            details={
                "error_type": "relationship_already_exists",
                "from_relative_id": from_id,
                "to_relative_id": to_id
            }
        )


class RelationshipSelfReferenceError(RelationshipException):
    def __init__(self, relative_id: int):
        super().__init__(
            message=f"Cannot create relationship: relative {relative_id} cannot be related to itself",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={
                "error_type": "self_reference",
                "relative_id": relative_id
            }
        )


class RelationshipInvalidTypeError(RelationshipException):
    def __init__(self, relationship_type: str):
        super().__init__(
            message=f"Invalid relationship type: {relationship_type}",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={
                "error_type": "invalid_type",
                "relationship_type": relationship_type
            }
        )


# ===== INVITATION SYSTEM EXCEPTIONS =====

class InvalidInvitationTokenError(FamilyRelationException):
    def __init__(self):
        super().__init__(
            message="Invalid or expired invitation token",
            status_code=status.HTTP_404_NOT_FOUND,
            details={
                "error_type": "invalid_invitation_token"
            }
        )


class RelativeAlreadyActivatedError(FamilyRelationException):
    def __init__(self, relative_id: int):
        super().__init__(
            message=f"Relative with id={relative_id} is already activated",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={
                "error_type": "relative_already_activated",
                "relative_id": relative_id
            }
        )


class TelegramUserAlreadyLinkedError(FamilyRelationException):
    def __init__(self, telegram_user_id: int):
        super().__init__(
            message=f"Telegram user {telegram_user_id} is already linked to another relative",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={
                "error_type": "telegram_user_already_linked",
                "telegram_user_id": telegram_user_id
            }
        )

