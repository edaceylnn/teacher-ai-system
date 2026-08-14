from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.validators import validate_password_strength


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    teacher_id: int
    full_name: str
    email: str


class CurrentTeacherResponse(BaseModel):
    id: int
    full_name: str
    email: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)
