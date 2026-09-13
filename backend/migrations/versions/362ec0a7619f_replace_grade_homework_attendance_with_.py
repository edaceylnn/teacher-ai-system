"""replace grade/homework/attendance with assessment/attendance_session

Revision ID: 362ec0a7619f
Revises: 14fd766a4e78
Create Date: 2026-08-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


# revision identifiers, used by Alembic.
revision: str = '362ec0a7619f'
down_revision: Union[str, Sequence[str], None] = '14fd766a4e78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Clean cutover, no data migration: Grade/Homework/HomeworkSubmission
    become Assessment/AssessmentRecord, and the flat Attendance table
    becomes AttendanceSession/AttendanceRecord. Existing rows in the
    replaced tables are demo data only and are not preserved.
    """
    # --- Assessment / AssessmentRecord (replaces Grade, Homework, HomeworkSubmission) ---
    # Created implicitly by create_table() below (via the Enum column) —
    # unlike op.add_column(), create_table() creates enum types on its own,
    # so a separate .create() call here would collide with it.
    assessment_type = sa.Enum(
        "sinav", "ders_ici_performans", "performans_odevi", "odev",
        name="assessment_type",
    )

    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("classroom_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("assessment_type", assessment_type, nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessments_id"), "assessments", ["id"], unique=False)
    op.create_index(op.f("ix_assessments_classroom_id"), "assessments", ["classroom_id"], unique=False)
    op.create_index(op.f("ix_assessments_lesson_id"), "assessments", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_assessments_teacher_id"), "assessments", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_assessments_assessment_type"), "assessments", ["assessment_type"], unique=False)
    op.create_index(op.f("ix_assessments_date"), "assessments", ["date"], unique=False)

    op.create_table(
        "assessment_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assessment_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id", "student_id", name="uq_assessment_record_student"),
    )
    op.create_index(op.f("ix_assessment_records_id"), "assessment_records", ["id"], unique=False)
    op.create_index(op.f("ix_assessment_records_assessment_id"), "assessment_records", ["assessment_id"], unique=False)
    op.create_index(op.f("ix_assessment_records_student_id"), "assessment_records", ["student_id"], unique=False)

    # --- Drop the old Homework/HomeworkSubmission/Grade tables ---
    op.drop_table("homework_submissions")
    op.drop_table("homeworks")
    op.execute("DROP TYPE IF EXISTS homework_status")
    op.drop_table("grades")
    op.execute("DROP TYPE IF EXISTS grade_category")

    # --- Attendance: flat table -> AttendanceSession/AttendanceRecord ---
    # attendance_status enum already exists and is reused as-is.
    op.drop_table("attendance_records")

    op.create_table(
        "attendance_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("classroom_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("schedule_entry_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.ForeignKeyConstraint(["schedule_entry_id"], ["schedule_entries.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_sessions_id"), "attendance_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_sessions_classroom_id"), "attendance_sessions", ["classroom_id"], unique=False)
    op.create_index(op.f("ix_attendance_sessions_lesson_id"), "attendance_sessions", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_attendance_sessions_teacher_id"), "attendance_sessions", ["teacher_id"], unique=False)
    op.create_index(
        op.f("ix_attendance_sessions_schedule_entry_id"), "attendance_sessions", ["schedule_entry_id"], unique=False
    )
    op.create_index(op.f("ix_attendance_sessions_date"), "attendance_sessions", ["date"], unique=False)

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            # Reusing the pre-existing attendance_status type (untouched by
            # this migration) — create_type=False so create_table() doesn't
            # try to (re-)create it.
            PGEnum("present", "absent", "excused", name="attendance_status", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["attendance_sessions.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "student_id", name="uq_attendance_record_student"),
    )
    op.create_index(op.f("ix_attendance_records_id"), "attendance_records", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_records_session_id"), "attendance_records", ["session_id"], unique=False)
    op.create_index(op.f("ix_attendance_records_student_id"), "attendance_records", ["student_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema.

    Best-effort structural reversal only — does not restore data (the
    upgrade doesn't preserve any either).
    """
    op.drop_table("attendance_records")
    op.drop_table("attendance_sessions")

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("status", PGEnum("present", "absent", "excused", name="attendance_status", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_records_id"), "attendance_records", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_records_student_id"), "attendance_records", ["student_id"], unique=False)

    grade_category = sa.Enum("sinav", "ders_ici_performans", "performans_odevi", "odev", name="grade_category")
    op.create_table(
        "grades",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("exam_name", sa.String(length=120), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("category", grade_category, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grades_id"), "grades", ["id"], unique=False)
    op.create_index(op.f("ix_grades_student_id"), "grades", ["student_id"], unique=False)
    op.create_index(op.f("ix_grades_lesson_id"), "grades", ["lesson_id"], unique=False)

    homework_status = sa.Enum("assigned", "completed", "missing", "late", name="homework_status")
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
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_homeworks_id"), "homeworks", ["id"], unique=False)
    op.create_index(op.f("ix_homeworks_teacher_id"), "homeworks", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_homeworks_classroom_id"), "homeworks", ["classroom_id"], unique=False)
    op.create_index(op.f("ix_homeworks_lesson_id"), "homeworks", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_homeworks_due_date"), "homeworks", ["due_date"], unique=False)

    op.create_table(
        "homework_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("homework_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["homework_id"], ["homeworks.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("homework_id", "student_id", name="uq_homework_submission_student"),
    )
    op.create_index(op.f("ix_homework_submissions_id"), "homework_submissions", ["id"], unique=False)
    op.create_index(op.f("ix_homework_submissions_homework_id"), "homework_submissions", ["homework_id"], unique=False)
    op.create_index(op.f("ix_homework_submissions_student_id"), "homework_submissions", ["student_id"], unique=False)

    op.drop_table("assessment_records")
    op.drop_table("assessments")
    op.execute("DROP TYPE IF EXISTS assessment_type")
