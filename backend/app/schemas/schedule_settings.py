from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LunchBreakSettings(BaseModel):
    enabled: bool
    after_lesson: int = Field(ge=1, le=12)
    duration_minutes: int = Field(ge=5, le=120)


class ScheduleSettingsUpdate(BaseModel):
    day_start_time: time
    lesson_duration_minutes: int = Field(ge=10, le=180)
    break_duration_minutes: int = Field(ge=0, le=60)
    lesson_count: int = Field(ge=1, le=12)
    lunch_break: LunchBreakSettings

    @model_validator(mode="after")
    def _check_lunch_break_after_lesson(self) -> "ScheduleSettingsUpdate":
        if self.lunch_break.enabled and self.lunch_break.after_lesson > self.lesson_count:
            raise ValueError("lunch_break.after_lesson cannot be after the last lesson")
        return self


class ScheduleSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_start_time: time
    lesson_duration_minutes: int
    break_duration_minutes: int
    lesson_count: int
    lunch_break_enabled: bool
    lunch_break_after_lesson: int
    lunch_break_duration_minutes: int
    updated_at: datetime
