from pydantic import BaseModel, EmailStr, Field



class LoginSchema(BaseModel):
    username: str | None = Field(max_length=32, description='Имя пользователя')
    email: EmailStr | None = Field(description='Электронная почта')
    password: str


class RefreshSchema(BaseModel):
    refresh_token: str | None = None


class LoginResponseSchema(BaseModel):
    access_token: str
    refresh_token: str


class AccessTokenResponseSchema(BaseModel):
    access_token: str


class LogoutResponseSchema(BaseModel):
    status: str


class MeResponseSchema(BaseModel):
    sub: int


class TelegramAuthSchema(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str

