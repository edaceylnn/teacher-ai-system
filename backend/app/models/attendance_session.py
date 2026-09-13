import enum
from datetime import date as date_
from datetime import time as time_

from sqlalchemy import Date, Enum, ForeignKey, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    excused = "excused"


class AttendanceSession(TimestampMixin, Base):
    """A single roll-call for a classroom on a given date — tied to a
    specific lesson (and optionally a specific ScheduleEntry slot) when
    taken from the schedule, or lesson-less for a general/day-level roll
    call. lesson_id + schedule_entry_id together let the same lesson be
    rolled-called more than once on the same day (different periods)."""

    __tablename__ = "attendance_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), nullable=True, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False, index=True)
    schedule_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("schedule_entries.id"), nullable=True, index=True
    )
    date: Mapped[date_] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time_ | None] = mapped_column(Time, nullable=True)

    classroom: Mapped["Classroom"] = relationship()
    lesson: Mapped["Lesson"] = relationship()
    teacher: Mapped["Teacher"] = relationship()
    schedule_entry: Mapped["ScheduleEntry"] = relationship()
    records: Mapped[list["AttendanceRecord"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class AttendanceRecord(TimestampMixin, Base):
    """One student's status (present/absent/excused) within an
    AttendanceSession."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_record_student"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"),
        nullable=False,
    )

    session: Mapped["AttendanceSession"] = relationship(back_populates="records")
    student: Mapped["Student"] = relationship(back_populates="attendance_records")
