import enum
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    excused = "excused"


class Attendance(TimestampMixin, Base):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"),
        nullable=False,
    )

    student: Mapped["Student"] = relationship(back_populates="attendance_records")

