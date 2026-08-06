from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import HomeworkStatus


class HomeworkBase(BaseModel):
    teacher_id: int
    classroom_id: int
    lesson_id: int
    title: str = Field(min_length=1, max_length=160)
    description: str | None = None
    due_date: dt_date
    status: HomeworkStatus = HomeworkStatus.assigned


class HomeworkCreate(HomeworkBase):
    pass


class HomeworkUpdate(BaseModel):
    classroom_id: int | None = None
    lesson_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    due_date: dt_date | None = None
    status: HomeworkStatus | None = None


class HomeworkResponse(HomeworkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
