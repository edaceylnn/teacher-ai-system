import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("app.email")


def send_password_reset_email(email: str, reset_link: str) -> None:
    """Sends the password reset link over SMTP when SMTP_HOST is configured.
    Falls back to logging the link (local dev / no mailer configured) so the
    flow stays testable without real credentials."""
    if not settings.smtp_host:
        logger.info("SMTP not configured — password reset link for %s: %s", email, reset_link)
        return

    message = EmailMessage()
    message["Subject"] = "Teacher AI System - Şifre Sıfırlama"
    message["From"] = settings.smtp_from_email or settings.smtp_username or "no-reply@teacher-ai-system.local"
    message["To"] = email
    message.set_content(
        "Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. "
        "Bu bağlantı 30 dakika içinde geçerliliğini yitirir.\n\n"
        f"{reset_link}\n\n"
        "Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz."
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError):
        # Never let a mail-delivery failure surface to the caller: the
        # password-reset endpoint always returns 202 regardless of whether
        # the account exists, and a raised exception here would both break
        # that contract and 500 the request. Ops should watch this log line.
        logger.exception("Failed to send password reset email to %s", email)


def send_parent_message_email(email: str, subject: str, message: str) -> None:
    """Sends a teacher-authored note to a parent over SMTP when configured.
    Falls back to logging (local dev / no mailer configured) like the
    password-reset flow, so the endpoint stays testable without credentials."""
    if not settings.smtp_host:
        logger.info("SMTP not configured — parent message for %s: %s / %s", email, subject, message)
        return

    email_message = EmailMessage()
    email_message["Subject"] = subject
    email_message["From"] = settings.smtp_from_email or settings.smtp_username or "no-reply@teacher-ai-system.local"
    email_message["To"] = email
    email_message.set_content(message)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(email_message)
    except (smtplib.SMTPException, OSError):
        logger.exception("Failed to send parent message email to %s", email)
