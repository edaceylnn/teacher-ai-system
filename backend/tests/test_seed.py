from datetime import date

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db import seed as seed_module
from app.db.base import Base
from app.db.seed import DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD, reset_demo_data, seed_demo_data
from app.models import (
    AcademicYear,
    Assessment,
    AssessmentRecord,
    AttendanceRecord,
    AttendanceSession,
    Classroom,
    Lesson,
    ScheduleEntry,
    Student,
    Teacher,
    TeacherAssignment,
    TeacherRole,
)


def test_seed_demo_data_creates_complete_idempotent_demo_dataset() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # Mirrors what the teacher_assignments migration seeds in real
        # databases — seed_demo_data expects a current year to already exist.
        session.add(
            AcademicYear(label="2026-2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 30), is_current=True)
        )
        session.commit()

        seed_demo_data(session)
        seed_demo_data(session)

        # Eda Ceylan (rehber + Matematik/Turkce) and Ahmet Yılmaz (branş,
        # Matematik-only) — see seed.py.
        assert session.scalar(select(func.count()).select_from(Teacher)) == 2
        assert session.scalar(select(func.count()).select_from(Classroom)) == 1
        assert session.scalar(select(func.count()).select_from(Student)) == 3
        assert session.scalar(select(func.count()).select_from(Lesson)) == 2
        # 2 sınav Assessments (one per lesson, shared by all 3 students) + 2
        # ödev Assessments (Homework equivalents).
        assert session.scalar(select(func.count()).select_from(Assessment)) == 4
        assert session.scalar(select(func.count()).select_from(AssessmentRecord)) == 6
        assert session.scalar(select(func.count()).select_from(AttendanceSession)) == 2
        assert session.scalar(select(func.count()).select_from(AttendanceRecord)) == 6
        assert session.scalar(select(func.count()).select_from(ScheduleEntry)) == 3
        # 1 rehber + 2 branş for Eda, 1 branş for Ahmet.
        assert session.scalar(select(func.count()).select_from(TeacherAssignment)) == 4


def test_reset_demo_data_undoes_visitor_damage_and_pollution() -> None:
    # Simulates what a public demo visitor can do: hijack the demo password,
    # delete a seeded student, and create an unrelated extra classroom. A
    # reset must undo all three, not just repair what's missing.
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            AcademicYear(label="2026-2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 30), is_current=True)
        )
        session.commit()

        seed_demo_data(session)

        demo_teacher = session.scalar(select(Teacher).where(Teacher.email == DEMO_TEACHER_EMAIL))
        demo_teacher.password_hash = hash_password("hijacked-password")
        session.delete(session.scalar(select(Student).where(Student.first_name == "Ada")))
        session.add(
            Classroom(teacher_id=demo_teacher.id, name="Spam Sınıfı", grade_level="9")
        )
        session.commit()

        reset_demo_data(session)

        restored_teacher = session.scalar(select(Teacher).where(Teacher.email == DEMO_TEACHER_EMAIL))
        assert verify_password(DEMO_TEACHER_PASSWORD, restored_teacher.password_hash)
        assert restored_teacher.role == TeacherRole.admin
        assert session.scalar(select(func.count()).select_from(Student).where(Student.first_name == "Ada")) == 1
        assert session.scalar(select(func.count()).select_from(Classroom).where(Classroom.name == "Spam Sınıfı")) == 0
        assert session.scalar(select(func.count()).select_from(Classroom)) == 1
        assert session.scalar(select(func.count()).select_from(Teacher)) == 2


def test_main_refuses_to_seed_production_without_explicit_opt_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.delenv("ALLOW_PROD_SEED", raising=False)

    with pytest.raises(SystemExit, match="Refusing to seed demo data in production"):
        seed_module.main([])


def test_main_seeds_production_when_explicitly_allowed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setenv("ALLOW_PROD_SEED", "true")

    def fake_session_local():
        raise RuntimeError("guard passed — reached SessionLocal()")

    monkeypatch.setattr(seed_module, "SessionLocal", fake_session_local)

    with pytest.raises(RuntimeError, match="guard passed"):
        seed_module.main([])


def test_main_reset_flag_wipes_and_reseeds(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr(seed_module, "reset_demo_data", lambda db: calls.append("reset"))
    monkeypatch.setattr(seed_module, "seed_demo_data", lambda db: calls.append("seed"))
    monkeypatch.setattr(seed_module, "SessionLocal", lambda: Session(create_engine("sqlite+pysqlite:///:memory:")))

    seed_module.main(["--reset"])

    assert calls == ["reset"]
