from datetime import date as dt_date
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import AssessmentType


class AssessmentBase(BaseModel):
    classroom_id: int
    lesson_id: int
    curriculum_outcome_id: int | None = None
    assessment_type: AssessmentType
    title: str = Field(min_length=1, max_length=160)
    description: str | None = None
    date: dt_date


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    classroom_id: int | None = None
    lesson_id: int | None = None
    curriculum_outcome_id: int | None = None
    assessment_type: AssessmentType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    date: dt_date | None = None


class AssessmentResponse(AssessmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    created_at: datetime
    updated_at: datetime


class AssessmentRecordUpdate(BaseModel):
    score: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    is_completed: bool | None = None


class AssessmentRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    student_id: int
    score: Decimal | None
    is_completed: bool | None
    created_at: datetime
    updated_at: datetime


class AssessmentRecordBulkEntry(AssessmentRecordUpdate):
    student_id: int


class AssessmentRecordBulkUpdate(BaseModel):
    records: list[AssessmentRecordBulkEntry]
