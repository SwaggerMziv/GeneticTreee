from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import List, Optional, Dict
import re


class AdminUserListItemSchema(BaseModel):
    id: int
    username: str
    email: str | None = None
    telegram_id: str | None = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    relatives_count: int = 0
    stories_count: int = 0
    relationships_count: int = 0
    activated_relatives_count: int = 0


class AdminUserListResponseSchema(BaseModel):
    users: List[AdminUserListItemSchema]
    total: int
    skip: int
    limit: int


class AdminDashboardStatsSchema(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_relatives: int
    total_relationships: int
    total_stories: int
    total_activated_relatives: int
    total_invitations_sent: int
    users_registered_last_7_days: int
    users_registered_last_30_days: int
    avg_relatives_per_user: float
    top_users: List[AdminUserListItemSchema]


class AdminRelativeListItemSchema(BaseModel):
    id: int
    user_id: int
    owner_username: str
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    is_active: bool
    is_activated: bool
    telegram_user_id: int | None = None
    stories_count: int = 0
    created_at: datetime


class AdminStoryItemSchema(BaseModel):
    relative_id: int
    relative_name: str
    owner_username: str
    user_id: int
    story_key: str
    story_text: str
    media_count: int = 0
    media_urls: List[str] = []
    created_at: str | None = None


class AdminActiveInterviewSchema(BaseModel):
    relative_id: int
    name: str
    owner_username: str
    messages_count: int
    last_message_at: str | None = None


class AdminTelegramStatsSchema(BaseModel):
    total_activated: int
    total_invitations_sent: int
    total_with_interviews: int
    total_pending_invitations: int = 0
    stories_via_bot: int = 0
    stories_manually: int = 0
    active_interviews: List[AdminActiveInterviewSchema]


# --- Аудит ---

class AdminAuditLogItemSchema(BaseModel):
    id: int
    admin_user_id: int | None = None
    action: str
    target_type: str
    target_id: str
    ip_address: str | None = None
    details: dict | None = None
    created_at: datetime


class AdminAuditLogResponseSchema(BaseModel):
    items: List[AdminAuditLogItemSchema]
    total: int
    skip: int
    limit: int


# --- Сброс пароля ---

class ResetPasswordSchema(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Пароль должен быть не менее 6 символов')
        return v


# --- AI Usage ---

class AIUsageLogItemSchema(BaseModel):
    id: int
    user_id: int | None = None
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    endpoint_type: str
    error_message: str | None = None
    created_at: datetime


class AIUsageLogResponseSchema(BaseModel):
    items: List[AIUsageLogItemSchema]
    total: int
    skip: int
    limit: int


class AIUsageStatsSchema(BaseModel):
    total_calls: int
    total_tokens: int
    total_prompt_tokens: int
    total_completion_tokens: int
    estimated_cost_usd: float
    errors_count: int
    calls_by_type: Dict[str, int]


# --- Книги ---

class BookGenerationItemSchema(BaseModel):
    id: int
    user_id: int | None = None
    status: str
    filename: str | None = None
    s3_key: str | None = None
    s3_url: str | None = None
    file_size_bytes: int | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class BookGenerationListResponseSchema(BaseModel):
    items: List[BookGenerationItemSchema]
    total: int
    skip: int
    limit: int


# --- Графики ---

class DayDataPointSchema(BaseModel):
    date: str
    count: int


class DashboardChartsSchema(BaseModel):
    registrations_by_day: List[DayDataPointSchema]
    active_users_by_day: List[DayDataPointSchema]


# --- Все родственники ---

class AdminAllRelativesResponseSchema(BaseModel):
    relatives: List[AdminRelativeListItemSchema]
    total: int
    skip: int
    limit: int
