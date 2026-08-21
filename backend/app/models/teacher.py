import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class TeacherRole(str, enum.Enum):
    teacher = "teacher"
    admin = "admin"


class Teacher(TimestampMixin, Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[TeacherRole] = mapped_column(
        Enum(TeacherRole, name="teacher_role"),
        nullable=False,
        default=TeacherRole.teacher,
        server_default=TeacherRole.teacher.value,
    )
    # Profile-only ("Branş: Matematik Öğretmeni") — deliberately NOT used for
    # authorization. Real academic access always comes from TeacherAssignment.
    branch: Mapped[str | None] = mapped_column(String(120), nullable=True)

    classrooms: Mapped[list["Classroom"]] = relationship(
        back_populates="teacher",
        cascade="all, delete-orphan",
    )
    # No delete-orphan here: Lesson is now a shared subject catalog (see
    # models/lesson.py) — other teachers may hold active TeacherAssignment
    # rows against a lesson this teacher merely happened to create first, so
    # deleting this teacher must not delete/orphan those lessons.
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="teacher")

