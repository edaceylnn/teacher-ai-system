from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.api.routes.teachers import registration_rate_limiter
from app.core.security import hash_password, verify_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import AcademicYear, Teacher, TeacherRole


@pytest.fixture(autouse=True)
def _reset_registration_rate_limiter() -> None:
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
        # Every environment needs a current AcademicYear for classroom
        # creation to attach a TeacherAssignment to.
        session.add(
            AcademicYear(label="2026-2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 30), is_current=True)
        )
        session.add(
            Teacher(
                full_name="Admin Teacher",
                email="admin@example.com",
                password_hash=hash_password("demo12345"),
                role=TeacherRole.admin,
            )
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


def _act_as_teacher(db_session: Session, teacher_id: int) -> None:
    def override_current_teacher() -> Teacher:
        return db_session.get(Teacher, teacher_id)

    app.dependency_overrides[get_current_teacher] = override_current_teacher


def test_teacher_crud_flow(client: TestClient, db_session: Session) -> None:
    create_response = client.post(
        "/teachers",
        json={
            "full_name": "Eda Ceylan",
            "email": "eda@example.com",
            "password": "demo12345",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["full_name"] == "Eda Ceylan"
    assert created["email"] == "eda@example.com"
    assert "password_hash" not in created

    list_response = client.get("/teachers")
    assert list_response.status_code == 200
    assert [teacher["email"] for teacher in list_response.json()] == ["admin@example.com", "eda@example.com"]

    _act_as_teacher(db_session, created["id"])
    update_response = client.patch(
        f"/teachers/{created['id']}",
        json={"full_name": "Eda C."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Eda C."

    delete_response = client.delete(f"/teachers/{created['id']}")
    assert delete_response.status_code == 204

    _act_as_teacher(db_session, 1)
    missing_response = client.get(f"/teachers/{created['id']}")
    assert missing_response.status_code == 404


def test_create_teacher_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "full_name": "Eda Ceylan",
        "email": "eda@example.com",
        "password": "demo12345",
    }
    assert client.post("/teachers", json=payload).status_code == 201

    response = client.post("/teachers", json=payload)

    assert response.status_code == 409
    assert response.json()["detail"] == "Bu e-posta ile kayıtlı bir öğretmen zaten var."


def test_classrooms_can_be_filtered_by_teacher(client: TestClient, db_session: Session) -> None:
    first_teacher = client.post(
        "/teachers",
        json={"full_name": "Eda Ceylan", "email": "eda@example.com", "password": "demo12345"},
    ).json()
    second_teacher = client.post(
        "/teachers",
        json={"full_name": "Ali Demir", "email": "ali@example.com", "password": "demo12345"},
    ).json()
    _act_as_teacher(db_session, first_teacher["id"])
    client.post("/classrooms", json={"teacher_id": first_teacher["id"], "name": "5-A", "grade_level": "5"})
    _act_as_teacher(db_session, second_teacher["id"])
    client.post("/classrooms", json={"teacher_id": second_teacher["id"], "name": "6-B", "grade_level": "6"})

    _act_as_teacher(db_session, first_teacher["id"])
    response = client.get("/classrooms", params={"teacher_id": first_teacher["id"]})

    assert response.status_code == 200
    assert [classroom["name"] for classroom in response.json()["items"]] == ["5-A"]


@pytest.mark.parametrize(
    "password",
    ["onlyletters", "12345678", "short1"],
    ids=["no-digit", "no-letter", "too-short"],
)
def test_teacher_create_rejects_weak_password(client: TestClient, password: str) -> None:
    response = client.post(
        "/teachers",
        json={"full_name": "Eda Ceylan", "email": "eda@example.com", "password": password},
    )

    assert response.status_code == 422


def test_teacher_create_accepts_strong_password(client: TestClient) -> None:
    response = client.post(
        "/teachers",
        json={"full_name": "Eda Ceylan", "email": "eda@example.com", "password": "demo12345"},
    )

    assert response.status_code == 201


def test_teacher_create_without_password_sends_invite_and_sets_unknown_password(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sent_links: list[tuple[str, str]] = []

    def fake_send_password_reset_email(email: str, reset_link: str) -> None:
        sent_links.append((email, reset_link))

    monkeypatch.setattr("app.api.routes.teachers.send_password_reset_email", fake_send_password_reset_email)

    response = client.post(
        "/teachers",
        json={"full_name": "Invite Teacher", "email": "invite@example.com"},
    )

    assert response.status_code == 201
    teacher = db_session.get(Teacher, response.json()["id"])
    assert teacher is not None
    assert not verify_password("demo12345", teacher.password_hash)
    assert len(sent_links) == 1
    assert sent_links[0][0] == "invite@example.com"
    assert "/reset-password?token=" in sent_links[0][1]
    assert response.json()["invitation_url"] == sent_links[0][1]


def test_public_teacher_create_is_rejected(client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_teacher, None)

    response = client.post(
        "/teachers",
        json={"full_name": "Intruder", "email": "intruder@example.com", "password": "demo12345"},
    )

    assert response.status_code == 401


def test_admin_can_delete_another_teacher(client: TestClient, db_session: Session) -> None:
    create_response = client.post(
        "/teachers",
        json={"full_name": "Silinecek Öğretmen", "email": "delete@example.com", "password": "demo12345"},
    )
    assert create_response.status_code == 201
    teacher_id = create_response.json()["id"]

    response = client.delete(f"/teachers/{teacher_id}")

    assert response.status_code == 204
    assert db_session.get(Teacher, teacher_id) is None


def test_admin_cannot_delete_teacher_that_owns_classroom(client: TestClient, db_session: Session) -> None:
    create_response = client.post(
        "/teachers",
        json={"full_name": "Rehber Öğretmen", "email": "rehber@example.com", "password": "demo12345"},
    )
    teacher_id = create_response.json()["id"]

    _act_as_teacher(db_session, teacher_id)
    classroom_response = client.post(
        "/classrooms",
        json={"teacher_id": teacher_id, "name": "7-A", "grade_level": "7"},
    )
    assert classroom_response.status_code == 201

    _act_as_teacher(db_session, 1)
    response = client.delete(f"/teachers/{teacher_id}")

    assert response.status_code == 409
    assert "rehber olduğu sınıflar" in response.json()["detail"]
    assert db_session.get(Teacher, teacher_id) is not None
