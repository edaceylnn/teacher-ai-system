from datetime import time

from sqlalchemy import ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ScheduleEntry(TimestampMixin, Base):
    __tablename__ = "schedule_entries"
    __table_args__ = (
        UniqueConstraint(
            "teacher_id",
            "weekday",
            "start_time",
            "end_time",
            name="uq_schedule_teacher_time",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False, index=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    weekday: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)

    teacher: Mapped["Teacher"] = relationship()
    classroom: Mapped["Classroom"] = relationship()
    lesson: Mapped["Lesson"] = relationship()
