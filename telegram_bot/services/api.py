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


# Singleton instance
backend_api = BackendAPI()
