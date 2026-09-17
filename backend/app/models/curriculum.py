from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CurriculumOutcome(TimestampMixin, Base):
    """School/teacher managed curriculum outcome.

    MEB text is not bundled by the app; schools can enter or import the
    outcomes they are allowed to use, with source metadata for traceability.
    """

    __tablename__ = "curriculum_outcomes"
    __table_args__ = (
        UniqueConstraint(
            "lesson_id",
            "grade_level",
            "code",
            "version_label",
            name="uq_curriculum_outcome_lesson_grade_code_version",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    created_by_teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id"), nullable=True, index=True)
    grade_level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    unit_title: Mapped[str | None] = mapped_column(String(180), nullable=True)
    code: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    outcome_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true", index=True)

    lesson: Mapped["Lesson"] = relationship(back_populates="curriculum_outcomes")
    created_by_teacher: Mapped["Teacher | None"] = relationship()
    assessments: Mapped[list["Assessment"]] = relationship(back_populates="curriculum_outcome")
