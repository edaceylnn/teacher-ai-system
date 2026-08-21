from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Lesson(TimestampMixin, Base):
    """A shared subject catalog entry (e.g. "Matematik") — not owned by a
    single teacher. `teacher_id` only records who first added it to the
    catalog; it is never used for access control. Real access to a lesson's
    grades/homework for a given classroom comes from TeacherAssignment."""

    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    teacher: Mapped["Teacher | None"] = relationship(back_populates="lessons")
    grades: Mapped[list["Grade"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )

