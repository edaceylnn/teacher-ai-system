import enum
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class HomeworkStatus(str, enum.Enum):
    assigned = "assigned"
    completed = "completed"
    missing = "missing"
    late = "late"


class Homework(TimestampMixin, Base):
    __tablename__ = "homeworks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False, index=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[HomeworkStatus] = mapped_column(
        Enum(HomeworkStatus, name="homework_status"),
        nullable=False,
        default=HomeworkStatus.assigned,
    )

    teacher: Mapped["Teacher"] = relationship()
    classroom: Mapped["Classroom"] = relationship()
    lesson: Mapped["Lesson"] = relationship()
