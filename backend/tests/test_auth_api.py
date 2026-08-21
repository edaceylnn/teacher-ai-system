from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.api.routes.auth import (
    login_rate_limiter,
    password_reset_confirm_rate_limiter,
    password_reset_request_rate_limiter,
    refresh_rate_limiter,
)
from app.core.security import create_password_reset_token, hash_password
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


@pytest.fixture(autouse=True)
def _reset_auth_rate_limiters() -> None:
    login_rate_limiter.reset()
    refresh_rate_limiter.reset()
    password_reset_request_rate_limiter.reset()
    password_reset_confirm_rate_limiter.reset()


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


def test_login_returns_token_and_me_returns_current_teacher(client: TestClient, teacher: Teacher) -> None:
    login_response = client.post(
        "/auth/login",
        json={"email": "eda@example.com", "password": "demo12345"},
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert me_response.status_code == 200
    assert me_response.json()["email"] == teacher.email


def test_login_rejects_invalid_password(client: TestClient, teacher: Teacher) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "eda@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_login_sets_httponly_refresh_cookie(client: TestClient, teacher: Teacher) -> None:
    response = client.post(
        "/auth/login",
        json={"email": "eda@example.com", "password": "demo12345"},
    )

    assert response.status_code == 200
    assert "refresh_token" in response.cookies


def test_refresh_issues_new_access_token_from_cookie(client: TestClient, teacher: Teacher) -> None:
    login_response = client.post(
        "/auth/login",
        json={"email": "eda@example.com", "password": "demo12345"},
    )
    assert login_response.status_code == 200

    refresh_response = client.post("/auth/refresh")
    assert refresh_response.status_code == 200
    new_token = refresh_response.json()["access_token"]

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == teacher.email


def test_refresh_without_cookie_is_rejected(client: TestClient) -> None:
    response = client.post("/auth/refresh")

    assert response.status_code == 401


def test_logout_clears_refresh_cookie(client: TestClient, teacher: Teacher) -> None:
    client.post("/auth/login", json={"email": "eda@example.com", "password": "demo12345"})

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 204

    refresh_response = client.post("/auth/refresh")
    assert refresh_response.status_code == 401


def test_password_reset_request_does_not_leak_whether_email_exists(
    client: TestClient, teacher: Teacher
) -> None:
    known_response = client.post("/auth/password-reset/request", json={"email": teacher.email})
    unknown_response = client.post(
        "/auth/password-reset/request", json={"email": "nobody@example.com"}
    )

    assert known_response.status_code == 202
    assert unknown_response.status_code == 202


def test_password_reset_confirm_changes_password_and_allows_login(
    client: TestClient, teacher: Teacher
) -> None:
    token = create_password_reset_token(teacher.id, teacher.password_hash)

    confirm_response = client.post(
        "/auth/password-reset/confirm",
        json={"token": token, "new_password": "brand-new-pass1"},
    )
    assert confirm_response.status_code == 204

    old_password_login = client.post(
        "/auth/login", json={"email": teacher.email, "password": "demo12345"}
    )
    assert old_password_login.status_code == 401

    new_password_login = client.post(
        "/auth/login", json={"email": teacher.email, "password": "brand-new-pass1"}
    )
    assert new_password_login.status_code == 200


def test_password_reset_confirm_rejects_invalid_token(client: TestClient, teacher: Teacher) -> None:
    response = client.post(
        "/auth/password-reset/confirm",
        json={"token": "not-a-real-token", "new_password": "brand-new-pass1"},
    )

    assert response.status_code == 400


def test_password_reset_confirm_rejects_weak_new_password(client: TestClient, teacher: Teacher) -> None:
    token = create_password_reset_token(teacher.id, teacher.password_hash)

    response = client.post(
        "/auth/password-reset/confirm",
        json={"token": token, "new_password": "onlyletters"},
    )

    assert response.status_code == 422


def test_password_reset_confirm_rejects_already_used_token(
    client: TestClient, teacher: Teacher
) -> None:
    token = create_password_reset_token(teacher.id, teacher.password_hash)

    first_use = client.post(
        "/auth/password-reset/confirm",
        json={"token": token, "new_password": "brand-new-pass1"},
    )
    assert first_use.status_code == 204

    second_use = client.post(
        "/auth/password-reset/confirm",
        json={"token": token, "new_password": "another-pass2"},
    )
    assert second_use.status_code == 400


def test_password_reset_invalidates_existing_refresh_session(
    client: TestClient, teacher: Teacher
) -> None:
    login_response = client.post(
        "/auth/login",
        json={"email": "eda@example.com", "password": "demo12345"},
    )
    assert login_response.status_code == 200

    reset_token = create_password_reset_token(teacher.id, teacher.password_hash)
    confirm_response = client.post(
        "/auth/password-reset/confirm",
        json={"token": reset_token, "new_password": "brand-new-pass1"},
    )
    assert confirm_response.status_code == 204

    refresh_response = client.post("/auth/refresh")
    assert refresh_response.status_code == 401
