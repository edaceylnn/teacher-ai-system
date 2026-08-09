import pytest

from app.core import security
from app.core.config import settings


def test_password_hash_round_trip() -> None:
    password_hash = security.hash_password("demo12345")

    assert security.verify_password("demo12345", password_hash)
    assert not security.verify_password("wrong-password", password_hash)


def test_access_token_round_trip() -> None:
    token = security.create_access_token("42")
    payload = security.decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == "42"


def test_refresh_token_round_trip() -> None:
    token = security.create_refresh_token(42, "some-password-hash")
    payload = security.decode_refresh_token(token)

    assert payload is not None
    assert payload["sub"] == "42"


def test_password_reset_token_round_trip() -> None:
    token = security.create_password_reset_token(42, "some-password-hash")
    payload = security.decode_password_reset_token(token)

    assert payload is not None
    assert payload["sub"] == "42"


def test_tokens_cannot_be_used_across_purposes() -> None:
    access_token = security.create_access_token("42")
    refresh_token = security.create_refresh_token(42, "some-password-hash")
    reset_token = security.create_password_reset_token(42, "some-password-hash")

    assert security.decode_refresh_token(access_token) is None
    assert security.decode_password_reset_token(access_token) is None
    assert security.decode_access_token(refresh_token) is None
    assert security.decode_password_reset_token(refresh_token) is None
    assert security.decode_access_token(reset_token) is None
    assert security.decode_refresh_token(reset_token) is None


def test_decode_rejects_malformed_or_tampered_tokens() -> None:
    assert security.decode_access_token("not-a-real-token") is None

    token = security.create_access_token("42")
    header, payload_segment, signature = token.split(".")
    # Mutate a character safely inside the payload segment (not its last
    # character): base64url's final character can carry unused padding
    # bits, so a naive last-char flip can occasionally decode to the same
    # bytes and leave the signature — and the test — accidentally valid.
    index = len(payload_segment) // 2
    mutated_char = "a" if payload_segment[index] != "a" else "b"
    tampered_payload = payload_segment[:index] + mutated_char + payload_segment[index + 1 :]
    tampered = f"{header}.{tampered_payload}.{signature}"

    assert security.decode_access_token(tampered) is None


def test_ensure_secret_key_is_not_default_only_enforced_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "secret_key", "change-me-in-production")

    security.ensure_secret_key_is_not_default()  # should not raise


def test_ensure_secret_key_is_not_default_rejects_placeholder_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "change-me-in-production")

    with pytest.raises(RuntimeError, match="must be changed"):
        security.ensure_secret_key_is_not_default()


def test_ensure_secret_key_is_not_default_rejects_short_key_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "short-secret")

    with pytest.raises(RuntimeError, match="at least 32 characters"):
        security.ensure_secret_key_is_not_default()


def test_ensure_secret_key_is_not_default_accepts_strong_key_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "secret_key", "a" * 32)

    security.ensure_secret_key_is_not_default()  # should not raise
