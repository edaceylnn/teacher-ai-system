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


def test_assessment_crud_and_single_record_upsert(
    client: TestClient, db_session: Session, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]
    student = classroom_with_students["students"][0]
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()
    _assign_subject(db_session, teacher_id=teacher.id, classroom_id=classroom["id"], lesson_id=lesson["id"])

    create_response = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "assessment_type": "sinav",
            "title": "1. Yazılı",
            "date": "2026-02-01",
        },
    )
    assert create_response.status_code == 201
    assessment = create_response.json()
    assert assessment["assessment_type"] == "sinav"
    assert assessment["teacher_id"] == teacher.id

    list_response = client.get("/assessments", params={"classroom_id": classroom["id"]})
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    record_response = client.put(
        f"/assessments/{assessment['id']}/records/{student['id']}",
        json={"score": "88.50"},
    )
    assert record_response.status_code == 200
    record = record_response.json()
    assert record["score"] == "88.50"
    assert record["is_completed"] is None

    records_response = client.get(f"/assessments/{assessment['id']}/records")
    assert records_response.status_code == 200
    assert len(records_response.json()) == 1

    update_response = client.patch(f"/assessments/{assessment['id']}", json={"title": "1. Yazılı (mazeret)"})
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "1. Yazılı (mazeret)"

    delete_response = client.delete(f"/assessments/{assessment['id']}")
    assert delete_response.status_code == 204


def test_assessment_bulk_record_upsert_covers_whole_roster(
    client: TestClient, db_session: Session, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]
    students = classroom_with_students["students"]
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Turkce"}).json()
    _assign_subject(db_session, teacher_id=teacher.id, classroom_id=classroom["id"], lesson_id=lesson["id"])

    assessment = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "assessment_type": "performans_odevi",
            "title": "Sunum",
            "date": "2026-02-05",
        },
    ).json()

    bulk_response = client.put(
        f"/assessments/{assessment['id']}/records",
        json={
            "records": [
                {"student_id": students[0]["id"], "score": "70"},
                {"student_id": students[1]["id"], "score": "95"},
                {"student_id": students[2]["id"], "score": "60"},
            ]
        },
    )
    assert bulk_response.status_code == 200
    scores = {record["student_id"]: record["score"] for record in bulk_response.json()}
    assert scores[students[1]["id"]] == "95.00"

    records = client.get(f"/assessments/{assessment['id']}/records").json()
    assert len(records) == 3

    # A student outside the classroom is rejected, not silently accepted.
    other_classroom = client.post(
        "/classrooms", json={"teacher_id": teacher.id, "name": "6-B", "grade_level": "6"}
    ).json()
    outsider = client.post(
        "/students", json={"classroom_id": other_classroom["id"], "first_name": "Ali", "last_name": "Kaya"}
    ).json()
    rejected = client.put(
        f"/assessments/{assessment['id']}/records",
        json={"records": [{"student_id": outsider["id"], "score": "50"}]},
    )
    assert rejected.status_code == 404


def test_assessment_write_requires_subject_assignment(
    client: TestClient, db_session: Session, teacher: Teacher, classroom_with_students: dict
) -> None:
    classroom = classroom_with_students["classroom"]
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Fen Bilimleri"}).json()
    # Deliberately not assigning `teacher` to this classroom+lesson — only a
    # homeroom-equivalent (via classroom creation) relationship exists.

    response = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "assessment_type": "sinav",
            "title": "1. Yazılı",
            "date": "2026-02-01",
        },
    )
    assert response.status_code == 403
