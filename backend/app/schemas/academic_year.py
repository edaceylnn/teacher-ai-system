from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AcademicYearResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime
    updated_at: datetime


class TermResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year_id: int
    name: str
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
