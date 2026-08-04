from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import AttendanceStatus


class StudentBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    observation_notes: str | None = None


class StudentCreate(StudentBase):
    classroom_id: int


class StudentUpdate(BaseModel):
    classroom_id: int | None = None
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    observation_notes: str | None = None


class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    classroom_id: int
    created_at: datetime
    updated_at: datetime


class StudentProfileClassroom(BaseModel):
    id: int
    name: str
    grade_level: str


class StudentProfileGrade(BaseModel):
    id: int
    lesson_id: int
    lesson_name: str
    exam_name: str
    score: Decimal


class StudentProfileAttendanceRecord(BaseModel):
    id: int
    date: str
    status: AttendanceStatus


class StudentProfileAttendanceSummary(BaseModel):
    present: int
    absent: int
    excused: int
    total: int


class StudentProfileResponse(StudentResponse):
    classroom: StudentProfileClassroom
    grades: list[StudentProfileGrade]
    attendance_records: list[StudentProfileAttendanceRecord]
    attendance_summary: StudentProfileAttendanceSummary
