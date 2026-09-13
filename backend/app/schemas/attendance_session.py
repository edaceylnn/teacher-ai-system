from datetime import date as dt_date
from datetime import datetime
from datetime import time as dt_time

from pydantic import BaseModel, ConfigDict

from app.models import AttendanceStatus


class AttendanceSessionBase(BaseModel):
    classroom_id: int
    lesson_id: int | None = None
    schedule_entry_id: int | None = None
    date: dt_date
    start_time: dt_time | None = None


class AttendanceSessionCreate(AttendanceSessionBase):
    pass


class AttendanceSessionResponse(AttendanceSessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    created_at: datetime
    updated_at: datetime


class AttendanceRecordUpdate(BaseModel):
    status: AttendanceStatus


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    student_id: int
    status: AttendanceStatus
    created_at: datetime
    updated_at: datetime


class AttendanceRecordBulkEntry(AttendanceRecordUpdate):
    student_id: int


class AttendanceRecordBulkUpdate(BaseModel):
    records: list[AttendanceRecordBulkEntry]
