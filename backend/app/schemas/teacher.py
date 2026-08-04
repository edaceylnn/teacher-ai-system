from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TeacherBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)


class TeacherCreate(TeacherBase):
    password_hash: str = Field(min_length=1, max_length=255)


class TeacherUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    password_hash: str | None = Field(default=None, min_length=1, max_length=255)


class TeacherResponse(TeacherBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
