"""Backend API client."""
import logging
import httpx
from config import config

logger = logging.getLogger(__name__)


class BackendAPI:
    """Client for backend API communication."""

    def __init__(self, base_url: str = None):
        self.base_url = base_url or config.BACKEND_URL

    async def activate_user(
        self, token: str, telegram_user_id: int, username: str = None
    ) -> dict:
        """Activate relative via backend API."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/family/activate-invitation",
                json={
                    "token": token,
                    "telegram_user_id": telegram_user_id,
                    "telegram_username": username,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_relative_by_telegram_id(self, telegram_user_id: int) -> dict | None:
        """Get relative data by telegram user ID."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/v1/family/relative-by-telegram/{telegram_user_id}",
                    timeout=10.0,
                )
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error getting relative by telegram: {e}")
                return None

    async def save_story(self, relative_id: int, title: str, text: str) -> bool:
        """Save a story to the backend."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/family/relatives/{relative_id}/story",
                    json={"title": title, "text": text},
                    timeout=15.0,
                )
                response.raise_for_status()
                return True
            except Exception as e:
                logger.error(f"Error saving story: {e}")
                return False

    async def get_stories_count(self, relative_id: int) -> int:
        """Get count of stories for a relative."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/v1/family/relatives/{relative_id}/stories-count",
                    timeout=10.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("count", 0)
                return 0
            except Exception as e:
                logger.error(f"Error getting stories count: {e}")
                return 0

    async def get_all_active_relatives(self) -> list[dict]:
        """Get all relatives with telegram_user_id set (for broadcasts)."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/v1/family/relatives/active-telegram",
                    timeout=30.0,
                )
                if response.status_code == 200:
                    return response.json()
                return []
            except Exception as e:
                logger.error(f"Error getting active relatives: {e}")
                return []

    async def get_related_stories(self, relative_id: int) -> list[dict]:
        """
        Get stories from related relatives for interview context enrichment.

        Returns list of related relatives with their stories:
        [
            {
                "name": "Иван Петрович",
                "relationship": "father",
                "stories": [
                    {"title": "История о войне", "preview": "В 1943 году..."}
                ]
            }
        ]
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/v1/family/relatives/{relative_id}/related-stories",
                    timeout=15.0,
                )
                if response.status_code == 200:
                    return response.json()
                return []
            except Exception as e:
                logger.error(f"Error getting related stories: {e}")
                return []

    async def upload_story_media(
        self,
        relative_id: int,
        story_key: str,
        photo_bytes: bytes,
        filename: str,
    ) -> dict | None:
        """Upload photo to a story."""
        async with httpx.AsyncClient() as client:
            try:
                files = {"file": (filename, photo_bytes, "image/jpeg")}
                response = await client.post(
                    f"{self.base_url}/api/v1/family/relatives/{relative_id}/stories/{story_key}/media",
                    files=files,
                    timeout=30.0,
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error uploading story media: {e}")
                return None

    async def get_story_photo_count(self, relative_id: int, story_key: str) -> int:
        """Get current count of images in a story."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/api/v1/family/relatives/{relative_id}/stories/{story_key}",
                    timeout=10.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    media = data.get("media", [])
                    return sum(1 for m in media if m.get("type") == "image")
                return 0
            except Exception:
                return 0

    async def create_relative_from_bot(
        self,
        interviewer_relative_id: int,
        first_name: str,
        relationship_type: str,
        last_name: str = None,
        birth_year: int = None,
        gender: str = "other",
        additional_info: str = None,
    ) -> dict | None:
        """
        Create a relative from the bot interview.

        Args:
            interviewer_relative_id: ID of the interviewing relative
            first_name: First name of the new relative
            relationship_type: Type of relationship (mother, father, etc.)
            last_name: Optional last name
            birth_year: Optional birth year
            gender: Gender (male, female, other)
            additional_info: Additional collected information

        Returns:
            dict with relative_id and message, or None if failed
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/family/relatives/create-from-bot",
                    json={
                        "interviewer_relative_id": interviewer_relative_id,
                        "first_name": first_name,
                        "last_name": last_name,
                        "birth_year": birth_year,
                        "gender": gender,
                        "relationship_type": relationship_type,
                        "additional_info": additional_info,
                    },
                    timeout=15.0,
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error creating relative from bot: {e}")
                return None


# Singleton instance
backend_api = BackendAPI()
