import argparse
import os
from datetime import date
from datetime import time
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.session import SessionLocal
from app.models import (
    AcademicYear,
    AIOutput,
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
    StudentEnrollmentStatus,
    Teacher,
    TeacherAssignment,
    TeacherRole,
)

# Child-to-parent FK order — every table a teacher/visitor can populate
# through the app, so a reset always lands on a truly clean slate rather
# than whatever the ORM's per-entity delete cascades happen to leave behind
# (those are tuned for "delete one teacher", not "wipe the demo"). Deliberately
# excludes AcademicYear (the migration-seeded current year seed_demo_data
# depends on) and alembic_version.
_RESET_TABLES_CHILD_FIRST = (
    AIOutput,
    AuditLog,
    AssessmentRecord,
    AttendanceRecord,
    Assessment,
    AttendanceSession,
    ScheduleEntry,
    TeacherAssignment,
    CurriculumOutcome,
    Student,
    Lesson,
    Classroom,
    Teacher,
)


DEMO_TEACHER_EMAIL = "eda@example.com"
DEMO_TEACHER_PASSWORD = "demo12345"

# A second, branş-only teacher so the TeacherAssignment isolation is actually
# visible in the demo: Ahmet can grade Matematik in 5-A, but — unlike Eda,
# who is 5-A's rehber — has no access to 5-A's Türkçe records or roster
# management.
DEMO_BRANCH_TEACHER_EMAIL = "ahmet@example.com"
DEMO_BRANCH_TEACHER_PASSWORD = "demo12345"


def _ensure_assignment(
    db: Session,
    *,
    teacher_id: int,
    classroom_id: int,
    lesson_id: int | None,
    academic_year_id: int,
) -> None:
    existing = db.scalar(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.classroom_id == classroom_id,
            TeacherAssignment.lesson_id == lesson_id,
            TeacherAssignment.academic_year_id == academic_year_id,
        )
    )
    if existing is None:
        db.add(
            TeacherAssignment(
                teacher_id=teacher_id,
                classroom_id=classroom_id,
                lesson_id=lesson_id,
                academic_year_id=academic_year_id,
                is_active=True,
            )
        )
    elif not existing.is_active:
        existing.is_active = True


def seed_demo_data(db: Session) -> None:
    academic_year = db.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))
    if academic_year is None:
        raise RuntimeError(
            "No current AcademicYear found — run `alembic upgrade head` first "
            "(the teacher_assignments migration seeds one)."
        )

    teacher = db.scalar(select(Teacher).where(Teacher.email == DEMO_TEACHER_EMAIL))
    if teacher is None:
        teacher = Teacher(
            full_name="Eda Ceylan",
            email=DEMO_TEACHER_EMAIL,
            password_hash=hash_password(DEMO_TEACHER_PASSWORD),
            title="Kıdemli Sınıf Öğretmeni",
            role=TeacherRole.admin,
        )
        db.add(teacher)
        db.flush()
    else:
        if not verify_password(DEMO_TEACHER_PASSWORD, teacher.password_hash):
            teacher.password_hash = hash_password(DEMO_TEACHER_PASSWORD)
        if not teacher.title:
            teacher.title = "Kıdemli Sınıf Öğretmeni"
        if teacher.role != TeacherRole.admin:
            teacher.role = TeacherRole.admin

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

    _ensure_assignment(
        db, teacher_id=teacher.id, classroom_id=classroom.id, lesson_id=None, academic_year_id=academic_year.id
    )

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
        _ensure_assignment(
            db, teacher_id=teacher.id, classroom_id=classroom.id, lesson_id=lesson.id, academic_year_id=academic_year.id
        )

    # Second, branş-only teacher: assigned to teach Matematik in the same
    # 5-A classroom, with no homeroom and no Türkçe access — this is what
    # makes the isolation actually demonstrable rather than theoretical.
    branch_teacher = db.scalar(select(Teacher).where(Teacher.email == DEMO_BRANCH_TEACHER_EMAIL))
    if branch_teacher is None:
        branch_teacher = Teacher(
            full_name="Ahmet Yılmaz",
            email=DEMO_BRANCH_TEACHER_EMAIL,
            password_hash=hash_password(DEMO_BRANCH_TEACHER_PASSWORD),
            title="Branş Öğretmeni",
            branch="Matematik",
            role=TeacherRole.teacher,
        )
        db.add(branch_teacher)
        db.flush()
    elif not verify_password(DEMO_BRANCH_TEACHER_PASSWORD, branch_teacher.password_hash):
        branch_teacher.password_hash = hash_password(DEMO_BRANCH_TEACHER_PASSWORD)

    _ensure_assignment(
        db,
        teacher_id=branch_teacher.id,
        classroom_id=classroom.id,
        lesson_id=lessons[0].id,  # Matematik
        academic_year_id=academic_year.id,
    )

    grades = [
        (saved_students[0], lessons[0], "1. Yazili", Decimal("82.50")),
        (saved_students[0], lessons[1], "1. Yazili", Decimal("88.00")),
        (saved_students[1], lessons[0], "1. Yazili", Decimal("71.00")),
        (saved_students[1], lessons[1], "1. Yazili", Decimal("79.50")),
        (saved_students[2], lessons[0], "1. Yazili", Decimal("93.00")),
        (saved_students[2], lessons[1], "1. Yazili", Decimal("90.00")),
    ]
    for student, lesson, exam_name, score in grades:
        existing_assessment = db.scalar(
            select(Assessment).where(
                Assessment.classroom_id == classroom.id,
                Assessment.lesson_id == lesson.id,
                Assessment.title == exam_name,
                Assessment.assessment_type == AssessmentType.sinav,
            )
        )
        if existing_assessment is None:
            existing_assessment = Assessment(
                classroom_id=classroom.id,
                lesson_id=lesson.id,
                teacher_id=teacher.id,
                assessment_type=AssessmentType.sinav,
                title=exam_name,
                date=date(2026, 1, 11),
            )
            db.add(existing_assessment)
            db.flush()
        existing_record = db.scalar(
            select(AssessmentRecord).where(
                AssessmentRecord.assessment_id == existing_assessment.id,
                AssessmentRecord.student_id == student.id,
            )
        )
        if existing_record is None:
            db.add(AssessmentRecord(assessment_id=existing_assessment.id, student_id=student.id, score=score))

    attendance_records = [
        (saved_students[0], date(2026, 1, 15), AttendanceStatus.present),
        (saved_students[0], date(2026, 1, 16), AttendanceStatus.excused),
        (saved_students[1], date(2026, 1, 15), AttendanceStatus.absent),
        (saved_students[1], date(2026, 1, 16), AttendanceStatus.present),
        (saved_students[2], date(2026, 1, 15), AttendanceStatus.present),
        (saved_students[2], date(2026, 1, 16), AttendanceStatus.present),
    ]
    for student, attendance_date, status in attendance_records:
        session = db.scalar(
            select(AttendanceSession).where(
                AttendanceSession.classroom_id == classroom.id,
                AttendanceSession.lesson_id.is_(None),
                AttendanceSession.date == attendance_date,
            )
        )
        if session is None:
            session = AttendanceSession(
                classroom_id=classroom.id,
                lesson_id=None,
                teacher_id=teacher.id,
                date=attendance_date,
            )
            db.add(session)
            db.flush()
        existing_record = db.scalar(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session.id,
                AttendanceRecord.student_id == student.id,
            )
        )
        if existing_record is None:
            db.add(AttendanceRecord(session_id=session.id, student_id=student.id, status=status))

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
        (lessons[0], "Kesir problemleri", "Sayfa 42-43 alistirmalari", date(2026, 1, 20)),
        (lessons[1], "Okuma gunlugu", "Bu haftaki metin icin 5 cumlelik ozet", date(2026, 1, 22)),
    ]
    for lesson, title, description, due_date in homeworks:
        existing_homework = db.scalar(
            select(Assessment).where(
                Assessment.teacher_id == teacher.id,
                Assessment.classroom_id == classroom.id,
                Assessment.lesson_id == lesson.id,
                Assessment.title == title,
                Assessment.assessment_type == AssessmentType.odev,
            )
        )
        if existing_homework is None:
            db.add(
                Assessment(
                    teacher_id=teacher.id,
                    classroom_id=classroom.id,
                    lesson_id=lesson.id,
                    assessment_type=AssessmentType.odev,
                    title=title,
                    description=description,
                    date=due_date,
                )
            )

    db.commit()


def reset_demo_data(db: Session) -> None:
    """Wipes every table a logged-in visitor could have touched, then
    reseeds fresh. Unlike seed_demo_data (which only ever adds/repairs),
    this also clears out anything a demo visitor created or vandalized —
    extra classrooms, deleted students, garbage curriculum outcomes, a
    hijacked password — so a public demo self-heals on a schedule instead
    of staying broken until someone notices and intervenes by hand."""
    for model in _RESET_TABLES_CHILD_FIRST:
        db.execute(delete(model))
    db.commit()
    # The bulk deletes above go around the ORM, so any object this session
    # already had loaded (e.g. a caller that fetched a Teacher before
    # resetting) is now a stale identity-map entry for a deleted row — clear
    # it so seed_demo_data's inserts don't collide with a reused primary key.
    db.expunge_all()
    seed_demo_data(db)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Seed (or reset) the demo dataset.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe all teacher/classroom/student/assessment data first, then reseed fresh. "
        "Use this for a public demo that visitors can edit or delete — run it on a schedule "
        "(cron) so the demo self-heals instead of staying broken.",
    )
    args = parser.parse_args(argv)

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
        if args.reset:
            reset_demo_data(db)
        else:
            seed_demo_data(db)


if __name__ == "__main__":
    main()
