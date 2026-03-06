from fastapi import status
from src.exceptions import BaseAppException


class SubscriptionException(BaseAppException):
    """Базовое исключение модуля подписок"""
    pass


class QuotaExceededError(SubscriptionException):
    """Превышен лимит использования ресурса"""
    def __init__(self, resource: str, limit: int, used: int):
        super().__init__(
            message=f"Превышен лимит: {resource}. Использовано {used} из {limit}",
            status_code=status.HTTP_403_FORBIDDEN,
            details={
                "error_type": "quota_exceeded",
                "resource": resource,
                "limit": limit,
                "used": used,
            }
        )


class PaymentFailedError(SubscriptionException):
    """Ошибка при обработке платежа"""
    def __init__(self, message: str, payment_id: str | None = None):
        super().__init__(
            message=f"Ошибка платежа: {message}",
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            details={
                "error_type": "payment_failed",
                "payment_id": payment_id,
            }
        )


class SubscriptionNotFoundError(SubscriptionException):
    """Подписка не найдена"""
    def __init__(self, user_id: int):
        super().__init__(
            message=f"Активная подписка не найдена для пользователя {user_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"error_type": "subscription_not_found", "user_id": str(user_id)}
        )


class PlanNotFoundError(SubscriptionException):
    """Тарифный план не найден"""
    def __init__(self, plan_id: int | None = None, plan_name: str | None = None):
        identifier = plan_id or plan_name
        super().__init__(
            message=f"Тарифный план не найден: {identifier}",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"error_type": "plan_not_found"}
        )


class InvalidWebhookError(SubscriptionException):
    """Невалидный webhook от ЮKassa"""
    def __init__(self, reason: str):
        super().__init__(
            message=f"Невалидный webhook: {reason}",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"error_type": "invalid_webhook", "reason": reason}
        )


class AlreadySubscribedError(SubscriptionException):
    """Пользователь уже подписан на этот план"""
    def __init__(self, plan_name: str):
        super().__init__(
            message=f"У вас уже активна подписка {plan_name}",
            status_code=status.HTTP_409_CONFLICT,
            details={"error_type": "already_subscribed", "plan_name": plan_name}
        )
