from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScheduleEntryBase(BaseModel):
    teacher_id: int
    classroom_id: int
    lesson_id: int
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    location: str | None = Field(default=None, max_length=120)

    @field_validator("end_time")
    @classmethod
    def end_time_must_be_after_start(cls, end_time: time, info):
        start_time = info.data.get("start_time")
        if start_time and end_time <= start_time:
            raise ValueError("end_time must be after start_time")
        return end_time


class ScheduleEntryCreate(ScheduleEntryBase):
    pass


class ScheduleEntryUpdate(BaseModel):
    classroom_id: int | None = None
    lesson_id: int | None = None
    weekday: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    location: str | None = Field(default=None, max_length=120)


class ScheduleEntryResponse(ScheduleEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
