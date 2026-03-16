"""Integration тесты: дополнительные кейсы webhook YooKassa."""
import pytest


@pytest.mark.integration
class TestWebhookMoreCases:
    WEBHOOK_URL = "/api/v1/subscription/webhooks/yookassa"

    @pytest.mark.parametrize(
        "payload",
        [
            {"event": None, "object": {}},
            {"event": "", "object": {}},
            {"event": "payment.succeeded", "object": {"id": "x", "metadata": {}}},
            {"event": "payment.succeeded", "object": {"id": "x", "metadata": {"user_id": "not-int"}}},
            {"event": "payment.succeeded", "object": {"id": None, "metadata": {"user_id": "1"}}},
            {"event": "payment.canceled", "object": {"id": "x"}},
            {"event": "refund.succeeded", "object": {"payment_id": "x"}},
            {"event": "unknown.event", "object": {"id": "x"}},
        ],
    )
    async def test_webhook_payloads_do_not_500(self, client, payload):
        r = await client.post(self.WEBHOOK_URL, json=payload)
        assert r.status_code != 500

