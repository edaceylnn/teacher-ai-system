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
from app.models import AcademicYear, Teacher, TeacherAssignment


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


def _assign_subject(db_session: Session, *, teacher_id: int, classroom_id: int, lesson_id: int) -> None:
    academic_year = db_session.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))
    db_session.add(
        TeacherAssignment(
            teacher_id=teacher_id,
            classroom_id=classroom_id,
            lesson_id=lesson_id,
            academic_year_id=academic_year.id,
            is_active=True,
        )
    )
    db_session.commit()


@pytest.fixture()
def classroom_with_students(client: TestClient, teacher: Teacher) -> dict:
    classroom = client.post(
        "/classrooms", json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"}
    ).json()
    students = [
        client.post(
            "/students", json={"classroom_id": classroom["id"], "first_name": first, "last_name": "Yilmaz"}
        ).json()
        for first in ("Ada", "Mert", "Zeynep")
    ]
    return {"classroom": classroom, "students": students}


def test_lesson_scoped_session_bulk_roll_call(
    client: TestClient, db_session: Session, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]
    students = classroom_with_students["students"]
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()
    _assign_subject(db_session, teacher_id=teacher.id, classroom_id=classroom["id"], lesson_id=lesson["id"])

    create_response = client.post(
        "/attendance-sessions",
        json={"classroom_id": classroom["id"], "lesson_id": lesson["id"], "date": "2026-02-01"},
    )
    assert create_response.status_code == 201
    session = create_response.json()
    assert session["lesson_id"] == lesson["id"]

    bulk_response = client.put(
        f"/attendance-sessions/{session['id']}/records",
        json={
            "records": [
                {"student_id": students[0]["id"], "status": "present"},
                {"student_id": students[1]["id"], "status": "absent"},
                {"student_id": students[2]["id"], "status": "excused"},
            ]
        },
    )
    assert bulk_response.status_code == 200
    statuses = {record["student_id"]: record["status"] for record in bulk_response.json()}
    assert statuses[students[1]["id"]] == "absent"

    records = client.get(f"/attendance-sessions/{session['id']}/records").json()
    assert len(records) == 3

    list_response = client.get("/attendance-sessions", params={"classroom_id": classroom["id"]})
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1


def test_same_lesson_twice_in_one_day_creates_separate_sessions(
    client: TestClient, db_session: Session, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Turkce"}).json()
    _assign_subject(db_session, teacher_id=teacher.id, classroom_id=classroom["id"], lesson_id=lesson["id"])

    first = client.post(
        "/attendance-sessions",
        json={"classroom_id": classroom["id"], "lesson_id": lesson["id"], "date": "2026-02-02", "start_time": "09:10"},
    )
    second = client.post(
        "/attendance-sessions",
        json={"classroom_id": classroom["id"], "lesson_id": lesson["id"], "date": "2026-02-02", "start_time": "13:00"},
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]

    list_response = client.get("/attendance-sessions", params={"classroom_id": classroom["id"], "date": "2026-02-02"})
    assert list_response.json()["total"] == 2


def test_lesson_less_session_only_needs_classroom_access(
    client: TestClient, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]

    # No subject assignment at all — only the homeroom-equivalent access
    # granted by creating the classroom — is enough for a day-level session.
    response = client.post(
        "/attendance-sessions",
        json={"classroom_id": classroom["id"], "date": "2026-02-03"},
    )
    assert response.status_code == 201
    assert response.json()["lesson_id"] is None


def test_session_write_requires_subject_assignment_when_lesson_scoped(
    client: TestClient, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Fen Bilimleri"}).json()
    # No _assign_subject call — teacher only has the homeroom-equivalent
    # access from creating the classroom, not this specific subject.

    response = client.post(
        "/attendance-sessions",
        json={"classroom_id": classroom["id"], "lesson_id": lesson["id"], "date": "2026-02-04"},
    )
    assert response.status_code == 403
