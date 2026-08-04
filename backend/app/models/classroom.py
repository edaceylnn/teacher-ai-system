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

