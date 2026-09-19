from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher, require_admin
from app.db.session import get_db
from app.models import SchoolScheduleSettings, Teacher
from app.schemas.schedule_settings import ScheduleSettingsResponse, ScheduleSettingsUpdate
from app.services.schedule_settings import get_or_create_settings

router = APIRouter(prefix="/school-schedule-settings", tags=["schedule-settings"])


@router.get("", response_model=ScheduleSettingsResponse)
def get_schedule_settings(
    db: Session = Depends(get_db),
    _current_teacher: Teacher = Depends(get_current_teacher),
) -> SchoolScheduleSettings:
    return get_or_create_settings(db)


@router.put("", response_model=ScheduleSettingsResponse)
def update_schedule_settings(
    payload: ScheduleSettingsUpdate,
    db: Session = Depends(get_db),
    _admin: Teacher = Depends(require_admin),
) -> SchoolScheduleSettings:
    # School-wide, not per-teacher (see SchoolScheduleSettings) — every
    # teacher's Ders Programı comes from the same timetable, so only an
    # admin changes it, same bar as Madde 12-style school-level settings.
    settings = get_or_create_settings(db)
    settings.day_start_time = payload.day_start_time
    settings.lesson_duration_minutes = payload.lesson_duration_minutes
    settings.break_duration_minutes = payload.break_duration_minutes
    settings.lesson_count = payload.lesson_count
    settings.lunch_break_enabled = payload.lunch_break.enabled
    settings.lunch_break_after_lesson = payload.lunch_break.after_lesson
    settings.lunch_break_duration_minutes = payload.lunch_break.duration_minutes
    db.commit()
    db.refresh(settings)
    return settings
