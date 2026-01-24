from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone


# Пользователь
class UserCreateSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    telegram_id: str | None = Field(default=None)
    email: EmailStr | None = Field(default=None)
    password: str | None = Field(min_length=8, max_length=32)

class UserReadSchema(BaseModel):
    id: int
    username: str
    telegram_id: str | None = None
    email: EmailStr | None = Field(default=None)
    created_at: datetime = Field(default=datetime.now(timezone.utc))
    updated_at: datetime = Field(default=datetime.now(timezone.utc))
    is_active: bool

class UserUpdateSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: EmailStr | None = Field(default=None)
    password: str | None = Field(..., min_length=8, max_length=32)
    is_active: bool = Field(default=True)

class UserDeleteSchema(BaseModel):
    id: int
    is_active: bool = Field(default=False)

class UserOutputSchema(BaseModel):
    id: int
    username: str
    telegram_id: str | None = Field(default=None)
    email: EmailStr | None = Field(default=None)
    is_active: bool
    created_at: datetime
    updated_at: datetime = Field(default=datetime.now(timezone.utc))
