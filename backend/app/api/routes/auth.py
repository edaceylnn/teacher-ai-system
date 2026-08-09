from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.config import settings
from app.core.email import send_password_reset_email
from app.core.rate_limit import InMemoryRateLimiter
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_password_reset_token,
    decode_refresh_token,
    hash_password,
    password_fingerprint,
    verify_password,
)
from app.db.session import get_db
from app.models import Teacher
from app.schemas.auth import (
    CurrentTeacherResponse,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
login_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
refresh_rate_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60)
password_reset_request_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
password_reset_confirm_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)

REFRESH_TOKEN_COOKIE_NAME = "refresh_token"


def _issue_tokens(teacher: Teacher, response: Response) -> TokenResponse:
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=create_refresh_token(teacher.id, teacher.password_hash),
        max_age=settings.refresh_token_expire_minutes * 60,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path="/auth",
    )
    return TokenResponse(
        access_token=create_access_token(str(teacher.id)),
        teacher_id=teacher.id,
        full_name=teacher.full_name,
        email=teacher.email,
    )


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(login_rate_limiter)])
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    teacher = db.scalar(select(Teacher).where(Teacher.email == str(payload.email)))
    if teacher is None or not verify_password(payload.password, teacher.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _issue_tokens(teacher, response)


@router.post("/refresh", response_model=TokenResponse, dependencies=[Depends(refresh_rate_limiter)])
def refresh_access_token(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> TokenResponse:
    invalid_token_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
    )
    if refresh_token is None:
        raise invalid_token_error

    payload = decode_refresh_token(refresh_token)
    if payload is None:
        raise invalid_token_error

    try:
        teacher_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise invalid_token_error

    teacher = db.get(Teacher, teacher_id)
    if teacher is None or payload.get("pwd_fp") != password_fingerprint(teacher.password_hash):
        raise invalid_token_error

    return _issue_tokens(teacher, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    # Must mutate and return the injected `response`, not a fresh Response object —
    # returning a new one would drop the delete_cookie header set on this one.
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE_NAME, path="/auth")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=CurrentTeacherResponse)
def get_me(current_teacher: Teacher = Depends(get_current_teacher)) -> Teacher:
    return current_teacher


@router.post(
    "/password-reset/request",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(password_reset_request_rate_limiter)],
)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> Response:
    teacher = db.scalar(select(Teacher).where(Teacher.email == str(payload.email)))
    if teacher is not None:
        token = create_password_reset_token(teacher.id, teacher.password_hash)
        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        send_password_reset_email(teacher.email, reset_link)
    # Always 202, whether or not the email exists, so callers can't enumerate accounts.
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(password_reset_confirm_rate_limiter)],
)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)) -> Response:
    token_payload = decode_password_reset_token(payload.token)
    invalid_token_error = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    if token_payload is None:
        raise invalid_token_error

    try:
        teacher_id = int(token_payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise invalid_token_error

    teacher = db.get(Teacher, teacher_id)
    if teacher is None or token_payload.get("pwd_fp") != password_fingerprint(teacher.password_hash):
        raise invalid_token_error

    teacher.password_hash = hash_password(payload.new_password)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
