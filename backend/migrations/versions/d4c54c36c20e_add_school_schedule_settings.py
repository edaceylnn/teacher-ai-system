"""add school schedule settings

Revision ID: d4c54c36c20e
Revises: 7c9d2e4f6a10
Create Date: 2026-09-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4c54c36c20e"
down_revision: Union[str, Sequence[str], None] = "7c9d2e4f6a10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "school_schedule_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("day_start_time", sa.Time(), nullable=False),
        sa.Column("lesson_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("break_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("lesson_count", sa.Integer(), nullable=False),
        sa.Column("lunch_break_enabled", sa.Boolean(), nullable=False),
        sa.Column("lunch_break_after_lesson", sa.Integer(), nullable=False),
        sa.Column("lunch_break_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Single row, id=1, seeded with the same defaults the frontend used to
    # keep in localStorage (frontend/src/utils/scheduleSettings.js's
    # DEFAULT_SCHEDULE_SETTINGS) — so existing timetables don't visually
    # shift the moment this migration runs.
    op.execute(
        """
        INSERT INTO school_schedule_settings
        (id, day_start_time, lesson_duration_minutes, break_duration_minutes, lesson_count,
         lunch_break_enabled, lunch_break_after_lesson, lunch_break_duration_minutes, created_at, updated_at)
        VALUES (1, '08:30', 40, 15, 8, true, 4, 40, now(), now())
        """
    )


def downgrade() -> None:
    op.drop_table("school_schedule_settings")
