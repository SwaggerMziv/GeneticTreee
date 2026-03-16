"""Integration тесты для YooKassa webhook."""
import pytest


@pytest.mark.integration
class TestWebhook:
    WEBHOOK_URL = "/api/v1/subscription/webhooks/yookassa"

    async def test_malformed_body(self, client):
        r = await client.post(self.WEBHOOK_URL, content=b"not json", headers={"Content-Type": "application/json"})
        assert r.status_code in (400, 422, 500)

    async def test_empty_body(self, client):
        r = await client.post(self.WEBHOOK_URL, json={})
        # Может быть 400 (invalid webhook) или 200 (ignored event)
        assert r.status_code in (200, 400, 422)

    async def test_unknown_event(self, client):
        r = await client.post(self.WEBHOOK_URL, json={
            "type": "notification",
            "event": "some.unknown.event",
            "object": {"id": "test"}
        })
        assert r.status_code in (200, 400)

    async def test_payment_succeeded_fake(self, client):
        r = await client.post(self.WEBHOOK_URL, json={
            "type": "notification",
            "event": "payment.succeeded",
            "object": {
                "id": "fake-payment-id",
                "status": "succeeded",
                "amount": {"value": "299.00", "currency": "RUB"},
                "metadata": {"user_id": "1"}
            }
        })
        # Обработчик должен обработать или вернуть ошибку, но не 500
        assert r.status_code != 500

    async def test_payment_cancelled(self, client):
        r = await client.post(self.WEBHOOK_URL, json={
            "type": "notification",
            "event": "payment.canceled",
            "object": {
                "id": "fake-cancelled-id",
                "status": "canceled",
            }
        })
        assert r.status_code != 500
