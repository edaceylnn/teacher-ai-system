from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import AcademicYear, Teacher, TeacherRole


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
def admin(db_session: Session) -> Teacher:
    teacher = Teacher(full_name="Eda Ceylan", email="eda@example.com", password_hash="hashed", role=TeacherRole.admin)
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


@pytest.fixture()
def regular_teacher(db_session: Session) -> Teacher:
    teacher = Teacher(full_name="Ahmet Yılmaz", email="ahmet@example.com", password_hash="hashed")
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


def _act_as(teacher: Teacher) -> None:
    app.dependency_overrides[get_current_teacher] = lambda: teacher


def test_get_schedule_settings_returns_defaults_and_lazily_creates_the_row(
    client: TestClient, admin: Teacher
) -> None:
    _act_as(admin)

    response = client.get("/school-schedule-settings")

    assert response.status_code == 200
    body = response.json()
    assert body["day_start_time"] == "08:30:00"
    assert body["lesson_duration_minutes"] == 40
    assert body["break_duration_minutes"] == 15
    assert body["lesson_count"] == 8
    assert body["lunch_break_enabled"] is True
    assert body["lunch_break_after_lesson"] == 4
    assert body["lunch_break_duration_minutes"] == 40


def test_any_authenticated_teacher_can_read_settings(client: TestClient, regular_teacher: Teacher) -> None:
    _act_as(regular_teacher)

    response = client.get("/school-schedule-settings")

    assert response.status_code == 200


def test_only_admin_can_update_schedule_settings(client: TestClient, regular_teacher: Teacher) -> None:
    _act_as(regular_teacher)

    response = client.put(
        "/school-schedule-settings",
        json={
            "day_start_time": "08:00",
            "lesson_duration_minutes": 45,
            "break_duration_minutes": 10,
            "lesson_count": 6,
            "lunch_break": {"enabled": False, "after_lesson": 4, "duration_minutes": 40},
        },
    )

    assert response.status_code == 403


def test_admin_can_update_schedule_settings_and_it_affects_the_break_check(
    client: TestClient, db_session: Session, admin: Teacher
) -> None:
    _act_as(admin)
    classroom = client.post("/classrooms", json={"teacher_id": admin.id, "name": "6-B", "grade_level": "6"}).json()
    lesson = client.post("/lessons", json={"teacher_id": admin.id, "name": "Fen Bilimleri"}).json()

    update_response = client.put(
        "/school-schedule-settings",
        json={
            "day_start_time": "08:00",
            "lesson_duration_minutes": 30,
            "break_duration_minutes": 10,
            "lesson_count": 6,
            "lunch_break": {"enabled": False, "after_lesson": 4, "duration_minutes": 40},
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["day_start_time"] == "08:00:00"

    # Under the new settings, lesson 1 is 08:00-08:30 and the first teneffüs
    # is 08:30-08:40 — this would have been a perfectly valid slot under the
    # old (default) 08:30-start settings, so this proves the check reads the
    # persisted settings rather than a stale default.
    conflict_response = client.post(
        "/schedule-entries",
        json={
            "teacher_id": admin.id,
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "weekday": 0,
            "start_time": "08:20",
            "end_time": "08:35",
        },
    )

    assert conflict_response.status_code == 422
    assert "teneffüs" in conflict_response.json()["detail"]


def test_update_schedule_settings_rejects_lunch_after_last_lesson(client: TestClient, admin: Teacher) -> None:
    _act_as(admin)

    response = client.put(
        "/school-schedule-settings",
        json={
            "day_start_time": "08:30",
            "lesson_duration_minutes": 40,
            "break_duration_minutes": 15,
            "lesson_count": 4,
            "lunch_break": {"enabled": True, "after_lesson": 5, "duration_minutes": 40},
        },
    )

    assert response.status_code == 422
