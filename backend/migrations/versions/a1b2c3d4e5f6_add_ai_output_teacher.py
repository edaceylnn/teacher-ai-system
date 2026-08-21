"""add teacher_id to ai_outputs to scope read/update access to the generating teacher's authorized subject scope

Revision ID: a1b2c3d4e5f6
Revises: f3a4b5c6d7e8
Create Date: 2026-08-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ai_outputs", sa.Column("teacher_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_ai_outputs_teacher_id"), "ai_outputs", ["teacher_id"], unique=False)
    op.create_foreign_key(
        "fk_ai_outputs_teacher_id_teachers", "ai_outputs", "teachers", ["teacher_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_ai_outputs_teacher_id_teachers", "ai_outputs", type_="foreignkey")
    op.drop_index(op.f("ix_ai_outputs_teacher_id"), table_name="ai_outputs")
    op.drop_column("ai_outputs", "teacher_id")
