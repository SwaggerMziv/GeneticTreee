from typing import AsyncGenerator
from fastapi import Depends
from src.storage.s3.manager import S3Manager
from src.config import settings

def get_s3_manager() -> S3Manager:
    return S3Manager(
        access_key_id=settings.access_key_id,
        secret_access_key=settings.secret_access_key,
        endpoint_url=settings.endpoint_url,
        bucket_name=settings.bucket_name,
        region_name=settings.region_name,
    )
