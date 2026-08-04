from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Grade(TimestampMixin, Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    exam_name: Mapped[str] = mapped_column(String(120), nullable=False)
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    student: Mapped["Student"] = relationship(back_populates="grades")
    lesson: Mapped["Lesson"] = relationship(back_populates="grades")

