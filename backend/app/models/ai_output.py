import enum

from sqlalchemy import Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class AIOutputType(str, enum.Enum):
    report_comment = "report_comment"
    parent_message = "parent_message"
    development_suggestion = "development_suggestion"


class AIOutput(TimestampMixin, Base):
    __tablename__ = "ai_outputs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    output_type: Mapped[AIOutputType] = mapped_column(
        Enum(AIOutputType, name="ai_output_type"),
        nullable=False,
    )
    input_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_payload: Mapped[dict] = mapped_column(JSON, nullable=False)

    student: Mapped["Student"] = relationship(back_populates="ai_outputs")

