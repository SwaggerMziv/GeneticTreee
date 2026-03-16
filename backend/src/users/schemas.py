import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime, timezone

PASSWORD_PATTERN = re.compile(r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~ ]+$')
USERNAME_PATTERN = re.compile(r"^[\w-]{3,20}$", re.UNICODE)


# Пользователь
class UserCreateSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    telegram_id: str | None = Field(default=None)
    email: EmailStr | None = Field(default=None)
    password: str | None = Field(min_length=8, max_length=32)

    @field_validator('password')
    @classmethod
    def password_must_be_ascii(cls, v: str | None) -> str | None:
        if v is not None and not PASSWORD_PATTERN.match(v):
            raise ValueError('Пароль может содержать только латинские буквы, цифры и спецсимволы')
        return v

    @field_validator('username')
    @classmethod
    def username_must_be_safe(cls, v: str) -> str:
        if not USERNAME_PATTERN.match(v):
            raise ValueError("Username может содержать только буквы/цифры, '_' или '-'")
        return v

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

    @field_validator('password')
    @classmethod
    def password_must_be_ascii(cls, v: str | None) -> str | None:
        if v is not None and not PASSWORD_PATTERN.match(v):
            raise ValueError('Пароль может содержать только латинские буквы, цифры и спецсимволы')
        return v

    @field_validator('username')
    @classmethod
    def username_must_be_safe(cls, v: str) -> str:
        if not USERNAME_PATTERN.match(v):
            raise ValueError("Username может содержать только буквы/цифры, '_' или '-'")
        return v

class UserDeleteSchema(BaseModel):
    id: int
    is_active: bool = Field(default=False)

class UserOutputSchema(BaseModel):
    id: int
    username: str
    telegram_id: str | None = Field(default=None)
    email: EmailStr | None = Field(default=None)
    is_active: bool
    is_superuser: bool = Field(default=False)
    created_at: datetime
    updated_at: datetime = Field(default=datetime.now(timezone.utc))
