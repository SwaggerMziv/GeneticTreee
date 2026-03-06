"""Statistics endpoint."""
import logging

from fastapi import APIRouter, Depends

from services.api import backend_api
from webapp.dependencies import get_current_user
from webapp.schemas import StatsResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Stats"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats(user: dict = Depends(get_current_user)):
    """Получить статистику: мои истории, родственники, общее количество."""
    relative_id = user["relative_id"]

    my_stories = await backend_api.get_stories_count(relative_id)

    related_stories = await backend_api.get_related_stories(relative_id)

    related_count = len(related_stories)
    relatives_stories_count = sum(
        len(r.get("stories", [])) for r in related_stories
    )

    return StatsResponse(
        my_stories=my_stories,
        related_relatives=related_count,
        relatives_stories=relatives_stories_count,
        total_stories=my_stories + relatives_stories_count,
    )
