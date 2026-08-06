"""add schedule and homework

Revision ID: 9c1d2e3f4a5b
Revises: 6b58f1c0f8d1
Create Date: 2026-08-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9c1d2e3f4a5b"
down_revision: Union[str, Sequence[str], None] = "6b58f1c0f8d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "schedule_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("classroom_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("teacher_id", "weekday", "start_time", "end_time", name="uq_schedule_teacher_time"),
    )
    op.create_index(op.f("ix_schedule_entries_classroom_id"), "schedule_entries", ["classroom_id"], unique=False)
    op.create_index(op.f("ix_schedule_entries_id"), "schedule_entries", ["id"], unique=False)
    op.create_index(op.f("ix_schedule_entries_lesson_id"), "schedule_entries", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_schedule_entries_teacher_id"), "schedule_entries", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_schedule_entries_weekday"), "schedule_entries", ["weekday"], unique=False)

    homework_status = postgresql.ENUM(
        "assigned",
        "completed",
        "missing",
        "late",
        name="homework_status",
        create_type=False,
    )
    homework_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "homeworks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("classroom_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", homework_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_homeworks_classroom_id"), "homeworks", ["classroom_id"], unique=False)
    op.create_index(op.f("ix_homeworks_due_date"), "homeworks", ["due_date"], unique=False)
    op.create_index(op.f("ix_homeworks_id"), "homeworks", ["id"], unique=False)
    op.create_index(op.f("ix_homeworks_lesson_id"), "homeworks", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_homeworks_teacher_id"), "homeworks", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_homeworks_teacher_id"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_lesson_id"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_id"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_due_date"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_classroom_id"), table_name="homeworks")
    op.drop_table("homeworks")
    sa.Enum(name="homework_status").drop(op.get_bind(), checkfirst=True)

    op.drop_index(op.f("ix_schedule_entries_weekday"), table_name="schedule_entries")
    op.drop_index(op.f("ix_schedule_entries_teacher_id"), table_name="schedule_entries")
    op.drop_index(op.f("ix_schedule_entries_lesson_id"), table_name="schedule_entries")
    op.drop_index(op.f("ix_schedule_entries_id"), table_name="schedule_entries")
    op.drop_index(op.f("ix_schedule_entries_classroom_id"), table_name="schedule_entries")
    op.drop_table("schedule_entries")
