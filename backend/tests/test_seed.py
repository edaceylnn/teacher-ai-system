from datetime import date

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import seed as seed_module
from app.db.base import Base
from app.db.seed import seed_demo_data
from app.models import (
    AcademicYear,
    Attendance,
    Classroom,
    Grade,
    Homework,
    Lesson,
    ScheduleEntry,
    Student,
    Teacher,
    TeacherAssignment,
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
        assert session.scalar(select(func.count()).select_from(Grade)) == 6
        assert session.scalar(select(func.count()).select_from(Attendance)) == 6
        assert session.scalar(select(func.count()).select_from(ScheduleEntry)) == 3
        assert session.scalar(select(func.count()).select_from(Homework)) == 2
        # 1 rehber + 2 branş for Eda, 1 branş for Ahmet.
        assert session.scalar(select(func.count()).select_from(TeacherAssignment)) == 4


def test_main_refuses_to_seed_production_without_explicit_opt_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.delenv("ALLOW_PROD_SEED", raising=False)

    with pytest.raises(SystemExit, match="Refusing to seed demo data in production"):
        seed_module.main()


def test_main_seeds_production_when_explicitly_allowed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setenv("ALLOW_PROD_SEED", "true")

    def fake_session_local():
        raise RuntimeError("guard passed — reached SessionLocal()")

    monkeypatch.setattr(seed_module, "SessionLocal", fake_session_local)

    with pytest.raises(RuntimeError, match="guard passed"):
        seed_module.main()
