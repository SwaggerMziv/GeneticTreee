"""Pydantic schemas for WebApp API."""
from pydantic import BaseModel


# ── Auth ──

class AuthRequest(BaseModel):
    init_data: str


class AuthResponse(BaseModel):
    token: str
    relative_id: int
    telegram_user_id: int
    first_name: str
    last_name: str
    relative_name: str


# ── Interview ──

class MessageRequest(BaseModel):
    text: str
    photos: list[str] | None = None  # base64 encoded photos


class ConfirmStoryRequest(BaseModel):
    action: str  # "save" | "discard" | "continue"


class CreateRelativeRequest(BaseModel):
    first_name: str
    last_name: str | None = None
    birth_year: int | None = None
    gender: str = "other"  # "male" | "female" | "other"
    relationship_type: str  # "mother", "father", etc.


# ── Stories ──

class StoryResponse(BaseModel):
    key: str
    title: str
    text: str
    media: list[dict] = []
    created_at: str | None = None
    updated_at: str | None = None


# ── Stats ──

class StatsResponse(BaseModel):
    my_stories: int
    related_relatives: int
    relatives_stories: int
    total_stories: int


# ── Settings ──

class SettingsResponse(BaseModel):
    broadcast_enabled: bool
    name: str
    added_at: str | None = None


class SettingsUpdateRequest(BaseModel):
    broadcast_enabled: bool
