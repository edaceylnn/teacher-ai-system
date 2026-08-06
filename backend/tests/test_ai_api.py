from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import AIOutput, AIOutputType, Teacher
from app.services import ai as ai_service


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
            "observation_notes": "Derse katilimi iyi.",
        },
    ).json()


def test_generate_report_comment_saves_ai_output(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    def fake_generate_report_comment(input_payload: dict) -> dict:
        assert input_payload["student"]["first_name"] == "Ada"
        return {
            "title": "Karne Yorumu",
            "comment": "Ada derse katilimiyle olumlu bir gelisim gosteriyor.",
            "strengths": ["Derse katilim"],
            "growth_areas": ["Problem cozme pratigi"],
            "teacher_actions": ["Haftalik tekrar"],
        }

    monkeypatch.setattr(ai_service, "generate_report_comment", fake_generate_report_comment)

    response = client.post("/ai/report-comments", json={"student_id": student["id"]})

    assert response.status_code == 201
    body = response.json()
    assert body["student_id"] == student["id"]
    assert body["output_type"] == "report_comment"
    assert body["output_payload"]["comment"] == "Ada derse katilimiyle olumlu bir gelisim gosteriyor."

    saved_output = db_session.get(AIOutput, body["id"])
    assert saved_output is not None
    assert saved_output.output_type == AIOutputType.report_comment


def test_generate_parent_message_saves_ai_output(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    monkeypatch.setattr(
        ai_service,
        "generate_parent_message",
        lambda input_payload: {
            "subject": "Ada hakkinda kisa bilgilendirme",
            "message": "Ada bu hafta derse katilimda olumlu bir ilerleme gosterdi.",
            "tone": "yapici",
            "next_steps": ["Evde kisa tekrar"],
        },
    )

    response = client.post("/ai/parent-messages", json={"student_id": student["id"]})

    assert response.status_code == 201
    body = response.json()
    assert body["output_type"] == "parent_message"
    assert body["output_payload"]["tone"] == "yapici"


def test_list_ai_outputs_returns_saved_outputs(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    monkeypatch.setattr(
        ai_service,
        "generate_report_comment",
        lambda input_payload: {
            "title": "Karne Yorumu",
            "comment": "Ada iyi ilerliyor.",
            "strengths": [],
            "growth_areas": [],
            "teacher_actions": [],
        },
    )
    created = client.post("/ai/report-comments", json={"student_id": student["id"]}).json()

    response = client.get("/ai/outputs", params={"student_id": student["id"], "output_type": "report_comment"})

    assert response.status_code == 200
    assert [output["id"] for output in response.json()] == [created["id"]]


def test_update_ai_output_changes_output_payload(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    monkeypatch.setattr(
        ai_service,
        "generate_report_comment",
        lambda input_payload: {
            "title": "Karne Yorumu",
            "comment": "Ada iyi ilerliyor.",
            "strengths": [],
            "growth_areas": [],
            "teacher_actions": [],
        },
    )
    created = client.post("/ai/report-comments", json={"student_id": student["id"]}).json()

    response = client.patch(
        f"/ai/outputs/{created['id']}",
        json={
            "output_payload": {
                "title": "Düzenlenmiş yorum",
                "comment": "Öğretmen metni güncelledi.",
                "strengths": ["Katılım"],
                "growth_areas": ["Tekrar"],
                "teacher_actions": [],
            }
        },
    )

    assert response.status_code == 200
    assert response.json()["output_payload"]["title"] == "Düzenlenmiş yorum"
    saved_output = db_session.get(AIOutput, created["id"])
    assert saved_output.output_payload["comment"] == "Öğretmen metni güncelledi."


def test_generate_ai_output_returns_404_for_missing_student(client: TestClient) -> None:
    response = client.post("/ai/report-comments", json={"student_id": 999})

    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found"


def test_generate_ai_output_returns_503_when_service_unavailable(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    def unavailable(_: dict) -> dict:
        raise ai_service.AIServiceUnavailableError("OPENAI_API_KEY tanımlı değil.")

    monkeypatch.setattr(ai_service, "generate_report_comment", unavailable)

    response = client.post("/ai/report-comments", json={"student_id": student["id"]})

    assert response.status_code == 503
    assert response.json()["detail"] == "OPENAI_API_KEY tanımlı değil."
