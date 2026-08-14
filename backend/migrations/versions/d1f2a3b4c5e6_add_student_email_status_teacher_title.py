"""add student email/enrollment status and teacher title

Revision ID: d1f2a3b4c5e6
Revises: b7e4f5a6c8d9
Create Date: 2026-08-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1f2a3b4c5e6"
down_revision: Union[str, Sequence[str], None] = "b7e4f5a6c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

student_enrollment_status = sa.Enum("active", "reported", name="student_enrollment_status")


def upgrade() -> None:
    student_enrollment_status.create(op.get_bind(), checkfirst=True)
    op.add_column("students", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column(
        "students",
        sa.Column(
            "enrollment_status",
            student_enrollment_status,
            nullable=False,
            server_default="active",
        ),
    )
    op.add_column("teachers", sa.Column("title", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("teachers", "title")
    op.drop_column("students", "enrollment_status")
    op.drop_column("students", "email")
    student_enrollment_status.drop(op.get_bind(), checkfirst=True)
