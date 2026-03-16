"""Unit тесты: диспетчеризация событий webhook."""
import pytest

from src.subscription.webhooks import handle_webhook


class _DummyService:
    """Заглушка: для unknown/refund веток сервис не используется."""


@pytest.mark.unit
class TestWebhookHandlerDispatch:
    @pytest.mark.parametrize(
        "event_type",
        [
            "",
            "unknown.event",
            "payment.pending",
            "something",
            "PAYMENT.SUCCEEDED",
            "refund.pending",
            "notification",
            "a.b.c",
            "payment..succeeded",
            "💥",
        ],
    )
    async def test_unknown_event_returns_ignored(self, event_type: str):
        r = await handle_webhook(event_type, {"id": "x"}, _DummyService())
        assert isinstance(r, dict)
        assert r.get("status") == "ignored"
        assert r.get("event") == event_type

    @pytest.mark.parametrize(
        "refund_obj",
        [
            {},
            {"payment_id": "p1"},
            {"payment_id": None},
            {"payment_id": 123},
            {"extra": "x"},
            {"payment_id": "p1", "amount": {"value": "1.00", "currency": "RUB"}},
            {"payment_id": "p1", "metadata": {"user_id": "1"}},
            {"payment_id": "p1", "reason": "test"},
            {"payment_id": "p1", "created_at": "2020-01-01T00:00:00Z"},
            {"payment_id": "p1", "status": "succeeded"},
        ],
    )
    async def test_refund_event_never_500(self, refund_obj: dict):
        r = await handle_webhook("refund.succeeded", refund_obj, _DummyService())
        assert r.get("status") == "ok"
        assert r.get("action") == "refund_processed"

