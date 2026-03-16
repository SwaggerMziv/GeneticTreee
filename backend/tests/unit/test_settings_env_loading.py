"""Unit тесты: загрузка Settings из окружения."""
import pytest

from src.config import Settings


@pytest.mark.unit
class TestSettingsEnvLoading:
    def test_reads_required_env_vars(self, monkeypatch):
        monkeypatch.setenv("DATABASE_HOST", "db")
        monkeypatch.setenv("DATABASE_PORT", "5432")
        monkeypatch.setenv("DATABASE_USERNAME", "u")
        monkeypatch.setenv("DATABASE_PASSWORD", "p")
        monkeypatch.setenv("DATABASE_NAME", "n")
        monkeypatch.setenv("BUCKET_NAME", "b")
        monkeypatch.setenv("ACCESS_KEY_ID", "a")
        monkeypatch.setenv("SECRET_ACCESS_KEY", "s")
        monkeypatch.setenv("ENDPOINT_URL", "https://s3.example.com")
        monkeypatch.setenv("REGION_NAME", "us-east-1")
        monkeypatch.setenv("OPENROUTER_API_KEY", "k")
        monkeypatch.setenv("JWT_SECRET_KEY", "jwt")

        cfg = Settings(_env_file=None)
        assert cfg.database_host == "db"
        assert cfg.database_port == 5432
        assert cfg.endpoint_url == "https://s3.example.com"

    def test_optional_env_vars_default(self, monkeypatch):
        # В тестовом окружении conftest может уже выставлять некоторые переменные —
        # здесь явно очищаем optional-поля, чтобы проверить дефолты.
        monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
        monkeypatch.delenv("TELEGRAM_BOT_USERNAME", raising=False)
        monkeypatch.delenv("ALLOW_ORIGINS", raising=False)

        # required
        monkeypatch.setenv("DATABASE_HOST", "db")
        monkeypatch.setenv("DATABASE_PORT", "5432")
        monkeypatch.setenv("DATABASE_USERNAME", "u")
        monkeypatch.setenv("DATABASE_PASSWORD", "p")
        monkeypatch.setenv("DATABASE_NAME", "n")
        monkeypatch.setenv("BUCKET_NAME", "b")
        monkeypatch.setenv("ACCESS_KEY_ID", "a")
        monkeypatch.setenv("SECRET_ACCESS_KEY", "s")
        monkeypatch.setenv("ENDPOINT_URL", "https://s3.example.com")
        monkeypatch.setenv("REGION_NAME", "us-east-1")
        monkeypatch.setenv("OPENROUTER_API_KEY", "k")
        monkeypatch.setenv("JWT_SECRET_KEY", "jwt")

        cfg = Settings(_env_file=None)
        assert cfg.telegram_bot_token is None
        assert cfg.allow_origins is None
        assert cfg.telegram_bot_username == "genetic_tree_bot"

