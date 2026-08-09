from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.api.routes.auth import login_rate_limiter
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Teacher


@pytest.fixture(autouse=True)
def _reset_login_rate_limiter() -> None:
    login_rate_limiter.reset()


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


@pytest.fixture()
def teacher(db_session: Session) -> Teacher:
    teacher = Teacher(
        full_name="Eda Ceylan",
        email="eda@example.com",
        password_hash=hash_password("demo12345"),
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


def _login(client: TestClient) -> str:
    response = client.post("/auth/login", json={"email": "eda@example.com", "password": "demo12345"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_mutating_request_is_recorded_in_audit_log(client: TestClient, teacher: Teacher) -> None:
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_response = client.post(
        "/classrooms",
        json={"teacher_id": teacher.id, "name": "5-A", "grade_level": "5"},
        headers=headers,
    )
    assert create_response.status_code == 201

    audit_response = client.get("/audit-logs", headers=headers)
    assert audit_response.status_code == 200
    body = audit_response.json()
    assert body["total"] == 1
    entry = body["items"][0]
    assert entry["method"] == "POST"
    assert entry["path"] == "/classrooms"
    assert entry["status_code"] == 201


def test_read_only_request_is_not_recorded(client: TestClient, teacher: Teacher) -> None:
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    list_response = client.get("/classrooms", headers=headers)
    assert list_response.status_code == 200

    audit_response = client.get("/audit-logs", headers=headers)
    assert audit_response.json()["total"] == 0


def test_auth_endpoints_are_excluded_from_audit_log(client: TestClient, teacher: Teacher) -> None:
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    audit_response = client.get("/audit-logs", headers=headers)
    assert audit_response.json()["total"] == 0


def test_audit_log_is_scoped_to_the_requesting_teacher(client: TestClient, db_session: Session) -> None:
    teacher_one = Teacher(full_name="Eda Ceylan", email="eda@example.com", password_hash=hash_password("demo12345"))
    teacher_two = Teacher(full_name="Ali Demir", email="ali@example.com", password_hash=hash_password("demo12345"))
    db_session.add_all([teacher_one, teacher_two])
    db_session.commit()
    db_session.refresh(teacher_one)
    db_session.refresh(teacher_two)

    token_one = client.post(
        "/auth/login", json={"email": "eda@example.com", "password": "demo12345"}
    ).json()["access_token"]
    token_two = client.post(
        "/auth/login", json={"email": "ali@example.com", "password": "demo12345"}
    ).json()["access_token"]

    client.post(
        "/classrooms",
        json={"teacher_id": teacher_one.id, "name": "5-A", "grade_level": "5"},
        headers={"Authorization": f"Bearer {token_one}"},
    )

    teacher_two_logs = client.get("/audit-logs", headers={"Authorization": f"Bearer {token_two}"})
    assert teacher_two_logs.json()["total"] == 0

    teacher_one_logs = client.get("/audit-logs", headers={"Authorization": f"Bearer {token_one}"})
    assert teacher_one_logs.json()["total"] == 1
