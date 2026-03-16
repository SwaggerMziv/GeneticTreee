"""Security тесты: webhook безопасность."""
import pytest


@pytest.mark.security
class TestWebhookSecurity:
    WEBHOOK_URL = "/api/v1/subscription/webhooks/yookassa"

    async def test_forged_payload(self, client):
        r = await client.post(self.WEBHOOK_URL, json={
            "type": "notification",
            "event": "payment.succeeded",
            "object": {"id": "forged-id", "status": "succeeded"}
        })
        # Должен обработать без crash
        assert r.status_code != 500

    async def test_malformed_json(self, client):
        r = await client.post(
            self.WEBHOOK_URL,
            content=b"{broken json",
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code in (400, 422, 500)

    async def test_empty_object(self, client):
        r = await client.post(self.WEBHOOK_URL, json={
            "type": "notification",
            "event": "payment.succeeded",
            "object": {}
        })
        assert r.status_code != 500

    async def test_injection_in_metadata(self, client):
        r = await client.post(self.WEBHOOK_URL, json={
            "type": "notification",
            "event": "payment.succeeded",
            "object": {
                "id": "test",
                "metadata": {"user_id": "'; DROP TABLE users; --"}
            }
        })
        assert r.status_code != 500

    async def test_missing_event_field(self, client):
        r = await client.post(self.WEBHOOK_URL, json={"type": "notification", "object": {}})
        assert r.status_code in (200, 400, 422)

    async def test_replay_with_same_id(self, client):
        payload = {
            "type": "notification",
            "event": "payment.succeeded",
            "object": {"id": "replay-test-id", "status": "succeeded"}
        }
        r1 = await client.post(self.WEBHOOK_URL, json=payload)
        r2 = await client.post(self.WEBHOOK_URL, json=payload)
        # Второй запрос не должен вызвать crash
        assert r2.status_code != 500
