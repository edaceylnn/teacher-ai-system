from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Teacher AI System API"
    app_version: str = "0.1.0"
    environment: str = Field(default="development")
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/teacher_ai_system"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    openai_api_key: str | None = None
    openai_model: str = "gpt-5"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 60 * 24 * 30
    frontend_base_url: str = "http://localhost:5173"
    # Number of uvicorn worker processes (see backend/Dockerfile). The rate
    # limiter (app/core/rate_limit.py) keeps its counters in-process, so more
    # than one worker in production would silently multiply every limit.
    web_concurrency: int = 1
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    # Comma-separated, not a JSON list — pydantic-settings tries to JSON-decode
    # list-typed fields from env vars, which rejects a plain "a,b,c" string.
    # Add prod origins via CORS_ORIGINS="https://app.example.com,https://admin.example.com".
    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
