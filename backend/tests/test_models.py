from datetime import date, time
from decimal import Decimal

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models import (
    AIOutput,
    AIOutputType,
    Assessment,
    AssessmentRecord,
    AssessmentType,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    AuditLog,
    Classroom,
    CurriculumOutcome,
    Lesson,
    ScheduleEntry,
    Student,
    Teacher,
)


def test_database_models_create_expected_tables() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")

    Base.metadata.create_all(engine)

    table_names = set(inspect(engine).get_table_names())
    assert table_names == {
        "academic_years",
        "ai_outputs",
        "assessments",
        "assessment_records",
        "attendance_sessions",
        "attendance_records",
        "audit_logs",
        "classrooms",
        "curriculum_outcomes",
        "lessons",
        "schedule_entries",
        "school_schedule_settings",
        "students",
        "teacher_assignments",
        "teachers",
        "terms",
    }


def test_teacher_student_ai_output_relationships() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        teacher = Teacher(
            full_name="Eda Ceylan",
            email="eda@example.com",
            password_hash="hashed-password",
        )
        classroom = Classroom(name="5-A", grade_level="5", teacher=teacher)
        student = Student(
            first_name="Ada",
            last_name="Yilmaz",
            classroom=classroom,
            observation_notes="Derse katilimi iyi, problem cozme pratigine ihtiyaci var.",
        )
        lesson = Lesson(name="Matematik", teacher=teacher)
        curriculum_outcome = CurriculumOutcome(
            lesson=lesson,
            created_by_teacher=teacher,
            grade_level="5",
            unit_title="Kesirler",
            code="M.5.1",
            outcome_text="Kesirleri karşılaştırır.",
            source_name="Okul kazanım listesi",
            version_label="2026-2027",
        )
        assessment = Assessment(
            classroom=classroom,
            lesson=lesson,
            teacher=teacher,
            curriculum_outcome=curriculum_outcome,
            assessment_type=AssessmentType.sinav,
            title="1. Yazili",
            date=date(2026, 1, 11),
        )
        assessment_record = AssessmentRecord(assessment=assessment, student=student, score=Decimal("82.50"))
        attendance_session = AttendanceSession(
            classroom=classroom,
            lesson=lesson,
            teacher=teacher,
            date=date(2026, 1, 15),
        )
        attendance_record = AttendanceRecord(session=attendance_session, student=student, status=AttendanceStatus.present)
        schedule_entry = ScheduleEntry(
            teacher=teacher,
            classroom=classroom,
            lesson=lesson,
            weekday=0,
            start_time=time(9, 0),
            end_time=time(9, 40),
            location="Derslik 2",
        )
        homework = Assessment(
            teacher=teacher,
            classroom=classroom,
            lesson=lesson,
            assessment_type=AssessmentType.odev,
            title="Kesir problemleri",
            date=date(2026, 1, 20),
        )
        ai_output = AIOutput(
            student=student,
            output_type=AIOutputType.report_comment,
            input_payload={"student_id": 1},
            output_payload={"comment": "Ada matematikte guclu bir ilerleme gosteriyor."},
        )

        session.add_all(
            [
                teacher,
                classroom,
                student,
                lesson,
                curriculum_outcome,
                assessment,
                assessment_record,
                attendance_session,
                attendance_record,
                schedule_entry,
                homework,
                ai_output,
            ]
        )
        session.commit()

        saved_student = session.query(Student).filter_by(first_name="Ada").one()
        assert saved_student.classroom.name == "5-A"
        assert saved_student.assessment_records[0].assessment.lesson.name == "Matematik"
        assert saved_student.attendance_records[0].status == AttendanceStatus.present
        assert saved_student.ai_outputs[0].output_type == AIOutputType.report_comment
