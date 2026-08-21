from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_teacher
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import AIOutput, AIOutputType, AcademicYear, Teacher, TeacherAssignment
from app.services import ai as ai_service


def _assign_subject(db_session: Session, *, teacher_id: int, classroom_id: int, lesson_id: int) -> None:
    academic_year = db_session.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))
    db_session.add(
        TeacherAssignment(
            teacher_id=teacher_id,
            classroom_id=classroom_id,
            lesson_id=lesson_id,
            academic_year_id=academic_year.id,
            is_active=True,
        )
    )
    db_session.commit()


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


def test_generate_topic_analysis_saves_ai_output(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    monkeypatch.setattr(
        ai_service,
        "generate_topic_analysis",
        lambda input_payload: {
            "title": "Eksik konu analizi",
            "summary": "Ada problem cozme pratigiyle desteklenmeli.",
            "missing_topics": ["Problem cozme"],
            "practice_plan": ["Haftada iki kisa alistirma"],
            "teacher_notes": ["Somut orneklerle ilerle"],
        },
    )

    response = client.post("/ai/topic-analyses", json={"student_id": student["id"]})

    assert response.status_code == 201
    body = response.json()
    assert body["output_type"] == "development_suggestion"
    assert body["output_payload"]["missing_topics"] == ["Problem cozme"]


def test_generate_lesson_plan_returns_structured_plan(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    teacher: Teacher,
    student: dict,
) -> None:
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()
    _assign_subject(db_session, teacher_id=teacher.id, classroom_id=student["classroom_id"], lesson_id=lesson["id"])
    monkeypatch.setattr(
        ai_service,
        "generate_lesson_plan",
        lambda input_payload: {
            "title": "Kesir problemleri",
            "objective": "Kesir problemlerini cozer.",
            "warmup": "Kisa tekrar sorulari",
            "activities": ["Modelleme", "Esli problem cozumu"],
            "assessment": "Cikis bileti",
            "homework": "5 problem",
        },
    )

    response = client.post(
        "/ai/lesson-plans",
        json={
            "teacher_id": teacher.id,
            "classroom_id": student["classroom_id"],
            "lesson_id": lesson["id"],
            "topic": "Kesirler",
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Kesir problemleri"


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


def test_generate_report_comment_reuses_cached_output_when_data_unchanged(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    call_count = 0

    def fake_generate_report_comment(input_payload: dict) -> dict:
        nonlocal call_count
        call_count += 1
        return {
            "title": "Karne Yorumu",
            "comment": "Ada iyi ilerliyor.",
            "strengths": [],
            "growth_areas": [],
            "teacher_actions": [],
        }

    monkeypatch.setattr(ai_service, "generate_report_comment", fake_generate_report_comment)

    first = client.post("/ai/report-comments", json={"student_id": student["id"]})
    second = client.post("/ai/report-comments", json={"student_id": student["id"]})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert call_count == 1


def test_generate_report_comment_regenerates_when_data_changed(
    client: TestClient,
    db_session: Session,
    teacher: Teacher,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    call_count = 0

    def fake_generate_report_comment(input_payload: dict) -> dict:
        nonlocal call_count
        call_count += 1
        return {
            "title": "Karne Yorumu",
            "comment": f"Yorum {call_count}",
            "strengths": [],
            "growth_areas": [],
            "teacher_actions": [],
        }

    monkeypatch.setattr(ai_service, "generate_report_comment", fake_generate_report_comment)

    first = client.post("/ai/report-comments", json={"student_id": student["id"]})

    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()
    _assign_subject(db_session, teacher_id=teacher.id, classroom_id=student["classroom_id"], lesson_id=lesson["id"])
    client.post(
        "/grades",
        json={"student_id": student["id"], "lesson_id": lesson["id"], "exam_name": "1. Yazili", "score": "90"},
    )

    second = client.post("/ai/report-comments", json={"student_id": student["id"]})

    assert first.json()["id"] != second.json()["id"]
    assert call_count == 2


def test_generate_report_comment_force_regenerate_bypasses_cache(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    student: dict,
) -> None:
    call_count = 0

    def fake_generate_report_comment(input_payload: dict) -> dict:
        nonlocal call_count
        call_count += 1
        return {
            "title": "Karne Yorumu",
            "comment": f"Yorum {call_count}",
            "strengths": [],
            "growth_areas": [],
            "teacher_actions": [],
        }

    monkeypatch.setattr(ai_service, "generate_report_comment", fake_generate_report_comment)

    first = client.post("/ai/report-comments", json={"student_id": student["id"]})
    second = client.post(
        "/ai/report-comments", json={"student_id": student["id"], "force_regenerate": True}
    )

    assert first.json()["id"] != second.json()["id"]
    assert call_count == 2


def test_generate_ai_output_returns_404_for_missing_student(client: TestClient, teacher: Teacher) -> None:
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


def test_subject_teacher_cannot_view_or_edit_another_teachers_ai_output(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    teacher: Teacher,
    student: dict,
) -> None:
    # Eda is the homeroom (rehber) teacher for 5-A and generates a report as
    # herself — its input_payload covers every subject for this student.
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

    # Ahmet only has a subject (branş) assignment for Matematik in the same
    # classroom — no homeroom access, and he did not generate this output.
    ahmet = Teacher(full_name="Ahmet Yilmaz", email="ahmet@example.com", password_hash="hashed-password")
    db_session.add(ahmet)
    db_session.commit()
    db_session.refresh(ahmet)
    lesson = client.post("/lessons", json={"teacher_id": teacher.id, "name": "Matematik"}).json()
    _assign_subject(db_session, teacher_id=ahmet.id, classroom_id=student["classroom_id"], lesson_id=lesson["id"])

    app.dependency_overrides[get_current_teacher] = lambda: ahmet
    try:
        list_response = client.get("/ai/outputs", params={"student_id": student["id"]})
        assert list_response.status_code == 200
        assert created["id"] not in [output["id"] for output in list_response.json()]

        update_response = client.patch(
            f"/ai/outputs/{created['id']}",
            json={
                "output_payload": {
                    "title": "Yetkisiz degisiklik",
                    "comment": "Bu Ahmet'in erisemeyecegi bir kayit.",
                    "strengths": [],
                    "growth_areas": [],
                    "teacher_actions": [],
                }
            },
        )
        assert update_response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_teacher, None)

    unchanged = db_session.get(AIOutput, created["id"])
    assert unchanged.output_payload["comment"] == "Ada iyi ilerliyor."
