from enum import Enum


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class BillingPeriod(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class QuotaResource(str, Enum):
    """Ресурсы, ограниченные квотами"""
    AI_REQUESTS = "ai_requests"
    AI_SMART_REQUESTS = "ai_smart_requests"
    TREE_GENERATIONS = "tree_generations"
    BOOK_GENERATIONS = "book_generations"
    TELEGRAM_INVITATIONS = "telegram_invitations"
    TELEGRAM_SESSIONS = "telegram_sessions"
    TTS = "tts"
    STORAGE_MB = "storage_mb"
    RELATIVES = "relatives"
