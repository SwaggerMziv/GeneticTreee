from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from src.auth.dependencies import get_current_user_id
from src.storage.s3.dependencies import get_s3_manager
from src.storage.s3.manager import S3Manager
from src.storage.s3.schemas import UploadOutputSchema
import httpx

router = APIRouter(prefix='/api/v1/storage', tags=['Storage'])

ALLOWED_PROXY_HOSTS = {"s3.twcstorage.ru"}


@router.post('/upload', response_model=UploadOutputSchema, dependencies=[Depends(get_current_user_id)])
async def upload_file(
    file: UploadFile = File(...),
    s3: S3Manager = Depends(get_s3_manager),
):
    """Загрузка файла в S3"""
    key, url, content_type = await s3.upload(file)
    return UploadOutputSchema(key=key, url=url, content_type=content_type)


@router.get("/proxy")
async def proxy_content(url: str):
    """Проксирование контента из S3 для обхода CORS"""
    parsed = httpx.URL(url)

    if parsed.scheme != "https" or parsed.host not in ALLOWED_PROXY_HOSTS:
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
