from datetime import date as dt_date
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import AttendanceStatus


class AttendanceBase(BaseModel):
    date: dt_date
    status: AttendanceStatus


class AttendanceCreate(AttendanceBase):
    student_id: int


class AttendanceUpdate(BaseModel):
    student_id: int | None = None
    date: dt_date | None = None
    status: AttendanceStatus | None = None


class AttendanceResponse(AttendanceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    created_at: datetime
    updated_at: datetime
