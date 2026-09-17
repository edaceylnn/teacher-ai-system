from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Classroom(TimestampMixin, Base):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    grade_level: Mapped[str] = mapped_column(String(40), nullable=False)

    teacher: Mapped["Teacher"] = relationship(back_populates="classrooms")
    students: Mapped[list["Student"]] = relationship(
        back_populates="classroom",
        cascade="all, delete-orphan",
    )
    # Deleting a classroom deletes everything scoped to it — assignments,
    # academic records, and its timetable slots — matching the destructive
    # framing already shown to the teacher ("Sınıfa bağlı öğrenciler de
    # silinebilir."). Without these, deleting a classroom that's ever had a
    # teacher assigned, a lesson scheduled, or a grade/attendance entry
    # crashes with an unhandled FK-violation 500.
    teacher_assignments: Mapped[list["TeacherAssignment"]] = relationship(
        back_populates="classroom",
        cascade="all, delete-orphan",
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="classroom",
        cascade="all, delete-orphan",
    )
    attendance_sessions: Mapped[list["AttendanceSession"]] = relationship(
        back_populates="classroom",
        cascade="all, delete-orphan",
    )
    schedule_entries: Mapped[list["ScheduleEntry"]] = relationship(
        back_populates="classroom",
        cascade="all, delete-orphan",
    )
