import os
from datetime import date
from datetime import time
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.session import SessionLocal
from app.models import (
    Attendance,
    AttendanceStatus,
    Classroom,
    Grade,
    Homework,
    HomeworkStatus,
    Lesson,
    ScheduleEntry,
    Student,
    StudentEnrollmentStatus,
    Teacher,
)


DEMO_TEACHER_EMAIL = "eda@example.com"
DEMO_TEACHER_PASSWORD = "demo12345"


def seed_demo_data(db: Session) -> None:
    teacher = db.scalar(select(Teacher).where(Teacher.email == DEMO_TEACHER_EMAIL))
    if teacher is None:
        teacher = Teacher(
            full_name="Eda Ceylan",
            email=DEMO_TEACHER_EMAIL,
            password_hash=hash_password(DEMO_TEACHER_PASSWORD),
            title="Kıdemli Sınıf Öğretmeni",
        )
        db.add(teacher)
        db.flush()
    else:
        if not verify_password(DEMO_TEACHER_PASSWORD, teacher.password_hash):
            teacher.password_hash = hash_password(DEMO_TEACHER_PASSWORD)
        if not teacher.title:
            teacher.title = "Kıdemli Sınıf Öğretmeni"

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
        (
            "Ada",
            "Yilmaz",
            "Derse katilimi iyi, problem cozme pratigine ihtiyaci var.",
            "ada.yilmaz@ogrenci.example.com",
            StudentEnrollmentStatus.active,
        ),
        (
            "Mert",
            "Demir",
            "Okuma anlama becerisi guclu, odev takibi desteklenmeli.",
            "mert.demir@ogrenci.example.com",
            StudentEnrollmentStatus.active,
        ),
        (
            "Zeynep",
            "Kaya",
            "Sorumluluk bilinci yuksek, sinif ici paylasimlari artabilir.",
            "zeynep.kaya@ogrenci.example.com",
            StudentEnrollmentStatus.reported,
        ),
    ]
    saved_students: list[Student] = []
    for first_name, last_name, observation_notes, email, enrollment_status in students:
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
                email=email,
                enrollment_status=enrollment_status,
            )
            db.add(student)
            db.flush()
        elif not student.email:
            student.email = email
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

    schedule_entries = [
        (classroom, lessons[0], 0, time(8, 30), time(9, 10), "5-A Derslik"),
        (classroom, lessons[1], 1, time(9, 10), time(9, 50), "5-A Derslik"),
        (classroom, lessons[0], 2, time(10, 0), time(10, 40), "Matematik Atolyesi"),
    ]
    for schedule_classroom, lesson, weekday, start_time, end_time, location in schedule_entries:
        existing_schedule = db.scalar(
            select(ScheduleEntry).where(
                ScheduleEntry.teacher_id == teacher.id,
                ScheduleEntry.weekday == weekday,
                ScheduleEntry.start_time == start_time,
                ScheduleEntry.end_time == end_time,
            )
        )
        if existing_schedule is None:
            db.add(
                ScheduleEntry(
                    teacher_id=teacher.id,
                    classroom_id=schedule_classroom.id,
                    lesson_id=lesson.id,
                    weekday=weekday,
                    start_time=start_time,
                    end_time=end_time,
                    location=location,
                )
            )

    homeworks = [
        (lessons[0], "Kesir problemleri", "Sayfa 42-43 alistirmalari", date(2026, 1, 20), HomeworkStatus.assigned),
        (lessons[1], "Okuma gunlugu", "Bu haftaki metin icin 5 cumlelik ozet", date(2026, 1, 22), HomeworkStatus.completed),
    ]
    for lesson, title, description, due_date, status in homeworks:
        existing_homework = db.scalar(
            select(Homework).where(
                Homework.teacher_id == teacher.id,
                Homework.classroom_id == classroom.id,
                Homework.lesson_id == lesson.id,
                Homework.title == title,
            )
        )
        if existing_homework is None:
            db.add(
                Homework(
                    teacher_id=teacher.id,
                    classroom_id=classroom.id,
                    lesson_id=lesson.id,
                    title=title,
                    description=description,
                    due_date=due_date,
                    status=status,
                )
            )

    db.commit()


def main() -> None:
    # This creates/resets a teacher with a publicly known demo password
    # (DEMO_TEACHER_PASSWORD above). Running it against a production database
    # by accident would plant a working backdoor account, so production
    # requires an explicit, separate opt-in beyond just ENVIRONMENT=production.
    if settings.environment == "production" and os.environ.get("ALLOW_PROD_SEED") != "true":
        raise SystemExit(
            "Refusing to seed demo data in production. This would create a "
            "login with a publicly known password. Set ALLOW_PROD_SEED=true "
            "if you really intend to seed this database."
        )
    with SessionLocal() as db:
        seed_demo_data(db)


if __name__ == "__main__":
    main()
