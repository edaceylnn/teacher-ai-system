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
    assert [classroom["name"] for classroom in list_response.json()] == ["5-A"]

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


def test_create_classroom_requires_existing_teacher(client: TestClient) -> None:
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
            "observation_notes": "Derse katilimi iyi.",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["first_name"] == "Ada"
    assert created["last_name"] == "Yilmaz"
    assert created["classroom_id"] == classroom["id"]

    list_response = client.get("/students", params={"classroom_id": classroom["id"]})
    assert list_response.status_code == 200
    assert [student["first_name"] for student in list_response.json()] == ["Ada"]

    update_response = client.patch(
        f"/students/{created['id']}",
        json={"observation_notes": "Problem cozme pratigi desteklenmeli."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["observation_notes"] == "Problem cozme pratigi desteklenmeli."

    delete_response = client.delete(f"/students/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/students/{created['id']}")
    assert missing_response.status_code == 404


def test_create_student_requires_existing_classroom(client: TestClient) -> None:
    response = client.post(
        "/students",
        json={"classroom_id": 999, "first_name": "Ada", "last_name": "Yilmaz"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Classroom not found"
