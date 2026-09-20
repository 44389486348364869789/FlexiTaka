"""
FlexiTaka Core Configuration
Uses Pydantic Settings for strictly validated environment variables.
"""

from pathlib import Path
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = Field(default="development", description="development | staging | production")
    APP_NAME: str = "FlexiTaka Backend API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Domain Separation
    PUBLIC_API_BASE_URL: str = "https://flexitaka.online/api/v1"
    CUSTOMER_WEBSITE_URL: str = "https://flexitaka.com"

    # Database & Cache
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "flexitaka"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Authentication & Security
    JWT_SECRET: str = "flexitaka-super-secret-production-key-change-in-env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    GUEST_SESSION_EXPIRE_DAYS: int = 30

    # File Storage
    STORAGE_ROOT: str = Field(
        default="/data/flexitaka/uploads",
        description="Private VPS storage path for transaction proofs"
    )
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_PROOF_MIMES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ]

    # CORS Origins (Restricted in production, no wildcards)
    ALLOWED_ORIGINS: List[str] = [
        "https://flexitaka.com",
        "https://app.flexitaka.com",
        "https://staging.flexitaka.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]

    # Operational Defaults
    DEFAULT_CASHOUT_FEE_PERCENT: int = 20
    DEFAULT_RECHARGE_DISCOUNT_PERCENT: int = 5
    MIN_ORDER_AMOUNT_BDT: int = 50
    MAX_ORDER_AMOUNT_BDT: int = 50000

    # SMS Provider Configuration
    SMS_PROVIDER: str = "mock"  # "zendsms", "generic_http", "mock"
    ZENDSMS_API_KEY: Optional[str] = None
    ZENDSMS_BASE_URL: str = "https://api.zendsms.com"
    ZENDSMS_SENDER_ID: str = "8809612781023"
    ZENDSMS_BRAND: str = "FlexiTaka"
    ZENDSMS_EXPIRY_SECONDS: int = 300
    SMS_API_BASE_URL: Optional[str] = None
    SMS_API_KEY: Optional[str] = None
    SMS_AUTH_HEADER: str = "Authorization"
    SMS_AUTH_SCHEME: str = "Bearer"
    SMS_SEND_PATH: str = "/api/v1/sms/send"
    SMS_VERIFY_PATH: Optional[str] = None
    SMS_SENDER_ID: Optional[str] = "FlexiTaka"

    # OTP Security Thresholds
    OTP_TTL_SECONDS: int = 300
    OTP_COOLDOWN_SECONDS: int = 60
    OTP_MAX_ATTEMPTS: int = 5

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def resolved_storage_root(self) -> Path:
        """Ensure storage directory exists or fallback to local directory in non-production."""
        path = Path(self.STORAGE_ROOT)
        try:
            path.mkdir(parents=True, exist_ok=True)
            return path
        except (PermissionError, OSError):
            local_fallback = Path(__file__).resolve().parent.parent.parent / "uploads"
            local_fallback.mkdir(parents=True, exist_ok=True)
            return local_fallback


settings = Settings()
