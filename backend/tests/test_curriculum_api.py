from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.core.security import hash_password
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
    app.dependency_overrides.pop(get_current_teacher, None)

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _create_and_login(client: TestClient, db_session: Session, email: str, role: TeacherRole) -> tuple[dict, dict]:
    teacher = Teacher(full_name="Teacher", email=email, password_hash=hash_password("demo12345"), role=role)
    db_session.add(teacher)
    db_session.commit()
    login = client.post("/auth/login", json={"email": email, "password": "demo12345"})
    token = login.json()["access_token"]
    return login.json(), {"Authorization": f"Bearer {token}"}


def test_admin_can_create_outcome_and_attach_it_to_assessment(client: TestClient, db_session: Session) -> None:
    admin, headers = _create_and_login(client, db_session, "admin@example.com", TeacherRole.admin)
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": admin["teacher_id"], "name": "5-A", "grade_level": "5"},
        headers=headers,
    ).json()
    lesson = client.post("/lessons", json={"teacher_id": admin["teacher_id"], "name": "Matematik"}, headers=headers).json()

    outcome_response = client.post(
        "/curriculum-outcomes",
        json={
            "lesson_id": lesson["id"],
            "grade_level": "5",
            "unit_title": "Kesirler",
            "code": "M.5.1",
            "outcome_text": "Kesirleri karşılaştırır.",
            "source_name": "Okul kazanım listesi",
            "version_label": "2026-2027",
        },
        headers=headers,
    )

    assert outcome_response.status_code == 201
    outcome = outcome_response.json()
    assert outcome["created_by_teacher_id"] == admin["teacher_id"]

    list_response = client.get("/curriculum-outcomes", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    assessment_response = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "curriculum_outcome_id": outcome["id"],
            "assessment_type": "sinav",
            "title": "1. Yazılı",
            "date": "2026-01-11",
        },
        headers=headers,
    )

    assert assessment_response.status_code == 201
    assert assessment_response.json()["curriculum_outcome_id"] == outcome["id"]


def test_assessment_rejects_outcome_from_another_lesson(client: TestClient, db_session: Session) -> None:
    admin, headers = _create_and_login(client, db_session, "admin@example.com", TeacherRole.admin)
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": admin["teacher_id"], "name": "5-A", "grade_level": "5"},
        headers=headers,
    ).json()
    math = client.post("/lessons", json={"teacher_id": admin["teacher_id"], "name": "Matematik"}, headers=headers).json()
    turkish = client.post("/lessons", json={"teacher_id": admin["teacher_id"], "name": "Türkçe"}, headers=headers).json()
    outcome = client.post(
        "/curriculum-outcomes",
        json={"lesson_id": turkish["id"], "grade_level": "5", "outcome_text": "Metin türlerini ayırt eder."},
        headers=headers,
    ).json()

    response = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": math["id"],
            "curriculum_outcome_id": outcome["id"],
            "assessment_type": "sinav",
            "title": "1. Yazılı",
            "date": "2026-01-11",
        },
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Kazanım seçilen dersle eşleşmiyor."


def test_deleting_outcome_keeps_assessment_and_clears_link(client: TestClient, db_session: Session) -> None:
    admin, headers = _create_and_login(client, db_session, "admin@example.com", TeacherRole.admin)
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": admin["teacher_id"], "name": "5-A", "grade_level": "5"},
        headers=headers,
    ).json()
    lesson = client.post("/lessons", json={"teacher_id": admin["teacher_id"], "name": "Matematik"}, headers=headers).json()
    outcome = client.post(
        "/curriculum-outcomes",
        json={"lesson_id": lesson["id"], "grade_level": "5", "outcome_text": "Kesirleri karşılaştırır."},
        headers=headers,
    ).json()
    assessment = client.post(
        "/assessments",
        json={
            "classroom_id": classroom["id"],
            "lesson_id": lesson["id"],
            "curriculum_outcome_id": outcome["id"],
            "assessment_type": "sinav",
            "title": "1. Yazılı",
            "date": "2026-01-11",
        },
        headers=headers,
    ).json()

    delete_response = client.delete(f"/curriculum-outcomes/{outcome['id']}", headers=headers)
    assert delete_response.status_code == 204

    assessment_response = client.get(f"/assessments/{assessment['id']}", headers=headers)
    assert assessment_response.status_code == 200
    assert assessment_response.json()["curriculum_outcome_id"] is None
