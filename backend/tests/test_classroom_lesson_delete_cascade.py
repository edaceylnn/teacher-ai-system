from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import (
    AcademicYear,
    Assessment,
    AttendanceSession,
    ScheduleEntry,
    Teacher,
    TeacherAssignment,
)

# Regression coverage for the classroom/lesson delete crash found in the
# 2026-09-14 project audit: DELETE /classrooms/{id} and DELETE /lessons/{id}
# used to 500 (an unhandled FK-violation IntegrityError) whenever the
# classroom/lesson had any related teacher_assignments, assessments,
# attendance_sessions, or schedule_entries — which is true for almost any
# classroom/lesson that has actually been used. SQLite (this test's engine)
# doesn't enforce FK constraints by default, so these tests exercise the
# ORM-level cascade relationships directly rather than relying on the DB to
# reject an incomplete delete.


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(engine)

    with TestingSessionLocal() as session:
        session.add(
            AcademicYear(label="2026-2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 30), is_current=True)
        )
        session.commit()
        yield session

    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def teacher(db_session: Session) -> Teacher:
    teacher = Teacher(full_name="Eda Ceylan", email="eda@example.com", password_hash="hashed-password")
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


def _fully_used_classroom_and_lesson(client: TestClient, db_session: Session, teacher: Teacher) -> dict:
    """Sets up a classroom+lesson with one row in every table that used to
    block deletion: an (auto-created, homeroom) TeacherAssignment from
    classroom creation, a subject TeacherAssignment, an Assessment, an
    AttendanceSession, and a ScheduleEntry."""
    classroom = client.post(
        "/classrooms", json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"}
    ).json()
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()

    academic_year = db_session.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))
    db_session.add(
        TeacherAssignment(
            teacher_id=teacher.id,
            classroom_id=classroom["id"],
            lesson_id=lesson["id"],
            academic_year_id=academic_year.id,
            is_active=True,
        )
    )
    db_session.commit()

    assessment = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "assessment_type": "sinav",
            "title": "1. Yazılı",
            "date": "2026-02-01",
        },
    ).json()

    attendance_session = client.post(
        "/attendance-sessions",
        json={"classroom_id": classroom["id"], "lesson_id": lesson["id"], "date": "2026-02-01"},
    ).json()

    schedule_entry = client.post(
        "/schedule-entries",
        json={
            "teacher_id": teacher.id,
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "weekday": 0,
            "start_time": "08:30:00",
            "end_time": "09:10:00",
        },
    ).json()

    return {
        "classroom": classroom,
        "lesson": lesson,
        "assessment": assessment,
        "attendance_session": attendance_session,
        "schedule_entry": schedule_entry,
    }


def test_deleting_classroom_cascades_related_records(
    client: TestClient, db_session: Session, teacher: Teacher
) -> None:
    setup = _fully_used_classroom_and_lesson(client, db_session, teacher)
    classroom_id = setup["classroom"]["id"]

    # Sanity check: the classroom really does have dependents in every table
    # that previously caused the crash.
    assert db_session.scalar(
        select(TeacherAssignment).where(TeacherAssignment.classroom_id == classroom_id)
    )
    assert db_session.scalar(select(Assessment).where(Assessment.classroom_id == classroom_id))
    assert db_session.scalar(select(AttendanceSession).where(AttendanceSession.classroom_id == classroom_id))
    assert db_session.scalar(select(ScheduleEntry).where(ScheduleEntry.classroom_id == classroom_id))

    response = client.delete(f"/classrooms/{classroom_id}")
    assert response.status_code == 204

    assert client.get(f"/classrooms/{classroom_id}").status_code == 404
    assert (
        db_session.scalar(select(TeacherAssignment).where(TeacherAssignment.classroom_id == classroom_id)) is None
    )
    assert db_session.scalar(select(Assessment).where(Assessment.classroom_id == classroom_id)) is None
    assert (
        db_session.scalar(select(AttendanceSession).where(AttendanceSession.classroom_id == classroom_id)) is None
    )
    assert db_session.scalar(select(ScheduleEntry).where(ScheduleEntry.classroom_id == classroom_id)) is None
    # The lesson itself is a shared catalog entry, not classroom-scoped — it
    # must survive a classroom delete.
    assert client.get(f"/lessons/{setup['lesson']['id']}").status_code != 404


def test_deleting_lesson_cascades_related_records(client: TestClient, db_session: Session, teacher: Teacher) -> None:
    setup = _fully_used_classroom_and_lesson(client, db_session, teacher)
    lesson_id = setup["lesson"]["id"]

    assert db_session.scalar(select(TeacherAssignment).where(TeacherAssignment.lesson_id == lesson_id))
    assert db_session.scalar(select(Assessment).where(Assessment.lesson_id == lesson_id))
    assert db_session.scalar(select(AttendanceSession).where(AttendanceSession.lesson_id == lesson_id))
    assert db_session.scalar(select(ScheduleEntry).where(ScheduleEntry.lesson_id == lesson_id))

    response = client.delete(f"/lessons/{lesson_id}")
    assert response.status_code == 204

    assert db_session.scalar(select(TeacherAssignment).where(TeacherAssignment.lesson_id == lesson_id)) is None
    assert db_session.scalar(select(Assessment).where(Assessment.lesson_id == lesson_id)) is None
    assert db_session.scalar(select(AttendanceSession).where(AttendanceSession.lesson_id == lesson_id)) is None
    assert db_session.scalar(select(ScheduleEntry).where(ScheduleEntry.lesson_id == lesson_id)) is None
    # The homeroom TeacherAssignment (no lesson_id) created alongside the
    # classroom must survive a lesson delete — only the subject assignment
    # tied to this lesson should be gone.
    assert client.get(f"/classrooms/{setup['classroom']['id']}").status_code == 200
