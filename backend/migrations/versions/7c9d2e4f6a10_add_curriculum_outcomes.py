"""add curriculum outcomes

Revision ID: 7c9d2e4f6a10
Revises: 362ec0a7619f
Create Date: 2026-09-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c9d2e4f6a10"
down_revision: Union[str, Sequence[str], None] = "362ec0a7619f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "curriculum_outcomes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("created_by_teacher_id", sa.Integer(), nullable=True),
        sa.Column("grade_level", sa.String(length=20), nullable=False),
        sa.Column("unit_title", sa.String(length=180), nullable=True),
        sa.Column("code", sa.String(length=60), nullable=True),
        sa.Column("outcome_text", sa.Text(), nullable=False),
        sa.Column("source_name", sa.String(length=160), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("version_label", sa.String(length=80), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_teacher_id"], ["teachers.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "lesson_id",
            "grade_level",
            "code",
            "version_label",
            name="uq_curriculum_outcome_lesson_grade_code_version",
        ),
    )
    op.create_index(op.f("ix_curriculum_outcomes_id"), "curriculum_outcomes", ["id"], unique=False)
    op.create_index(
        op.f("ix_curriculum_outcomes_created_by_teacher_id"),
        "curriculum_outcomes",
        ["created_by_teacher_id"],
        unique=False,
    )
    op.create_index(op.f("ix_curriculum_outcomes_lesson_id"), "curriculum_outcomes", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_curriculum_outcomes_grade_level"), "curriculum_outcomes", ["grade_level"], unique=False)
    op.create_index(op.f("ix_curriculum_outcomes_code"), "curriculum_outcomes", ["code"], unique=False)
    op.create_index(op.f("ix_curriculum_outcomes_is_active"), "curriculum_outcomes", ["is_active"], unique=False)

    op.add_column("assessments", sa.Column("curriculum_outcome_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_assessments_curriculum_outcome_id"),
        "assessments",
        ["curriculum_outcome_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_assessments_curriculum_outcome_id_curriculum_outcomes",
        "assessments",
        "curriculum_outcomes",
        ["curriculum_outcome_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_assessments_curriculum_outcome_id_curriculum_outcomes", "assessments", type_="foreignkey")
    op.drop_index(op.f("ix_assessments_curriculum_outcome_id"), table_name="assessments")
    op.drop_column("assessments", "curriculum_outcome_id")
    op.drop_table("curriculum_outcomes")
