from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LessonBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class LessonCreate(LessonBase):
    teacher_id: int


class LessonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int | None
    created_at: datetime
    updated_at: datetime
