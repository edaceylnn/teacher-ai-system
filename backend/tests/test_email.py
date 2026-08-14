import logging
import smtplib
from unittest.mock import MagicMock, patch

import pytest

from app.core import email
from app.core.config import settings


def test_send_password_reset_email_logs_when_smtp_not_configured(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setattr(settings, "smtp_host", None)

    with caplog.at_level(logging.INFO, logger="app.email"):
        email.send_password_reset_email("teacher@example.com", "https://app.example.com/reset?token=abc")

    assert "SMTP not configured" in caplog.text
    assert "teacher@example.com" in caplog.text


def test_send_password_reset_email_sends_via_smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_username", "user@example.com")
    monkeypatch.setattr(settings, "smtp_password", "secret")
    monkeypatch.setattr(settings, "smtp_from_email", "no-reply@example.com")
    monkeypatch.setattr(settings, "smtp_use_tls", True)

    mock_smtp_instance = MagicMock()
    mock_smtp_instance.__enter__.return_value = mock_smtp_instance
    with patch("smtplib.SMTP", return_value=mock_smtp_instance) as mock_smtp:
        email.send_password_reset_email("teacher@example.com", "https://app.example.com/reset?token=abc")

    mock_smtp.assert_called_once_with("smtp.example.com", 587, timeout=10)
    mock_smtp_instance.starttls.assert_called_once()
    mock_smtp_instance.login.assert_called_once_with("user@example.com", "secret")
    mock_smtp_instance.send_message.assert_called_once()
    sent_message = mock_smtp_instance.send_message.call_args[0][0]
    assert sent_message["To"] == "teacher@example.com"
    assert sent_message["From"] == "no-reply@example.com"
    assert "https://app.example.com/reset?token=abc" in sent_message.get_content()


def test_send_password_reset_email_swallows_smtp_errors(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")

    with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, "unreachable")):
        with caplog.at_level(logging.ERROR, logger="app.email"):
            email.send_password_reset_email("teacher@example.com", "https://app.example.com/reset?token=abc")

    assert "Failed to send password reset email" in caplog.text
