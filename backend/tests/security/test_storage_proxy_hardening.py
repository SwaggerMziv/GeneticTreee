"""Security тесты: расширенный набор SSRF/URL обходов для proxy."""
import pytest


@pytest.mark.security
class TestStorageProxyHardening:
    @pytest.mark.parametrize(
        "url",
        [
            "http://127.0.0.1:8000/",
            "http://localhost/",
            "file:///etc/passwd",
            "ftp://s3.twcstorage.ru/file",
            "gopher://127.0.0.1/",
            "https://example.com/evil",  # wrong host
            "https://s3.twcstorage.ru@evil.com/file",  # userinfo trick
            "https://evil.com@ s3.twcstorage.ru/file",  # malformed
            "https://s3.twcstorage.ru:444/file",  # wrong port (host ok but not in allowlist rules)
            "https://s3.twcstorage.ru.evil.com/file",
        ],
    )
    async def test_proxy_rejects_bad_urls(self, client, url: str):
        r = await client.get("/api/v1/storage/proxy", params={"url": url})
        assert r.status_code == 400

