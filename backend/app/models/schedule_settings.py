from datetime import time

from sqlalchemy import Boolean, Integer, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class SchoolScheduleSettings(TimestampMixin, Base):
    """School-wide (not per-teacher) daily lesson/break rhythm — a single
    row, always id=1. Every teacher's Ders Programı is generated from the
    same timetable, and schedule_entries conflict checks (app/api/routes/
    schedule.py) validate against it so a lesson can't be booked on top of
    a teneffüs/öğle arası. Mirrors frontend/src/utils/scheduleSettings.js's
    DEFAULT_SCHEDULE_SETTINGS shape, which this replaces as the source of
    truth (that file's localStorage persistence was always meant to move
    here — see its own comments)."""

    __tablename__ = "school_schedule_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    day_start_time: Mapped[time] = mapped_column(Time, nullable=False)
    lesson_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    break_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    lesson_count: Mapped[int] = mapped_column(Integer, nullable=False)
    lunch_break_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    lunch_break_after_lesson: Mapped[int] = mapped_column(Integer, nullable=False)
    lunch_break_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
