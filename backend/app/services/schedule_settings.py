from datetime import time

from sqlalchemy.orm import Session

from app.models import SchoolScheduleSettings

SETTINGS_ROW_ID = 1

_DEFAULTS = {
    "day_start_time": time(8, 30),
    "lesson_duration_minutes": 40,
    "break_duration_minutes": 15,
    "lesson_count": 8,
    "lunch_break_enabled": True,
    "lunch_break_after_lesson": 4,
    "lunch_break_duration_minutes": 40,
}


def get_or_create_settings(db: Session) -> SchoolScheduleSettings:
    """There's always exactly one row (id=1) — school-wide, not per-teacher,
    see SchoolScheduleSettings. The migration seeds it, but tests build their
    schema fresh without running migrations, so this also covers that case."""
    settings = db.get(SchoolScheduleSettings, SETTINGS_ROW_ID)
    if settings is None:
        settings = SchoolScheduleSettings(id=SETTINGS_ROW_ID, **_DEFAULTS)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _time_to_minutes(value: time) -> int:
    return value.hour * 60 + value.minute


def _minutes_to_time(minutes: int) -> time:
    # Extreme (but schema-legal) settings — e.g. 12 lessons at 180 minutes
    # each — can push a cursor past 24h; wrap rather than let datetime.time
    # raise, since this is display-only math, not a real calendar date.
    minutes %= 24 * 60
    return time(hour=minutes // 60, minute=minutes % 60)


def compute_break_windows(settings: SchoolScheduleSettings) -> list[tuple[time, time]]:
    """The teneffüs/öğle arası windows implied by the daily lesson rhythm —
    same shape as frontend/src/utils/scheduleSettings.js's buildLessonSlots,
    but returning only the break-typed slots (lesson slots aren't needed
    here: a schedule entry landing on one is exactly the point)."""
    windows: list[tuple[time, time]] = []
    cursor = _time_to_minutes(settings.day_start_time)

    for lesson_number in range(1, settings.lesson_count + 1):
        cursor += settings.lesson_duration_minutes

        is_lunch_after_this = settings.lunch_break_enabled and lesson_number == settings.lunch_break_after_lesson
        is_last_lesson = lesson_number == settings.lesson_count
        if is_last_lesson and not is_lunch_after_this:
            break

        break_length = settings.lunch_break_duration_minutes if is_lunch_after_this else settings.break_duration_minutes
        break_start = cursor
        break_end = break_start + break_length
        windows.append((_minutes_to_time(break_start), _minutes_to_time(break_end)))
        cursor = break_end

    return windows


def find_overlapping_break(
    settings: SchoolScheduleSettings, start_time: time, end_time: time
) -> tuple[time, time] | None:
    for break_start, break_end in compute_break_windows(settings):
        if start_time < break_end and end_time > break_start:
            return (break_start, break_end)
    return None
