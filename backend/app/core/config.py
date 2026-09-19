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
    # "openai" or "gemini". Gemini's free tier is what the public portfolio
    # demo runs on; switch to "openai" once there's a budget for it.
    ai_provider: str = "openai"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash-lite"
    # Demo cost guardrails for the AI generation endpoints (app/api/routes/ai.py).
    # There's no public signup — demo visitors share one seeded teacher login —
    # so a per-teacher limit wouldn't isolate them; this caps by IP instead,
    # plus a global daily cap protecting the shared free-tier quota from the
    # whole demo audience combined.
    ai_daily_limit_per_ip: int = 3
    ai_daily_limit_global: int = 150
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
    # Uvicorn reads this same env var directly (see docker-entrypoint.sh) to
    # decide which immediate peer it trusts to supply X-Forwarded-For/-Proto.
    # This copy exists only so app startup can warn when it's still the
    # default behind a reverse proxy — see warn_if_forwarded_allow_ips_are_default
    # in app/core/security.py for why the default is usually wrong in that case.
    forwarded_allow_ips: str = "127.0.0.1"

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
