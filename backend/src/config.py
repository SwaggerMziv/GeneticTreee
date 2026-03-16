from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_host: str = Field(...)
    database_port: int = Field(...)
    database_username: str = Field(...)
    database_password: str = Field(...)
    database_name: str = Field(...)

    bucket_name: str = Field(...)
    access_key_id: str = Field(...)
    secret_access_key: str = Field(...)
    endpoint_url: str = Field(...)
    region_name: str = Field(...)

    openrouter_api_key: str = Field(...)
    
    jwt_secret_key: str = Field(...)
    telegram_bot_token: str | None = Field(default=None)
    telegram_bot_username: str = Field(default="genetic_tree_bot")
    allow_origins: str | None = Field(default=None)

    # ЮKassa
    yookassa_shop_id: str | None = Field(default=None)
    yookassa_secret_key: str | None = Field(default=None)
    yookassa_webhook_secret: str | None = Field(default=None)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

settings = Settings()
