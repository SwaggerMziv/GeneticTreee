"""Unit тесты для подписи webhook YooKassa."""
import hmac
import hashlib
import pytest

from starlette.datastructures import Headers

from src.subscription.webhooks import verify_webhook_signature
from src.config import settings


class _FakeRequest:
    def __init__(self, headers: dict[str, str]):
        self.headers = Headers(headers)


@pytest.mark.unit
class TestWebhookSignature:
    @pytest.mark.parametrize(
        "secret,header_present,should_pass",
        [
            (None, False, True),   # секрет не задан -> проверка пропускается
            (None, True, True),
            ("", False, True),
            ("", True, True),
            ("test-secret", False, False),  # нет заголовка -> fail
            ("test-secret", True, True),
        ],
    )
    async def test_signature_verification_matrix(self, monkeypatch, secret, header_present, should_pass):
        body = b'{"event":"payment.succeeded","object":{"id":"1"}}'

        monkeypatch.setattr(settings, "yookassa_webhook_secret", secret)

        headers: dict[str, str] = {}
        if header_present and secret:
            expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
            headers["Content-Hmac"] = expected
        elif header_present and not secret:
            headers["Content-Hmac"] = "anything"

        req = _FakeRequest(headers=headers)
        ok = await verify_webhook_signature(req, body)
        assert ok is should_pass

    async def test_signature_mismatch(self, monkeypatch):
        secret = "test-secret"
        monkeypatch.setattr(settings, "yookassa_webhook_secret", secret)
        body = b'{"event":"payment.succeeded","object":{"id":"1"}}'
        req = _FakeRequest(headers={"Content-Hmac": "bad"})
        assert await verify_webhook_signature(req, body) is False

    async def test_signature_changes_with_body(self, monkeypatch):
        secret = "test-secret"
        monkeypatch.setattr(settings, "yookassa_webhook_secret", secret)

        body1 = b'{"a":1}'
        body2 = b'{"a":2}'
        sig1 = hmac.new(secret.encode(), body1, hashlib.sha256).hexdigest()
        req = _FakeRequest(headers={"Content-Hmac": sig1})
        assert await verify_webhook_signature(req, body1) is True
        assert await verify_webhook_signature(req, body2) is False

