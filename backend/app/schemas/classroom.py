from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClassroomBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    grade_level: str = Field(min_length=1, max_length=40)


class ClassroomCreate(ClassroomBase):
    teacher_id: int


class ClassroomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    grade_level: str | None = Field(default=None, min_length=1, max_length=40)


class ClassroomResponse(ClassroomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    created_at: datetime
    updated_at: datetime
