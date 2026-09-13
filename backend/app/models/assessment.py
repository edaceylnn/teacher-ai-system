import enum
from datetime import date as date_
from decimal import Decimal

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AssessmentType(str, enum.Enum):
    sinav = "sinav"
    ders_ici_performans = "ders_ici_performans"
    performans_odevi = "performans_odevi"
    odev = "odev"


class Assessment(TimestampMixin, Base):
    """A single evaluation event for a classroom+lesson (an exam, an
    in-class performance entry, a performance task, or a homework
    assignment) — one row per event, not per student. See AssessmentRecord
    for the per-student outcome."""

    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), nullable=False, index=True)
    assessment_type: Mapped[AssessmentType] = mapped_column(
        Enum(AssessmentType, name="assessment_type"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date_] = mapped_column(Date, nullable=False, index=True)

    classroom: Mapped["Classroom"] = relationship()
    lesson: Mapped["Lesson"] = relationship()
    teacher: Mapped["Teacher"] = relationship()
    records: Mapped[list["AssessmentRecord"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )


class AssessmentRecord(TimestampMixin, Base):
    """One student's outcome for a given Assessment — a numeric score
    (exam/in-class performance/performance task/homework) and/or a
    completion flag (primarily for homework)."""

    __tablename__ = "assessment_records"
    __table_args__ = (
        UniqueConstraint("assessment_id", "student_id", name="uq_assessment_record_student"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    is_completed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    assessment: Mapped["Assessment"] = relationship(back_populates="records")
    student: Mapped["Student"] = relationship(back_populates="assessment_records")
