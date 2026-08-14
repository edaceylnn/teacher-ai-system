from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.validators import validate_password_strength


class TeacherBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    title: str | None = Field(default=None, max_length=120)


class TeacherCreate(TeacherBase):
    password: str | None = Field(default=None, min_length=8, max_length=128)
    password_hash: str | None = Field(default=None, min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, value: str | None) -> str | None:
        return validate_password_strength(value) if value is not None else value


class TeacherUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    title: str | None = Field(default=None, max_length=120)
    password_hash: str | None = Field(default=None, min_length=1, max_length=255)


class TeacherResponse(TeacherBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
