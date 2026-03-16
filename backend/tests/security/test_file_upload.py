"""Security тесты: загрузка файлов."""
import io
import pytest


@pytest.mark.security
class TestFileUpload:
    async def test_malicious_content_type(self, client, auth_headers, seed_plans):
        files = {"file": ("virus.exe", io.BytesIO(b"MZ\x90\x00"), "application/x-executable")}
        r = await client.post("/api/v1/storage/upload", headers=auth_headers, files=files)
        # Должен быть обработан (mock S3 принимает всё), но не 500
        assert r.status_code != 500

    async def test_path_traversal_filename(self, client, auth_headers, seed_plans):
        files = {"file": ("../../etc/passwd", io.BytesIO(b"test"), "image/jpeg")}
        r = await client.post("/api/v1/storage/upload", headers=auth_headers, files=files)
        if r.status_code == 200:
            url = r.json().get("url", "")
            assert "../" not in url

    async def test_zero_byte_file(self, client, auth_headers, seed_plans):
        files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
        r = await client.post("/api/v1/storage/upload", headers=auth_headers, files=files)
        assert r.status_code != 500

    async def test_no_file(self, client, auth_headers):
        r = await client.post("/api/v1/storage/upload", headers=auth_headers)
        assert r.status_code == 422

    async def test_ssrf_proxy_internal(self, client):
        r = await client.get("/api/v1/storage/proxy", params={"url": "http://127.0.0.1:8000/api/v1/users"})
        assert r.status_code == 400

    async def test_ssrf_proxy_file_protocol(self, client):
        r = await client.get("/api/v1/storage/proxy", params={"url": "file:///etc/passwd"})
        assert r.status_code == 400

    async def test_ssrf_proxy_non_https(self, client):
        r = await client.get("/api/v1/storage/proxy", params={"url": "http://s3.twcstorage.ru/file"})
        assert r.status_code == 400

    async def test_story_media_non_image(self, client, auth_headers, test_user, test_relative):
        # Создаём историю сначала
        await client.post(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/stories",
            headers=auth_headers,
            json={"title": "MediaTest", "text": "test"}
        )
        files = {"file": ("script.sh", io.BytesIO(b"#!/bin/bash"), "application/x-sh")}
        r = await client.post(
            f"/api/v1/family/{test_user.id}/relatives/{test_relative.id}/stories/MediaTest/media",
            headers=auth_headers,
            files=files
        )
        # Может быть принято или отклонено, но не 500
        assert r.status_code != 500
