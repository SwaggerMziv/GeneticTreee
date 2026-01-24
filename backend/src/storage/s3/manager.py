from aiobotocore.session import get_session
from contextlib import asynccontextmanager
from fastapi import UploadFile
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote
from uuid import uuid4
import mimetypes
import os


class S3Manager:
    def __init__(
        self,
        access_key_id: str,
        secret_access_key: str,
        endpoint_url: str,
        bucket_name: str,
        region_name: str | None = None,
    ):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url.rstrip('/')
        self._session = get_session()
        self._config = {
            "aws_access_key_id": access_key_id,
            "aws_secret_access_key": secret_access_key,
            "endpoint_url": endpoint_url,
            **({"region_name": region_name} if region_name else {}),
        }

    @asynccontextmanager
    async def _client(self):
        async with self._session.create_client("s3", **self._config) as client:
            yield client

    def _get_public_url(self, key: str) -> str:
        return f"{self.endpoint_url}/{self.bucket_name}/{key}"

    def _resolve_content_type(self, filename: str | None, content_type: str | None) -> str:
        return content_type or mimetypes.guess_type(filename or '')[0] or 'application/octet-stream'

    def _generate_key(self, filename: str | None, content_type: str) -> str:
        date_path = datetime.now(timezone.utc).strftime('%Y/%m/%d')
        ext = os.path.splitext(filename or '')[1].lower() or mimetypes.guess_extension(content_type) or ''
        return f"uploads/{date_path}/{uuid4().hex}{ext}"

    def _extract_key_from_url(self, url: str) -> str:
        path = unquote(urlparse(url).path).lstrip('/')
        parts = path.split('/')
        return '/'.join(parts[1:]) if parts[0] == self.bucket_name else path

    async def upload(self, file: UploadFile) -> tuple[str, str, str]:
        """Upload file and return (key, url, content_type)"""
        data = await file.read()
        content_type = self._resolve_content_type(file.filename, file.content_type)
        key = self._generate_key(file.filename, content_type)

        async with self._client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
                ACL="public-read",
            )

        return key, self._get_public_url(key), content_type

    async def delete(self, url: str) -> None:
        """Delete object by its public URL"""
        async with self._client() as client:
            await client.delete_object(Bucket=self.bucket_name, Key=self._extract_key_from_url(url))
