from datetime import datetime

from pydantic import BaseModel, Field


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
    created_at: datetime
    updated_at: datetime
