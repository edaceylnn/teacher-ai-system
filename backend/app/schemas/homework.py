from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# Legacy compatibility schema — Homework is now stored as an
# Assessment(assessment_type="odev"). `status` is no longer a persisted
# field (it was class-wide and largely redundant with per-student
# completion); it is accepted on write for wire compatibility but ignored,
# and derived on read from the assessment's records — see routes/homework.py.


class HomeworkBase(BaseModel):
    teacher_id: int
    classroom_id: int
    lesson_id: int
    title: str = Field(min_length=1, max_length=160)
    description: str | None = None
    due_date: dt_date
    status: str = "assigned"


class HomeworkCreate(HomeworkBase):
    pass


class HomeworkUpdate(BaseModel):
    classroom_id: int | None = None
    lesson_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    due_date: dt_date | None = None
    status: str | None = None


class HomeworkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    classroom_id: int
    lesson_id: int
    title: str
    description: str | None
    due_date: dt_date
    status: str
    created_at: datetime
    updated_at: datetime
