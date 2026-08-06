from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Teacher


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
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def teacher(db_session: Session) -> Teacher:
    teacher = Teacher(
        full_name="Eda Ceylan",
        email="eda@example.com",
        password_hash="hashed-password",
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


@pytest.fixture()
def student(client: TestClient, teacher: Teacher) -> dict:
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"},
    ).json()
    return client.post(
        "/students",
        json={
            "classroom_id": classroom["id"],
            "first_name": "Ada",
            "last_name": "Yilmaz",
        },
    ).json()


def test_lesson_crud_flow(client: TestClient, teacher: Teacher) -> None:
    create_response = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"})

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["teacher_id"] == teacher.id
    assert created["name"] == "Matematik"

    list_response = client.get("/lessons", params={"teacher_id": teacher.id})
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 1
    assert [lesson["name"] for lesson in list_payload["items"]] == ["Matematik"]

    update_response = client.patch(f"/lessons/{created['id']}", json={"name": "Turkce"})
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Turkce"

    delete_response = client.delete(f"/lessons/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/lessons/{created['id']}")
    assert missing_response.status_code == 404


def test_create_lesson_requires_existing_teacher(client: TestClient) -> None:
    response = client.post("/lessons", json={"teacher_id": 999, "name": "Matematik"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Teacher not found"


def test_grade_crud_flow(client: TestClient, teacher: Teacher, student: dict) -> None:
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()

    create_response = client.post(
        "/grades",
        json={
            "student_id": student["id"],
            "lesson_id": lesson["id"],
            "exam_name": "1. Yazili",
            "score": "82.50",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["student_id"] == student["id"]
    assert created["lesson_id"] == lesson["id"]
    assert created["exam_name"] == "1. Yazili"
    assert created["score"] == "82.50"

    list_response = client.get("/grades", params={"student_id": student["id"]})
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 1
    assert [grade["exam_name"] for grade in list_payload["items"]] == ["1. Yazili"]

    update_response = client.patch(f"/grades/{created['id']}", json={"score": "91.00"})
    assert update_response.status_code == 200
    assert update_response.json()["score"] == "91.00"

    delete_response = client.delete(f"/grades/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/grades/{created['id']}")
    assert missing_response.status_code == 404


def test_grades_can_be_filtered_by_classroom(client: TestClient, teacher: Teacher) -> None:
    first_classroom = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"},
    ).json()
    second_classroom = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "6-A", "grade_level": "6"},
    ).json()
    first_student = client.post(
        "/students",
        json={
            "classroom_id": first_classroom["id"],
            "first_name": "Ada",
            "last_name": "Yilmaz",
        },
    ).json()
    second_student = client.post(
        "/students",
        json={
            "classroom_id": second_classroom["id"],
            "first_name": "Mert",
            "last_name": "Demir",
        },
    ).json()
    lesson = client.post(
        "/lessons",
        json={"teacher_id": teacher.id, "name": "Matematik"},
    ).json()
    client.post(
        "/grades",
        json={
            "student_id": first_student["id"],
            "lesson_id": lesson["id"],
            "exam_name": "1. Yazili",
            "score": "80.00",
        },
    )
    client.post(
        "/grades",
        json={
            "student_id": second_student["id"],
            "lesson_id": lesson["id"],
            "exam_name": "2. Yazili",
            "score": "90.00",
        },
    )

    response = client.get("/grades", params={"classroom_id": first_classroom["id"]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert [grade["student_id"] for grade in payload["items"]] == [
        first_student["id"],
    ]


def test_create_grade_requires_existing_student_and_lesson(client: TestClient, teacher: Teacher, student: dict) -> None:
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()

    missing_student_response = client.post(
        "/grades",
        json={"student_id": 999, "lesson_id": lesson["id"], "exam_name": "1. Yazili", "score": "82.50"},
    )
    assert missing_student_response.status_code == 404
    assert missing_student_response.json()["detail"] == "Student not found"

    missing_lesson_response = client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": 999, "exam_name": "1. Yazili", "score": "82.50"},
    )
    assert missing_lesson_response.status_code == 404
    assert missing_lesson_response.json()["detail"] == "Lesson not found"


def test_attendance_crud_flow(client: TestClient, student: dict) -> None:
    create_response = client.post(
        "/attendance-records",
        json={"student_id": student["id"], "date": "2026-01-15", "status": "present"},
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["student_id"] == student["id"]
    assert created["date"] == "2026-01-15"
    assert created["status"] == "present"

    list_response = client.get("/attendance-records", params={"student_id": student["id"]})
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 1
    assert [record["status"] for record in list_payload["items"]] == ["present"]

    update_response = client.patch(f"/attendance-records/{created['id']}", json={"status": "excused"})
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "excused"

    delete_response = client.delete(f"/attendance-records/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/attendance-records/{created['id']}")
    assert missing_response.status_code == 404


def test_create_attendance_requires_existing_student(client: TestClient) -> None:
    response = client.post(
        "/attendance-records",
        json={"student_id": 999, "date": "2026-01-15", "status": "present"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found"


def test_student_profile_returns_academic_summary(client: TestClient, teacher: Teacher, student: dict) -> None:
    math_lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()
    turkish_lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Turkce"}).json()
    client.post(
        "/grades",
        json={
            "student_id": student["id"],
            "lesson_id": math_lesson["id"],
            "exam_name": "1. Yazili",
            "score": "82.50",
        },
    )
    client.post(
        "/grades",
        json={
            "student_id": student["id"],
            "lesson_id": turkish_lesson["id"],
            "exam_name": "1. Yazili",
            "score": "91.00",
        },
    )
    client.post(
        "/attendance-records",
        json={"student_id": student["id"], "date": "2026-01-15", "status": "present"},
    )
    client.post(
        "/attendance-records",
        json={"student_id": student["id"], "date": "2026-01-16", "status": "absent"},
    )

    response = client.get(f"/students/{student['id']}/profile")

    assert response.status_code == 200
    profile = response.json()
    assert profile["id"] == student["id"]
    assert profile["first_name"] == "Ada"
    assert profile["classroom"]["name"] == "5-A"
    assert profile["grades"] == [
        {
            "id": 1,
            "lesson_id": math_lesson["id"],
            "lesson_name": "Matematik",
            "exam_name": "1. Yazili",
            "score": "82.50",
        },
        {
            "id": 2,
            "lesson_id": turkish_lesson["id"],
            "lesson_name": "Turkce",
            "exam_name": "1. Yazili",
            "score": "91.00",
        },
    ]
    assert profile["attendance_records"] == [
        {"id": 1, "date": "2026-01-15", "status": "present"},
        {"id": 2, "date": "2026-01-16", "status": "absent"},
    ]
    assert profile["attendance_summary"] == {
        "present": 1,
        "absent": 1,
        "excused": 0,
        "total": 2,
    }


def test_student_profile_returns_404_for_missing_student(client: TestClient) -> None:
    response = client.get("/students/999/profile")

    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found"
