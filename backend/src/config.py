from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_host: str = Field(..., env='DATABASE_HOST')
    database_port: int = Field(..., env='DATABASE_PORT')
    database_username: str = Field(..., env='DATABASE_USERNAME')
    database_password: str = Field(..., env='DATABASE_PASSWORD')
    database_name: str = Field(..., env='DATABASE_NAME')

    bucket_name: str = Field(..., env='BUCKET_NAME')
    access_key_id: str = Field(..., env='ACCESS_KEY_ID')
    secret_access_key: str = Field(..., env='SECRET_ACCESS_KEY')
    endpoint_url: str = Field(..., env='ENDPOINT_URL')
    region_name: str = Field(..., env='REGION_NAME')

    openai_api_key: str = Field(..., env='OPENAI_API_KEY')
    
    jwt_secret_key: str = Field(..., env='JWT_SECRET_KEY')
    telegram_bot_token: str | None = Field(default=None, env='TELEGRAM_BOT_TOKEN')
    telegram_bot_username: str = Field(default="genetic_tree_bot", env='TELEGRAM_BOT_USERNAME')
    allow_origins: str | None = Field(default=None, env='ALLOW_ORIGINS')

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

settings = Settings()
