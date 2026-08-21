from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import TeacherRole
from app.schemas.validators import validate_password_strength


class TeacherBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    title: str | None = Field(default=None, max_length=120)
    # Profile-only ("Branş: Matematik Öğretmeni") — never consulted for
    # authorization, see models/teacher.py.
    branch: str | None = Field(default=None, max_length=120)


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
    branch: str | None = Field(default=None, max_length=120)
    password_hash: str | None = Field(default=None, min_length=1, max_length=255)


class TeacherRoleUpdate(BaseModel):
    role: TeacherRole


class TeacherResponse(TeacherBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: TeacherRole
    created_at: datetime
    updated_at: datetime


class TeacherAssignmentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    classroom_id: int
    classroom_name: str
    lesson_id: int | None
    lesson_name: str | None
    is_active: bool


class TeacherAdminResponse(TeacherResponse):
    """Extends TeacherResponse with an assignment summary — only returned to
    admins (see GET /teachers), never to a teacher's own /me lookup."""

    assignments: list[TeacherAssignmentSummary] = []
