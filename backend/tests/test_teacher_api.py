from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app


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


def test_teacher_crud_flow(client: TestClient) -> None:
    create_response = client.post(
        "/teachers",
        json={
            "full_name": "Eda Ceylan",
            "email": "eda@example.com",
            "password_hash": "hashed-password",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["full_name"] == "Eda Ceylan"
    assert created["email"] == "eda@example.com"
    assert "password_hash" not in created

    list_response = client.get("/teachers")
    assert list_response.status_code == 200
    assert [teacher["email"] for teacher in list_response.json()] == ["eda@example.com"]

    update_response = client.patch(
        f"/teachers/{created['id']}",
        json={"full_name": "Eda C."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Eda C."

    delete_response = client.delete(f"/teachers/{created['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/teachers/{created['id']}")
    assert missing_response.status_code == 401


def test_create_teacher_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "full_name": "Eda Ceylan",
        "email": "eda@example.com",
        "password_hash": "hashed-password",
    }
    assert client.post("/teachers", json=payload).status_code == 201

    response = client.post("/teachers", json=payload)

    assert response.status_code == 409
    assert response.json()["detail"] == "Teacher email already exists"


def test_classrooms_can_be_filtered_by_teacher(client: TestClient) -> None:
    first_teacher = client.post(
        "/teachers",
        json={"full_name": "Eda Ceylan", "email": "eda@example.com", "password_hash": "hashed-password"},
    ).json()
    second_teacher = client.post(
        "/teachers",
        json={"full_name": "Ali Demir", "email": "ali@example.com", "password_hash": "hashed-password"},
    ).json()
    client.post("/classrooms", json={"teacher_id": first_teacher["id"], "name": "5-A", "grade_level": "5"})
    client.post("/classrooms", json={"teacher_id": second_teacher["id"], "name": "6-B", "grade_level": "6"})

    response = client.get("/classrooms", params={"teacher_id": first_teacher["id"]})

    assert response.status_code == 200
    assert [classroom["name"] for classroom in response.json()["items"]] == ["5-A"]
