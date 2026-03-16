"""Integration тесты для storage endpoints."""
import io
import pytest


@pytest.mark.integration
class TestUpload:
    async def test_upload_success(self, client, auth_headers, seed_plans):
        files = {"file": ("test.jpg", io.BytesIO(b"fake image data"), "image/jpeg")}
        r = await client.post("/api/v1/storage/upload", headers=auth_headers, files=files)
        assert r.status_code == 200
        data = r.json()
        assert "url" in data
        assert "key" in data

    async def test_upload_no_auth(self, client):
        files = {"file": ("test.jpg", io.BytesIO(b"data"), "image/jpeg")}
        r = await client.post("/api/v1/storage/upload", files=files)
        assert r.status_code == 401

    async def test_upload_no_file(self, client, auth_headers):
        r = await client.post("/api/v1/storage/upload", headers=auth_headers)
        assert r.status_code == 422


@pytest.mark.integration
class TestProxy:
    async def test_proxy_disallowed_host(self, client):
        r = await client.get("/api/v1/storage/proxy", params={"url": "https://evil.com/file"})
        assert r.status_code == 400

    async def test_proxy_no_url(self, client):
        r = await client.get("/api/v1/storage/proxy")
        assert r.status_code == 422

    async def test_proxy_internal_ip(self, client):
        r = await client.get("/api/v1/storage/proxy", params={"url": "http://127.0.0.1/secret"})
        assert r.status_code == 400

    async def test_proxy_file_protocol(self, client):
        r = await client.get("/api/v1/storage/proxy", params={"url": "file:///etc/passwd"})
        assert r.status_code == 400
