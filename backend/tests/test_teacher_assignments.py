from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.api.routes.auth import login_rate_limiter
from app.api.routes.teachers import registration_rate_limiter
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import AcademicYear, Teacher, TeacherRole


@pytest.fixture(autouse=True)
def _reset_rate_limiters() -> None:
    login_rate_limiter.reset()
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
        session.add(
            AcademicYear(label="2026-2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 30), is_current=True)
        )
        session.commit()
        yield session

    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    # This suite needs real per-token identity (admin vs branş teacher), so
    # drop conftest.py's autouse "always the first teacher" mock — same as
    # test_authorization.py.
    app.dependency_overrides.pop(get_current_teacher, None)

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register_and_login(client: TestClient, email: str) -> tuple[dict, dict]:
    client.post("/teachers", json={"full_name": "Teacher", "email": email, "password": "demo12345"})
    login = client.post("/auth/login", json={"email": email, "password": "demo12345"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/auth/me", headers=headers).json()
    return me, headers


@pytest.fixture()
def admin(client: TestClient, db_session: Session) -> tuple[dict, dict]:
    admin, headers = _register_and_login(client, "admin@example.com")
    teacher = db_session.get(Teacher, admin["id"])
    teacher.role = TeacherRole.admin
    db_session.commit()
    return admin, headers


@pytest.fixture()
def branch_teacher(client: TestClient) -> tuple[dict, dict]:
    return _register_and_login(client, "ahmet@example.com")


@pytest.fixture()
def classroom_and_lessons(client: TestClient, admin: tuple[dict, dict]) -> dict:
    admin_teacher, admin_headers = admin
    classroom = client.post(
        "/classrooms",
        json={"teacher_id": admin_teacher["id"], "name": "5-A", "grade_level": "5"},
        headers=admin_headers,
    ).json()
    math = client.post(
        "/lessons", json={"teacher_id": admin_teacher["id"], "name": "Matematik"}, headers=admin_headers
    ).json()
    turkish = client.post(
        "/lessons", json={"teacher_id": admin_teacher["id"], "name": "Turkce"}, headers=admin_headers
    ).json()
    student = client.post(
        "/students",
        json={"classroom_id": classroom["id"], "first_name": "Ada", "last_name": "Yilmaz"},
        headers=admin_headers,
    ).json()
    return {"classroom": classroom, "math": math, "turkish": turkish, "student": student}


def test_non_admin_cannot_create_assignment(client: TestClient, branch_teacher: tuple[dict, dict]) -> None:
    _teacher, headers = branch_teacher

    response = client.post(
        "/teacher-assignments",
        json={"teacher_id": 1, "classroom_id": 1, "lesson_id": 1},
        headers=headers,
    )

    assert response.status_code == 403


def test_admin_can_create_assignment_and_it_grants_access(
    client: TestClient,
    admin: tuple[dict, dict],
    branch_teacher: tuple[dict, dict],
    classroom_and_lessons: dict,
) -> None:
    _admin_teacher, admin_headers = admin
    branch, branch_headers = branch_teacher
    classroom = classroom_and_lessons["classroom"]
    math = classroom_and_lessons["math"]
    student = classroom_and_lessons["student"]

    # Before any assignment, the branş teacher can't see the classroom at all.
    assert client.get(f"/classrooms/{classroom['id']}", headers=branch_headers).status_code == 404

    create_response = client.post(
        "/teacher-assignments",
        json={"teacher_id": branch["id"], "classroom_id": classroom["id"], "lesson_id": math["id"]},
        headers=admin_headers,
    )
    assert create_response.status_code == 201
    assignment = create_response.json()
    assert assignment["lesson_id"] == math["id"]
    assert assignment["is_active"] is True

    # Now the branş teacher can see the roster and grade Matematik.
    assert client.get(f"/classrooms/{classroom['id']}", headers=branch_headers).status_code == 200
    grade_response = client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": math["id"], "exam_name": "1. Yazili", "score": "88"},
        headers=branch_headers,
    )
    assert grade_response.status_code == 201


def test_duplicate_active_assignment_is_rejected(
    client: TestClient, admin: tuple[dict, dict], branch_teacher: tuple[dict, dict], classroom_and_lessons: dict
) -> None:
    _admin_teacher, admin_headers = admin
    branch, _branch_headers = branch_teacher
    payload = {
        "teacher_id": branch["id"],
        "classroom_id": classroom_and_lessons["classroom"]["id"],
        "lesson_id": classroom_and_lessons["math"]["id"],
    }

    first = client.post("/teacher-assignments", json=payload, headers=admin_headers)
    assert first.status_code == 201

    duplicate = client.post("/teacher-assignments", json=payload, headers=admin_headers)
    assert duplicate.status_code == 409


def test_subject_assignment_does_not_grant_other_subjects(
    client: TestClient, admin: tuple[dict, dict], branch_teacher: tuple[dict, dict], classroom_and_lessons: dict
) -> None:
    _admin_teacher, admin_headers = admin
    branch, branch_headers = branch_teacher
    classroom = classroom_and_lessons["classroom"]
    math = classroom_and_lessons["math"]
    turkish = classroom_and_lessons["turkish"]
    student = classroom_and_lessons["student"]

    client.post(
        "/teacher-assignments",
        json={"teacher_id": branch["id"], "classroom_id": classroom["id"], "lesson_id": math["id"]},
        headers=admin_headers,
    )

    # Roster is visible (classroom-level access)...
    assert client.get(f"/students/{student['id']}", headers=branch_headers).status_code == 200
    # ...but writing a Türkçe grade is a 403, not a 404: the teacher can see
    # this classroom exists, they just aren't assigned to this subject.
    forbidden = client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": turkish["id"], "exam_name": "1. Yazili", "score": "70"},
        headers=branch_headers,
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "Bu ders için yetkiniz yok."

    # And a classroom this teacher has no relationship to at all is a 404.
    other_classroom = client.post(
        "/classrooms",
        json={"teacher_id": _admin_teacher["id"], "name": "6-B", "grade_level": "6"},
        headers=admin_headers,
    ).json()
    assert client.get(f"/classrooms/{other_classroom['id']}", headers=branch_headers).status_code == 404


def test_homeroom_view_does_not_grant_other_subject_write(
    client: TestClient, classroom_and_lessons: dict, admin: tuple[dict, dict]
) -> None:
    # Deliberately NOT the admin fixture here — admins have blanket access
    # (madde 12), so this needs a plain, non-admin rehber to isolate the
    # "homeroom view != subject write" rule from the "admin can do anything"
    # rule.
    _admin_teacher, admin_headers = admin
    classroom = classroom_and_lessons["classroom"]
    turkish = classroom_and_lessons["turkish"]
    student = classroom_and_lessons["student"]

    homeroom_teacher, homeroom_headers = _register_and_login(client, "rehber@example.com")
    assign = client.post(
        "/teacher-assignments",
        json={"teacher_id": homeroom_teacher["id"], "classroom_id": classroom["id"], "lesson_id": None},
        headers=admin_headers,
    )
    assert assign.status_code == 201

    # Homeroom (rehber) — full view, but never assigned Türkçe as a subject.
    profile = client.get(f"/students/{student['id']}/profile", headers=homeroom_headers)
    assert profile.status_code == 200

    forbidden = client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": turkish["id"], "exam_name": "1. Yazili", "score": "70"},
        headers=homeroom_headers,
    )
    assert forbidden.status_code == 403


def test_admin_has_blanket_access_without_any_explicit_assignment(
    client: TestClient, classroom_and_lessons: dict, admin: tuple[dict, dict]
) -> None:
    _admin_teacher, admin_headers = admin
    classroom = classroom_and_lessons["classroom"]
    turkish = classroom_and_lessons["turkish"]
    student = classroom_and_lessons["student"]

    # The admin created the classroom (so is trivially its rehber), but the
    # point here is role=admin alone is enough — no assignment lookup needed.
    assert client.get(f"/classrooms/{classroom['id']}", headers=admin_headers).status_code == 200
    grade = client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": turkish["id"], "exam_name": "1. Yazili", "score": "70"},
        headers=admin_headers,
    )
    assert grade.status_code == 201


def test_deactivating_an_assignment_revokes_access(
    client: TestClient, admin: tuple[dict, dict], branch_teacher: tuple[dict, dict], classroom_and_lessons: dict
) -> None:
    _admin_teacher, admin_headers = admin
    branch, branch_headers = branch_teacher
    classroom = classroom_and_lessons["classroom"]
    math = classroom_and_lessons["math"]

    created = client.post(
        "/teacher-assignments",
        json={"teacher_id": branch["id"], "classroom_id": classroom["id"], "lesson_id": math["id"]},
        headers=admin_headers,
    ).json()
    assert client.get(f"/classrooms/{classroom['id']}", headers=branch_headers).status_code == 200

    deactivate = client.patch(
        f"/teacher-assignments/{created['id']}", json={"is_active": False}, headers=admin_headers
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    assert client.get(f"/classrooms/{classroom['id']}", headers=branch_headers).status_code == 404


def test_non_admin_cannot_deactivate_assignment(
    client: TestClient, admin: tuple[dict, dict], branch_teacher: tuple[dict, dict], classroom_and_lessons: dict
) -> None:
    _admin_teacher, admin_headers = admin
    branch, branch_headers = branch_teacher
    created = client.post(
        "/teacher-assignments",
        json={
            "teacher_id": branch["id"],
            "classroom_id": classroom_and_lessons["classroom"]["id"],
            "lesson_id": classroom_and_lessons["math"]["id"],
        },
        headers=admin_headers,
    ).json()

    response = client.patch(f"/teacher-assignments/{created['id']}", json={"is_active": False}, headers=branch_headers)

    assert response.status_code == 403


def test_teacher_can_only_list_own_assignments(
    client: TestClient, admin: tuple[dict, dict], branch_teacher: tuple[dict, dict], classroom_and_lessons: dict
) -> None:
    admin_teacher, admin_headers = admin
    branch, branch_headers = branch_teacher
    client.post(
        "/teacher-assignments",
        json={
            "teacher_id": branch["id"],
            "classroom_id": classroom_and_lessons["classroom"]["id"],
            "lesson_id": classroom_and_lessons["math"]["id"],
        },
        headers=admin_headers,
    )

    own = client.get("/teacher-assignments", headers=branch_headers)
    assert own.status_code == 200
    assert own.json()["total"] == 1

    forbidden = client.get(f"/teacher-assignments?teacher_id={admin_teacher['id']}", headers=branch_headers)
    assert forbidden.status_code == 403

    as_admin = client.get(f"/teacher-assignments?teacher_id={branch['id']}", headers=admin_headers)
    assert as_admin.status_code == 200
    assert as_admin.json()["total"] == 1
