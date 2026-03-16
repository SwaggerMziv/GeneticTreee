"""Unit тесты для исключений подписок."""
import pytest

from src.subscription.exceptions import (
    QuotaExceededError,
    PaymentFailedError,
    SubscriptionNotFoundError,
    PlanNotFoundError,
    InvalidWebhookError,
    AlreadySubscribedError,
)


@pytest.mark.unit
class TestSubscriptionExceptions:
    async def test_quota_exceeded(self):
        exc = QuotaExceededError(resource="AI-запросы", limit=10, used=10)
        assert exc.status_code == 403
        assert exc.details["error_type"] == "quota_exceeded"
        assert exc.details["limit"] == 10
        assert exc.details["used"] == 10

    async def test_payment_failed(self):
        exc = PaymentFailedError("card declined", payment_id="pay_123")
        assert exc.status_code == 402
        assert exc.details["payment_id"] == "pay_123"

    async def test_subscription_not_found(self):
        exc = SubscriptionNotFoundError(user_id=42)
        assert exc.status_code == 404
        assert "42" in str(exc.details.get("user_id", ""))

    async def test_plan_not_found(self):
        exc = PlanNotFoundError(plan_name="ultra")
        assert exc.status_code == 404

    async def test_invalid_webhook(self):
        exc = InvalidWebhookError("bad signature")
        assert exc.status_code == 400
        assert "bad signature" in exc.details.get("reason", "")

    async def test_already_subscribed(self):
        exc = AlreadySubscribedError("pro")
        assert exc.status_code == 409
        assert "pro" in exc.details.get("plan_name", "")
