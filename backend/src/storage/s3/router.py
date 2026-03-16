from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from src.auth.dependencies import get_current_user_id
from src.storage.s3.dependencies import get_s3_manager
from src.storage.s3.manager import S3Manager
from src.storage.s3.schemas import UploadOutputSchema
from src.subscription.dependencies import get_quota_service
from src.subscription.quota_service import QuotaService
import httpx
import os

router = APIRouter(prefix='/api/v1/storage', tags=['Storage'])

ALLOWED_PROXY_HOSTS = {"s3.twcstorage.ru"}


@router.post('/upload', response_model=UploadOutputSchema)
async def upload_file(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    s3: S3Manager = Depends(get_s3_manager),
    quota_service: QuotaService = Depends(get_quota_service),
):
    """Загрузка файла в S3"""
    # Проверка лимита хранилища
    file_size_mb = 0
    if file.size:
        file_size_mb = file.size / (1024 * 1024)
    if not await quota_service.check_storage_limit(user_id, file_size_mb):
        from src.subscription.exceptions import QuotaExceededError
        plan = await quota_service.get_user_plan(user_id)
        quota = await quota_service.get_or_create_quota(user_id)
        raise QuotaExceededError(
            resource="Хранилище (МБ)",
            limit=plan.max_storage_mb,
            used=quota.storage_used_mb,
        )

    # Санитизация имени файла (защита от path traversal в filename)
    if file.filename:
        safe_name = os.path.basename(file.filename.replace("\\", "/"))
        file.filename = safe_name

    key, url, content_type = await s3.upload(file)

    if file_size_mb > 0:
        await quota_service.increment_storage(user_id, file_size_mb)

    return UploadOutputSchema(key=key, url=url, content_type=content_type)


@router.get("/proxy")
async def proxy_content(url: str):
    """Проксирование контента из S3 для обхода CORS"""
    parsed = httpx.URL(url)

    if parsed.scheme != "https" or parsed.host not in ALLOWED_PROXY_HOSTS:
        raise HTTPException(status_code=400, detail="Недопустимый адрес")
    # Явно запрещаем нестандартные порты (минимизация SSRF-обходов)
    if parsed.port is not None and parsed.port != 443:
        raise HTTPException(status_code=400, detail="Недопустимый адрес")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Превышено время ожидания")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Ошибка при обращении к источнику")

    return Response(
        content=response.content,
        media_type=response.headers.get("content-type", "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=31536000"},
        status_code=response.status_code,
    )
