import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import settings

logger = logging.getLogger("app.security")


HASH_PREFIX = "pbkdf2_sha256"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_PURPOSE = "access"
REFRESH_TOKEN_PURPOSE = "refresh"
PASSWORD_RESET_TOKEN_PURPOSE = "pwd_reset"
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"{HASH_PREFIX}${salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        prefix, salt, expected_digest = password_hash.split("$", 2)
    except ValueError:
        return False
    if prefix != HASH_PREFIX:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return hmac.compare_digest(digest, expected_digest)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expires_at = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": subject, "purpose": ACCESS_TOKEN_PURPOSE, "exp": int(expires_at.timestamp())}
    return _encode_token(payload)


def decode_access_token(token: str) -> dict[str, Any] | None:
    payload = _decode_token(token)
    if payload is None or payload.get("purpose") != ACCESS_TOKEN_PURPOSE:
        return None
    return payload


def create_refresh_token(teacher_id: int, current_password_hash: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_expire_minutes)
    payload = {
        "sub": str(teacher_id),
        "purpose": REFRESH_TOKEN_PURPOSE,
        "pwd_fp": password_fingerprint(current_password_hash),
        "exp": int(expires_at.timestamp()),
    }
    return _encode_token(payload)


def decode_refresh_token(token: str) -> dict[str, Any] | None:
    payload = _decode_token(token)
    if payload is None or payload.get("purpose") != REFRESH_TOKEN_PURPOSE:
        return None
    return payload


def create_password_reset_token(teacher_id: int, current_password_hash: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(teacher_id),
        "purpose": PASSWORD_RESET_TOKEN_PURPOSE,
        "pwd_fp": password_fingerprint(current_password_hash),
        "exp": int(expires_at.timestamp()),
    }
    return _encode_token(payload)


def decode_password_reset_token(token: str) -> dict[str, Any] | None:
    payload = _decode_token(token)
    if payload is None or payload.get("purpose") != PASSWORD_RESET_TOKEN_PURPOSE:
        return None
    return payload


def password_fingerprint(password_hash: str) -> str:
    """Ties a reset token to the password hash it was issued for, so the token
    stops working as soon as the password changes — no separate token store needed."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:16]


def _encode_token(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None


def ensure_secret_key_is_not_default() -> None:
    if settings.environment != "production":
        return
    if settings.secret_key == "change-me-in-production":
        raise RuntimeError("SECRET_KEY must be changed in production.")
    # RFC 7518 §3.2 recommends HS256 keys be at least as long as the hash
    # output (32 bytes) — PyJWT warns about this at encode/decode time.
    if len(settings.secret_key) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters in production.")


def ensure_cors_origins_do_not_use_wildcard() -> None:
    """main.py always sets allow_credentials=True on CORSMiddleware (needed
    for the refresh-token cookie) — combined with a "*" origin that's a
    textbook CORS misconfiguration: browsers themselves refuse to honor a
    wildcard alongside credentials, so the practical effect is just a broken
    frontend, but relying on the browser to save you from a server
    misconfiguration is fragile. Checked in every environment, not just
    production — there's no legitimate reason to ever set this."""
    if "*" in settings.cors_origin_list:
        raise RuntimeError(
            'CORS_ORIGINS must not contain "*" — this app sends credentials '
            "(the refresh-token cookie), which browsers refuse to combine with "
            "a wildcard origin. List the exact allowed origins instead."
        )


def ensure_single_worker_in_production() -> None:
    """The rate limiter in app/core/rate_limit.py keeps its hit counters in
    process memory. Running more than one uvicorn worker would give each
    worker its own counters, silently multiplying every rate limit — so
    production must run a single worker unless the limiter is backed by a
    shared store."""
    if settings.environment != "production":
        return
    if settings.web_concurrency != 1:
        raise RuntimeError(
            "WEB_CONCURRENCY must be 1 in production — the in-memory rate "
            "limiter does not coordinate across worker processes."
        )


def ensure_email_is_configured_in_production() -> None:
    if settings.environment != "production":
        return
    if not settings.smtp_host:
        raise RuntimeError(
            "SMTP_HOST must be configured in production — without it, "
            "password reset emails are only logged, not delivered."
        )


def warn_if_forwarded_allow_ips_are_default() -> None:
    """Every per-IP rate limiter (login, registration, the AI daily caps)
    and the audit log's client_ip both key off request.client.host, which is
    only the real visitor IP when nothing sits in front of this process — the
    moment a reverse proxy is added (needed for HTTPS in any real deployment),
    every request looks like it comes from the proxy's own address unless
    uvicorn is told to trust and rewrite it from X-Forwarded-For.

    Unlike the other ensure_* guards, this can't be a hard failure: whether a
    proxy is even in front of this process, and what its address is, isn't
    something the app can determine on its own. It's a nudge, not a gate —
    log once at startup so it's not a silent footgun, and let the operator
    verify the real deployment topology (see backend/README.md)."""
    if settings.environment != "production":
        return
    if settings.forwarded_allow_ips == "127.0.0.1":
        logger.warning(
            "FORWARDED_ALLOW_IPS is still the default (127.0.0.1). If a reverse "
            "proxy sits in front of this server (needed for HTTPS) and isn't "
            "reachable from exactly that address inside the container network, "
            "every visitor will collapse into one shared rate-limit/audit-log "
            "identity. Verify and set FORWARDED_ALLOW_IPS to the proxy's real "
            "address — see backend/README.md."
        )
