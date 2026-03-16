"""WebApp configuration."""
import os


class WebAppConfig:
    """Configuration for the Telegram Mini App WebApp server."""

    WEBAPP_URL: str = os.getenv("WEBAPP_URL", "")
    WEBAPP_PORT: int = int(os.getenv("WEBAPP_PORT", "8080"))
    WEBAPP_JWT_SECRET: str = os.getenv("WEBAPP_JWT_SECRET", "change-me-in-production")
    WEBAPP_STATIC_DIR: str = os.getenv("WEBAPP_STATIC_DIR", "webapp_frontend/out")

    # JWT token lifetime in hours
    JWT_EXPIRY_HOURS: int = 24

    # STT (Speech-to-Text) — "api" для OpenAI Whisper API, "local" для faster-whisper
    WHISPER_MODE: str = os.getenv("WHISPER_MODE", "api")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # TTS (Text-to-Speech) через OpenAI API
    TTS_MODEL: str = os.getenv("TTS_MODEL", "tts-1-hd")
    TTS_VOICE: str = os.getenv("TTS_VOICE", "nova")
    TTS_SPEED: float = float(os.getenv("TTS_SPEED", "1.0"))

    # OpenAI Realtime API
    OPENAI_REALTIME_MODEL: str = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview")
    OPENAI_REALTIME_VOICE: str = os.getenv("OPENAI_REALTIME_VOICE", "sage")


webapp_config = WebAppConfig()
