"""Unit тесты: извлечение реального IP для rate limiting."""
import pytest

from starlette.requests import Request
from starlette.types import Scope

from src.core.middleware import _get_real_ip


def _make_request(headers: dict[str, str]) -> Request:
    scope: Scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "query_string": b"",
        "server": ("testserver", 80),
        "client": ("192.0.2.1", 1234),
        "scheme": "http",
        "root_path": "",
        "http_version": "1.1",
    }
    return Request(scope)


@pytest.mark.unit
class TestIpExtraction:
    def test_prefers_x_forwarded_for_first_ip(self):
        r = _make_request({"X-Forwarded-For": "1.2.3.4, 5.6.7.8"})
        assert _get_real_ip(r) == "1.2.3.4"

    def test_uses_x_real_ip(self):
        r = _make_request({"X-Real-IP": "9.9.9.9"})
        assert _get_real_ip(r) == "9.9.9.9"

    def test_falls_back_to_remote_address(self):
        r = _make_request({})
        assert _get_real_ip(r) == "192.0.2.1"

    @pytest.mark.parametrize(
        "xff,expected",
        [
            (" 1.1.1.1 ", "1.1.1.1"),
            ("1.1.1.1,2.2.2.2", "1.1.1.1"),
            ("1.1.1.1, 2.2.2.2, 3.3.3.3", "1.1.1.1"),
        ],
    )
    def test_xff_variants(self, xff: str, expected: str):
        r = _make_request({"X-Forwarded-For": xff, "X-Real-IP": "8.8.8.8"})
        assert _get_real_ip(r) == expected

