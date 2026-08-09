import logging

logger = logging.getLogger("app.email")


def send_password_reset_email(email: str, reset_link: str) -> None:
    """Dev-mode stand-in for a real mailer: logs the link instead of sending it.
    Swap this out for an SMTP/provider integration when one is available."""
    logger.info("Password reset requested for %s — reset link: %s", email, reset_link)
