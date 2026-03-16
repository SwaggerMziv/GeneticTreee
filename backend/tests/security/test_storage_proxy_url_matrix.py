"""Security тесты: большая матрица URL для storage proxy."""
import pytest


@pytest.mark.security
class TestStorageProxyUrlMatrix:
    @pytest.mark.parametrize(
        "url",
        [
            # scheme
            "http://s3.twcstorage.ru/file",
            "file:///etc/passwd",
            "ftp://s3.twcstorage.ru/file",
            "ws://s3.twcstorage.ru/file",
            "wss://s3.twcstorage.ru/file",
            # host tricks
            "https://example.com/file",
            "https://s3.twcstorage.ru.evil.com/file",
            "https://evil.com/s3.twcstorage.ru/file",
            "https://s3.twcstorage.ru@evil.com/file",
            "https://%73%33.twcstorage.ru/file",  # encoded host should not match allowlist
            # ports
            "https://s3.twcstorage.ru:444/file",
            "https://s3.twcstorage.ru:80/file",
            "https://s3.twcstorage.ru:0/file",
            # localhost-ish
            "https://127.0.0.1/file",
            "https://[::1]/file",
            "https://localhost/file",
            # whitespace / control
            "https://s3.twcstorage.ru/%0d%0aInjected:1",
            "https://s3.twcstorage.ru/%00",
            # protocol-relative / malformed
            "//s3.twcstorage.ru/file",
            "https:///s3.twcstorage.ru/file",
        ]
        + [
            # a bunch of obvious bad hosts
            f"https://bad{i}.twcstorage.ru/file" for i in range(1, 31)
        ],
    )
    async def test_proxy_rejects_url(self, client, url: str):
        r = await client.get("/api/v1/storage/proxy", params={"url": url})
        assert r.status_code == 400

