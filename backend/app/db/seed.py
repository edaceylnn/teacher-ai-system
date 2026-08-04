from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Attendance, AttendanceStatus, Classroom, Grade, Lesson, Student, Teacher


DEMO_TEACHER_EMAIL = "eda@example.com"


def seed_demo_data(db: Session) -> None:
    teacher = db.scalar(select(Teacher).where(Teacher.email == DEMO_TEACHER_EMAIL))
    if teacher is None:
        teacher = Teacher(
            full_name="Eda Ceylan",
            email=DEMO_TEACHER_EMAIL,
            password_hash="demo-password-hash",
        )
        db.add(teacher)
        db.flush()

    classroom = db.scalar(
        select(Classroom).where(
            Classroom.teacher_id == teacher.id,
            Classroom.name == "5-A",
        )
    )
    if classroom is None:
        classroom = Classroom(
            teacher_id=teacher.id,
            name="5-A",
            grade_level="5",
        )
        db.add(classroom)
        db.flush()

    students = [
        ("Ada", "Yilmaz", "Derse katilimi iyi, problem cozme pratigine ihtiyaci var."),
        ("Mert", "Demir", "Okuma anlama becerisi guclu, odev takibi desteklenmeli."),
        ("Zeynep", "Kaya", "Sorumluluk bilinci yuksek, sinif ici paylasimlari artabilir."),
    ]
    saved_students: list[Student] = []
    for first_name, last_name, observation_notes in students:
        student = db.scalar(
            select(Student).where(
                Student.classroom_id == classroom.id,
                Student.first_name == first_name,
                Student.last_name == last_name,
            )
        )
        if student is None:
            student = Student(
                classroom_id=classroom.id,
                first_name=first_name,
                last_name=last_name,
                observation_notes=observation_notes,
            )
            db.add(student)
            db.flush()
        saved_students.append(student)

    lessons = []
    for lesson_name in ["Matematik", "Turkce"]:
        lesson = db.scalar(
            select(Lesson).where(
                Lesson.teacher_id == teacher.id,
                Lesson.name == lesson_name,
            )
        )
        if lesson is None:
            lesson = Lesson(teacher_id=teacher.id, name=lesson_name)
            db.add(lesson)
            db.flush()
        lessons.append(lesson)

    grades = [
        (saved_students[0], lessons[0], "1. Yazili", Decimal("82.50")),
        (saved_students[0], lessons[1], "1. Yazili", Decimal("88.00")),
        (saved_students[1], lessons[0], "1. Yazili", Decimal("71.00")),
        (saved_students[1], lessons[1], "1. Yazili", Decimal("79.50")),
        (saved_students[2], lessons[0], "1. Yazili", Decimal("93.00")),
        (saved_students[2], lessons[1], "1. Yazili", Decimal("90.00")),
    ]
    for student, lesson, exam_name, score in grades:
        existing_grade = db.scalar(
            select(Grade).where(
                Grade.student_id == student.id,
                Grade.lesson_id == lesson.id,
                Grade.exam_name == exam_name,
            )
        )
        if existing_grade is None:
            db.add(
                Grade(
                    student_id=student.id,
                    lesson_id=lesson.id,
                    exam_name=exam_name,
                    score=score,
                )
            )

    attendance_records = [
        (saved_students[0], date(2026, 1, 15), AttendanceStatus.present),
        (saved_students[0], date(2026, 1, 16), AttendanceStatus.excused),
        (saved_students[1], date(2026, 1, 15), AttendanceStatus.absent),
        (saved_students[1], date(2026, 1, 16), AttendanceStatus.present),
        (saved_students[2], date(2026, 1, 15), AttendanceStatus.present),
        (saved_students[2], date(2026, 1, 16), AttendanceStatus.present),
    ]
    for student, attendance_date, status in attendance_records:
        existing_attendance = db.scalar(
            select(Attendance).where(
                Attendance.student_id == student.id,
                Attendance.date == attendance_date,
            )
        )
        if existing_attendance is None:
            db.add(
                Attendance(
                    student_id=student.id,
                    date=attendance_date,
                    status=status,
                )
            )

    db.commit()


def main() -> None:
    with SessionLocal() as db:
        seed_demo_data(db)


if __name__ == "__main__":
    main()
