"""User storage for tracking active users and broadcast history."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Storage file path
STORAGE_FILE = Path(__file__).parent.parent / "data" / "users.json"


class UserStorage:
    """Simple file-based storage for user data and broadcast tracking."""

    def __init__(self, storage_path: Path = None):
        self.storage_path = storage_path or STORAGE_FILE
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._data = self._load()

    def _load(self) -> dict:
        """Load data from file."""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading storage: {e}")
        return {"users": {}, "broadcast_history": [], "last_broadcast": None}

    def _save(self):
        """Save data to file."""
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving storage: {e}")

    def add_user(
        self,
        telegram_id: int,
        relative_id: int,
        name: str = "",
        enabled_broadcast: bool = True,
    ):
        """Add or update user in storage."""
        self._data["users"][str(telegram_id)] = {
            "relative_id": relative_id,
            "name": name,
            "enabled_broadcast": enabled_broadcast,
            "last_interaction": datetime.now().isoformat(),
            "added_at": self._data["users"]
            .get(str(telegram_id), {})
            .get("added_at", datetime.now().isoformat()),
            "broadcast_count": self._data["users"]
            .get(str(telegram_id), {})
            .get("broadcast_count", 0),
            "last_question_index": self._data["users"]
            .get(str(telegram_id), {})
            .get("last_question_index", -1),
        }
        self._save()

    def get_user(self, telegram_id: int) -> Optional[dict]:
        """Get user data."""
        return self._data["users"].get(str(telegram_id))

    def update_user_interaction(self, telegram_id: int):
        """Update last interaction time."""
        if str(telegram_id) in self._data["users"]:
            self._data["users"][str(telegram_id)][
                "last_interaction"
            ] = datetime.now().isoformat()
            self._save()

    def set_broadcast_enabled(self, telegram_id: int, enabled: bool):
        """Enable or disable broadcasts for user."""
        if str(telegram_id) in self._data["users"]:
            self._data["users"][str(telegram_id)]["enabled_broadcast"] = enabled
            self._save()

    def get_users_for_broadcast(self) -> list[dict]:
        """Get all users who have broadcasts enabled."""
        users = []
        for telegram_id, data in self._data["users"].items():
            if data.get("enabled_broadcast", True):
                users.append({"telegram_id": int(telegram_id), **data})
        return users

    def record_broadcast(self, telegram_id: int, question: str, question_index: int):
        """Record that a broadcast was sent to user."""
        if str(telegram_id) in self._data["users"]:
            self._data["users"][str(telegram_id)]["broadcast_count"] = (
                self._data["users"][str(telegram_id)].get("broadcast_count", 0) + 1
            )
            self._data["users"][str(telegram_id)]["last_question_index"] = question_index
            self._data["users"][str(telegram_id)][
                "last_broadcast_at"
            ] = datetime.now().isoformat()

        self._data["broadcast_history"].append(
            {
                "telegram_id": telegram_id,
                "question": question,
                "sent_at": datetime.now().isoformat(),
            }
        )

        # Keep only last 1000 broadcast records
        if len(self._data["broadcast_history"]) > 1000:
            self._data["broadcast_history"] = self._data["broadcast_history"][-1000:]

        self._data["last_broadcast"] = datetime.now().isoformat()
        self._save()

    def get_next_question_index(self, telegram_id: int, total_questions: int) -> int:
        """Get next question index for user (cycling through questions)."""
        user = self.get_user(telegram_id)
        if not user:
            return 0
        last_index = user.get("last_question_index", -1)
        return (last_index + 1) % total_questions

    def get_last_broadcast_time(self) -> Optional[datetime]:
        """Get time of last broadcast."""
        last = self._data.get("last_broadcast")
        if last:
            try:
                return datetime.fromisoformat(last)
            except:
                pass
        return None

    def remove_user(self, telegram_id: int):
        """Remove user from storage."""
        if str(telegram_id) in self._data["users"]:
            del self._data["users"][str(telegram_id)]
            self._save()


# Singleton instance
user_storage = UserStorage()
