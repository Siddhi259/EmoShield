"""
backend/src/utils/config.py — EmoShield
All app settings loaded from .env file automatically.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):

    # App
    APP_NAME: str = "EmoShield"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "emoshield-change-me-32-chars-min"
    FRONTEND_URL: str = "http://localhost:3000"
    API_PREFIX: str = "/api/v1"

    # Database
    MONGODB_URL: str = "mongodb://localhost:27017/emoshield"

    # JWT
    JWT_SECRET_KEY: str = "emoshield-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Twilio SMS
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Instagram
    INSTAGRAM_CLIENT_ID: str = ""
    INSTAGRAM_CLIENT_SECRET: str = ""
    INSTAGRAM_REDIRECT_URI: str = "http://localhost:3000/auth/instagram/callback"

    # WhatsApp
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""

    # Security
    OTP_EXPIRE_MINUTES: int = 10
    MAX_LOGIN_ATTEMPTS: int = 5

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://emoshield.vercel.app",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
