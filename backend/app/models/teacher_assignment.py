from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class TeacherAssignment(TimestampMixin, Base):
    """The single source of truth for a teacher's academic access.

    A row with `lesson_id IS NULL` is a "rehber" (homeroom) assignment: the
    teacher can view the full roster and a general academic summary for that
    classroom, but cannot create/edit grades. A row with `lesson_id` set is a
    subject ("branş") assignment: the teacher can view AND edit grades,
    homework, and schedule entries for that specific classroom+lesson.
    Deactivating an assignment (`is_active=False`) preserves history instead
    of deleting it, since past academic years must remain intact.
    """

    __tablename__ = "teacher_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False, index=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), nullable=True, index=True)
    academic_year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id"), nullable=False, index=True)
    term_id: Mapped[int | None] = mapped_column(ForeignKey("terms.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    teacher: Mapped["Teacher"] = relationship()
    classroom: Mapped["Classroom"] = relationship()
    lesson: Mapped["Lesson | None"] = relationship()
    academic_year: Mapped["AcademicYear"] = relationship()
    term: Mapped["Term | None"] = relationship()
