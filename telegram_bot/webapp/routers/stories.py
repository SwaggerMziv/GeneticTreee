"""Stories endpoints — proxy to backend."""
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from services.api import backend_api
from webapp.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories", tags=["Stories"])


@router.get("")
async def get_stories(user: dict = Depends(get_current_user)):
    """Получить список историй родственника."""
    relative_id = user["relative_id"]

    stories = await backend_api.get_stories(relative_id)
    return {"stories": stories}


@router.get("/count")
async def get_stories_count(user: dict = Depends(get_current_user)):
    """Получить количество историй."""
    relative_id = user["relative_id"]
    count = await backend_api.get_stories_count(relative_id)
    return {"count": count}


@router.post("/{story_key}/media")
async def upload_story_media(
    story_key: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Загрузить фото в историю."""
    relative_id = user["relative_id"]

    content = await file.read()
    filename = file.filename or "photo.jpg"

    result = await backend_api.upload_story_media(
        relative_id, story_key, content, filename
    )

    if result:
        return result

    raise HTTPException(status_code=500, detail="Ошибка загрузки фото")
