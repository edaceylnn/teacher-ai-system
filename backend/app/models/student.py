import enum

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class StudentEnrollmentStatus(str, enum.Enum):
    active = "active"
    reported = "reported"


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enrollment_status: Mapped[StudentEnrollmentStatus] = mapped_column(
        Enum(StudentEnrollmentStatus, name="student_enrollment_status"),
        nullable=False,
        default=StudentEnrollmentStatus.active,
        server_default=StudentEnrollmentStatus.active.value,
    )
    parent_full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    parent_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    parent_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    home_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    observation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    classroom: Mapped["Classroom"] = relationship(back_populates="students")
    grades: Mapped[list["Grade"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )
    attendance_records: Mapped[list["Attendance"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )
    ai_outputs: Mapped[list["AIOutput"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )
