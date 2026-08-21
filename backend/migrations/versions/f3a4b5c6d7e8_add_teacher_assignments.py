"""add academic years, terms, teacher assignments; teacher role/branch; lessons become a shared catalog

Revision ID: f3a4b5c6d7e8
Revises: d1f2a3b4c5e6
Create Date: 2026-08-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "d1f2a3b4c5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

teacher_role = postgresql.ENUM("teacher", "admin", name="teacher_role", create_type=False)


def upgrade() -> None:
    # --- schema ---------------------------------------------------------
    op.create_table(
        "academic_years",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=20), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_current", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("label"),
    )
    op.create_index(op.f("ix_academic_years_id"), "academic_years", ["id"], unique=False)

    op.create_table(
        "terms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("academic_year_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=40), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_terms_academic_year_id"), "terms", ["academic_year_id"], unique=False)
    op.create_index(op.f("ix_terms_id"), "terms", ["id"], unique=False)

    teacher_role.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "teachers",
        sa.Column("role", teacher_role, nullable=False, server_default="teacher"),
    )
    op.add_column("teachers", sa.Column("branch", sa.String(length=120), nullable=True))

    # Lesson becomes a shared subject catalog (madde 16: aynı ders farklı
    # öğretmenlere atanabilmeli) — teacher_id stays only as "who first added
    # it", no longer a NOT NULL ownership column.
    op.alter_column("lessons", "teacher_id", existing_type=sa.Integer(), nullable=True)

    op.create_table(
        "teacher_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("classroom_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=True),
        sa.Column("academic_year_id", sa.Integer(), nullable=False),
        sa.Column("term_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["academic_year_id"], ["academic_years.id"]),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.ForeignKeyConstraint(["term_id"], ["terms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teacher_assignments_academic_year_id"), "teacher_assignments", ["academic_year_id"], unique=False)
    op.create_index(op.f("ix_teacher_assignments_classroom_id"), "teacher_assignments", ["classroom_id"], unique=False)
    op.create_index(op.f("ix_teacher_assignments_id"), "teacher_assignments", ["id"], unique=False)
    op.create_index(op.f("ix_teacher_assignments_lesson_id"), "teacher_assignments", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_teacher_assignments_teacher_id"), "teacher_assignments", ["teacher_id"], unique=False)
    op.create_index(op.f("ix_teacher_assignments_term_id"), "teacher_assignments", ["term_id"], unique=False)

    # --- data backfill ---------------------------------------------------
    # Turns today's implicit "one teacher owns everything" reality into
    # explicit TeacherAssignment rows, so existing accounts keep exactly the
    # access they have today after this migration. Nothing here is optional
    # demo data — every environment needs a current academic year to hang
    # future assignments off of.
    connection = op.get_bind()

    academic_year_id = connection.execute(
        sa.text(
            "INSERT INTO academic_years (label, start_date, end_date, is_current, created_at, updated_at) "
            "VALUES (:label, :start_date, :end_date, true, now(), now()) RETURNING id"
        ),
        {"label": "2026-2027", "start_date": "2026-09-01", "end_date": "2027-06-30"},
    ).scalar_one()

    term_id = connection.execute(
        sa.text(
            "INSERT INTO terms (academic_year_id, name, start_date, end_date, created_at, updated_at) "
            "VALUES (:academic_year_id, :name, :start_date, :end_date, now(), now()) RETURNING id"
        ),
        {"academic_year_id": academic_year_id, "name": "1. Dönem", "start_date": "2026-09-01", "end_date": "2027-01-31"},
    ).scalar_one()

    # Homeroom ("rehber") assignment for every existing classroom, from its
    # current owning teacher.
    connection.execute(
        sa.text(
            "INSERT INTO teacher_assignments "
            "(teacher_id, classroom_id, lesson_id, academic_year_id, term_id, is_active, created_at, updated_at) "
            "SELECT teacher_id, id, NULL, :academic_year_id, :term_id, true, now(), now() FROM classrooms"
        ),
        {"academic_year_id": academic_year_id, "term_id": term_id},
    )

    # Subject ("branş") assignment for every (classroom, lesson) pair that
    # today's single-owner model implied: a lesson's creator teaching it in
    # every classroom they themselves own.
    connection.execute(
        sa.text(
            "INSERT INTO teacher_assignments "
            "(teacher_id, classroom_id, lesson_id, academic_year_id, term_id, is_active, created_at, updated_at) "
            "SELECT l.teacher_id, c.id, l.id, :academic_year_id, :term_id, true, now(), now() "
            "FROM lessons l JOIN classrooms c ON c.teacher_id = l.teacher_id "
            "WHERE l.teacher_id IS NOT NULL"
        ),
        {"academic_year_id": academic_year_id, "term_id": term_id},
    )

    # Demo account becomes an admin so the new "Öğretmenler"/assignment
    # screens are reachable without a separate manual promotion step.
    connection.execute(
        sa.text("UPDATE teachers SET role = 'admin' WHERE email = :email"),
        {"email": "eda@example.com"},
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_teacher_assignments_term_id"), table_name="teacher_assignments")
    op.drop_index(op.f("ix_teacher_assignments_teacher_id"), table_name="teacher_assignments")
    op.drop_index(op.f("ix_teacher_assignments_lesson_id"), table_name="teacher_assignments")
    op.drop_index(op.f("ix_teacher_assignments_id"), table_name="teacher_assignments")
    op.drop_index(op.f("ix_teacher_assignments_classroom_id"), table_name="teacher_assignments")
    op.drop_index(op.f("ix_teacher_assignments_academic_year_id"), table_name="teacher_assignments")
    op.drop_table("teacher_assignments")

    op.alter_column("lessons", "teacher_id", existing_type=sa.Integer(), nullable=False)

    op.drop_column("teachers", "branch")
    op.drop_column("teachers", "role")
    teacher_role.drop(op.get_bind(), checkfirst=True)

    op.drop_index(op.f("ix_terms_id"), table_name="terms")
    op.drop_index(op.f("ix_terms_academic_year_id"), table_name="terms")
    op.drop_table("terms")

    op.drop_index(op.f("ix_academic_years_id"), table_name="academic_years")
    op.drop_table("academic_years")
