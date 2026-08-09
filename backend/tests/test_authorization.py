from collections.abc import Generator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.api.routes.auth import login_rate_limiter
from app.api.routes.teachers import registration_rate_limiter
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture(autouse=True)
def _reset_rate_limiters() -> None:
    login_rate_limiter.reset()
    registration_rate_limiter.reset()


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
        yield session

    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app.dependency_overrides.pop(get_current_teacher, None)

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register_and_login(client: TestClient, email: str) -> tuple[dict, dict]:
    client.post("/teachers", json={"full_name": "Teacher", "email": email, "password": "demo12345"})
    login = client.post("/auth/login", json={"email": email, "password": "demo12345"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/auth/me", headers=headers).json()
    return me, headers


@pytest.fixture()
def owner_resources(client: TestClient) -> dict:
    owner, owner_headers = _register_and_login(client, "owner@example.com")

    classroom = client.post(
        "/classrooms",
        json={"teacher_id": owner["id"], "name": "5-A", "grade_level": "5"},
        headers=owner_headers,
    ).json()
    student = client.post(
        "/students",
        json={"classroom_id": classroom["id"], "first_name": "Ada", "last_name": "Yilmaz"},
        headers=owner_headers,
    ).json()
    lesson = client.post(
        "/lessons", json={"teacher_id": owner["id"], "name": "Matematik"}, headers=owner_headers
    ).json()
    grade = client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": lesson["id"], "exam_name": "1. Yazili", "score": "90"},
        headers=owner_headers,
    ).json()
    attendance = client.post(
        "/attendance-records",
        json={"student_id": student["id"], "date": "2026-01-15", "status": "present"},
        headers=owner_headers,
    ).json()
    schedule_entry = client.post(
        "/schedule-entries",
        json={
            "teacher_id": owner["id"],
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "weekday": 0,
            "start_time": "09:00:00",
            "end_time": "09:40:00",
        },
        headers=owner_headers,
    ).json()
    homework = client.post(
        "/homeworks",
        json={
            "teacher_id": owner["id"],
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "title": "Kesir problemleri",
            "due_date": "2026-01-20",
            "status": "assigned",
        },
        headers=owner_headers,
    ).json()

    _intruder, intruder_headers = _register_and_login(client, "intruder@example.com")

    return {
        "classroom": classroom,
        "student": student,
        "lesson": lesson,
        "grade": grade,
        "attendance": attendance,
        "schedule_entry": schedule_entry,
        "homework": homework,
        "intruder_headers": intruder_headers,
    }


def test_intruder_cannot_access_another_teachers_classroom_student_or_lesson(
    client: TestClient, owner_resources: dict
) -> None:
    headers = owner_resources["intruder_headers"]
    classroom_id = owner_resources["classroom"]["id"]
    student_id = owner_resources["student"]["id"]
    lesson_id = owner_resources["lesson"]["id"]

    assert client.get(f"/classrooms/{classroom_id}", headers=headers).status_code == 404
    assert (
        client.patch(f"/classrooms/{classroom_id}", json={"name": "hacked"}, headers=headers).status_code == 404
    )
    assert client.delete(f"/classrooms/{classroom_id}", headers=headers).status_code == 404

    assert client.get(f"/students/{student_id}", headers=headers).status_code == 404
    assert client.get(f"/students/{student_id}/profile", headers=headers).status_code == 404
    assert (
        client.patch(f"/students/{student_id}", json={"first_name": "Hacked"}, headers=headers).status_code
        == 404
    )
    assert client.delete(f"/students/{student_id}", headers=headers).status_code == 404

    assert client.get(f"/lessons/{lesson_id}", headers=headers).status_code == 404
    assert client.patch(f"/lessons/{lesson_id}", json={"name": "hacked"}, headers=headers).status_code == 404
    assert client.delete(f"/lessons/{lesson_id}", headers=headers).status_code == 404


def test_intruder_cannot_access_another_teachers_grades_or_attendance(
    client: TestClient, owner_resources: dict
) -> None:
    headers = owner_resources["intruder_headers"]
    grade_id = owner_resources["grade"]["id"]
    attendance_id = owner_resources["attendance"]["id"]

    assert client.get(f"/grades/{grade_id}", headers=headers).status_code == 404
    assert client.patch(f"/grades/{grade_id}", json={"score": "10"}, headers=headers).status_code == 404
    assert client.delete(f"/grades/{grade_id}", headers=headers).status_code == 404

    assert client.get(f"/attendance-records/{attendance_id}", headers=headers).status_code == 404
    assert (
        client.patch(
            f"/attendance-records/{attendance_id}", json={"status": "absent"}, headers=headers
        ).status_code
        == 404
    )
    assert client.delete(f"/attendance-records/{attendance_id}", headers=headers).status_code == 404


def test_intruder_cannot_modify_another_teachers_schedule_or_homework(
    client: TestClient, owner_resources: dict
) -> None:
    headers = owner_resources["intruder_headers"]
    schedule_entry_id = owner_resources["schedule_entry"]["id"]
    homework_id = owner_resources["homework"]["id"]

    assert (
        client.patch(
            f"/schedule-entries/{schedule_entry_id}", json={"location": "hacked"}, headers=headers
        ).status_code
        == 404
    )
    assert client.delete(f"/schedule-entries/{schedule_entry_id}", headers=headers).status_code == 404

    assert (
        client.patch(f"/homeworks/{homework_id}", json={"title": "hacked"}, headers=headers).status_code == 404
    )
    assert client.delete(f"/homeworks/{homework_id}", headers=headers).status_code == 404


def test_expired_access_token_is_rejected(client: TestClient, owner_resources: dict) -> None:
    owner_id = owner_resources["classroom"]["teacher_id"]
    expired_token = create_access_token(str(owner_id), expires_delta=timedelta(minutes=-1))

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})

    assert response.status_code == 401


def test_malformed_access_token_is_rejected(client: TestClient) -> None:
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401


def test_missing_authorization_header_is_rejected(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401
