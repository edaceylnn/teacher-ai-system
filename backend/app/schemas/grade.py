from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class GradeBase(BaseModel):
    exam_name: str = Field(min_length=1, max_length=120)
    score: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)


class GradeCreate(GradeBase):
    student_id: int
    lesson_id: int


class GradeUpdate(BaseModel):
    student_id: int | None = None
    lesson_id: int | None = None
    exam_name: str | None = Field(default=None, min_length=1, max_length=120)
    score: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)


class GradeResponse(GradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    lesson_id: int
    created_at: datetime
    updated_at: datetime
