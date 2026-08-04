from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models import (
    AIOutput,
    AIOutputType,
    Attendance,
    AttendanceStatus,
    Classroom,
    Grade,
    Lesson,
    Student,
    Teacher,
)


def test_database_models_create_expected_tables() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")

    Base.metadata.create_all(engine)

    table_names = set(inspect(engine).get_table_names())
    assert table_names == {
        "ai_outputs",
        "attendance_records",
        "classrooms",
        "grades",
        "lessons",
        "students",
        "teachers",
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
        grade = Grade(student=student, lesson=lesson, exam_name="1. Yazili", score=Decimal("82.50"))
        attendance = Attendance(student=student, date=date(2026, 1, 15), status=AttendanceStatus.present)
        ai_output = AIOutput(
            student=student,
            output_type=AIOutputType.report_comment,
            input_payload={"student_id": 1},
            output_payload={"comment": "Ada matematikte guclu bir ilerleme gosteriyor."},
        )

        session.add_all([teacher, classroom, student, lesson, grade, attendance, ai_output])
        session.commit()

        saved_student = session.query(Student).filter_by(first_name="Ada").one()
        assert saved_student.classroom.name == "5-A"
        assert saved_student.grades[0].lesson.name == "Matematik"
        assert saved_student.attendance_records[0].status == AttendanceStatus.present
        assert saved_student.ai_outputs[0].output_type == AIOutputType.report_comment
