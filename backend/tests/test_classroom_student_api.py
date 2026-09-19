from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.api.routes import students as students_routes
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import AcademicYear, Teacher


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
        # Every environment needs a current AcademicYear for classroom
        # creation to attach a TeacherAssignment to.
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
    teacher = Teacher(
        full_name="Eda Ceylan",
        email="eda@example.com",
        password_hash="hashed-password",
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


def test_classroom_crud_flow(client: TestClient, teacher: Teacher) -> None:
    create_response = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"},
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "5-A"
    assert created["grade_level"] == "5"
    assert created["teacher_id"] == teacher.id

    list_response = client.get("/classrooms")
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 1
    assert [classroom["name"] for classroom in list_payload["items"]] == ["5-A"]

    update_response = client.patch(
        f"/classrooms/{created['id']}",
        json={"name": "5-B"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "5-B"

    delete_response = client.delete(f"/classrooms/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/classrooms/{created['id']}")
    assert missing_response.status_code == 404


def test_create_classroom_requires_existing_teacher(client: TestClient, teacher: Teacher) -> None:
    response = client.post(
        "/classrooms",
        json={"teacher_id": 999, "name": "5-A", "grade_level": "5"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Teacher not found"


def test_student_crud_flow(client: TestClient, teacher: Teacher) -> None:
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"},
    ).json()

    create_response = client.post(
        "/students",
        json={
            "classroom_id": classroom["id"],
            "first_name": "Ada",
            "last_name": "Yilmaz",
            "parent_full_name": "Ayse Yilmaz",
            "parent_phone": "+90 555 111 22 33",
            "parent_email": "ayse@example.com",
            "home_address": "Ankara Cankaya",
            "observation_notes": "Derse katilimi iyi.",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["first_name"] == "Ada"
    assert created["last_name"] == "Yilmaz"
    assert created["classroom_id"] == classroom["id"]
    assert created["parent_full_name"] == "Ayse Yilmaz"
    assert created["parent_phone"] == "+90 555 111 22 33"
    assert created["parent_email"] == "ayse@example.com"
    assert created["home_address"] == "Ankara Cankaya"

    list_response = client.get("/students", params={"classroom_id": classroom["id"]})
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 1
    assert [student["first_name"] for student in list_payload["items"]] == ["Ada"]

    update_response = client.patch(
        f"/students/{created['id']}",
        json={
            "parent_phone": "+90 555 444 55 66",
            "observation_notes": "Problem cozme pratigi desteklenmeli.",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["parent_phone"] == "+90 555 444 55 66"
    assert update_response.json()["observation_notes"] == "Problem cozme pratigi desteklenmeli."

    delete_response = client.delete(f"/students/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/students/{created['id']}")
    assert missing_response.status_code == 404


def test_create_student_requires_existing_classroom(client: TestClient, teacher: Teacher) -> None:
    response = client.post(
        "/students",
        json={"classroom_id": 999, "first_name": "Ada", "last_name": "Yilmaz"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Classroom not found"


def test_students_can_be_paginated_and_searched(client: TestClient, teacher: Teacher) -> None:
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"},
    ).json()
    for first_name in ["Ada", "Mert", "Zeynep"]:
        client.post(
            "/students",
            json={
                "classroom_id": classroom["id"],
                "first_name": first_name,
                "last_name": "Yilmaz",
            },
        )

    page_response = client.get(
        "/students",
        params={"classroom_id": classroom["id"], "limit": 2, "offset": 1},
    )
    assert page_response.status_code == 200
    page_payload = page_response.json()
    assert page_payload["total"] == 3
    assert page_payload["limit"] == 2
    assert page_payload["offset"] == 1
    assert [student["first_name"] for student in page_payload["items"]] == [
        "Mert",
        "Zeynep",
    ]

    search_response = client.get("/students", params={"search": "zey"})
    assert search_response.status_code == 200
    assert [student["first_name"] for student in search_response.json()["items"]] == [
        "Zeynep",
    ]


def test_send_parent_message_calls_email_with_correct_recipient_and_content(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, teacher: Teacher
) -> None:
    classroom = client.post(
        "/classrooms", json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"}
    ).json()
    student = client.post(
        "/students",
        json={
            "classroom_id": classroom["id"],
            "first_name": "Ada",
            "last_name": "Yilmaz",
            "parent_email": "ayse@example.com",
        },
    ).json()

    sent_calls = []
    monkeypatch.setattr(
        students_routes,
        "send_parent_message_email",
        lambda email, subject, message: sent_calls.append((email, subject, message)),
    )

    response = client.post(
        f"/students/{student['id']}/message",
        json={"subject": "Karne hakkında", "message": "Ada bu hafta çok iyi ilerledi."},
    )

    assert response.status_code == 202
    assert sent_calls == [("ayse@example.com", "Karne hakkında", "Ada bu hafta çok iyi ilerledi.")]


def test_send_parent_message_requires_parent_email_on_file(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, teacher: Teacher
) -> None:
    classroom = client.post(
        "/classrooms", json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"}
    ).json()
    student = client.post(
        "/students",
        json={"classroom_id": classroom["id"], "first_name": "Ada", "last_name": "Yilmaz"},
    ).json()

    sent_calls = []
    monkeypatch.setattr(
        students_routes,
        "send_parent_message_email",
        lambda *args: sent_calls.append(args),
    )

    response = client.post(
        f"/students/{student['id']}/message",
        json={"subject": "Konu", "message": "Mesaj"},
    )

    assert response.status_code == 400
    assert "veli e-postası yok" in response.json()["detail"]
    assert sent_calls == []


def test_send_parent_message_rejects_teacher_without_classroom_access(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch, teacher: Teacher
) -> None:
    classroom = client.post(
        "/classrooms", json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"}
    ).json()
    student = client.post(
        "/students",
        json={
            "classroom_id": classroom["id"],
            "first_name": "Ada",
            "last_name": "Yilmaz",
            "parent_email": "ayse@example.com",
        },
    ).json()

    other_teacher = Teacher(full_name="Ahmet Yılmaz", email="ahmet@example.com", password_hash="hashed-password")
    db_session.add(other_teacher)
    db_session.commit()
    db_session.refresh(other_teacher)

    sent_calls = []
    monkeypatch.setattr(
        students_routes,
        "send_parent_message_email",
        lambda *args: sent_calls.append(args),
    )

    default_override = app.dependency_overrides[get_current_teacher]
    app.dependency_overrides[get_current_teacher] = lambda: other_teacher
    try:
        response = client.post(
            f"/students/{student['id']}/message",
            json={"subject": "Konu", "message": "Mesaj"},
        )
    finally:
        app.dependency_overrides[get_current_teacher] = default_override

    assert response.status_code == 404
    assert sent_calls == []
