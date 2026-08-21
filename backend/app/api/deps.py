from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import (
    AcademicYear,
    Classroom,
    Grade,
    Homework,
    Lesson,
    ScheduleEntry,
    Student,
    Teacher,
    TeacherAssignment,
    TeacherRole,
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Teacher:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    teacher_id = int(payload.get("sub", 0))
    teacher = db.get(Teacher, teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return teacher


def require_admin(current_teacher: Teacher = Depends(get_current_teacher)) -> Teacher:
    if current_teacher.role != TeacherRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu işlem için yönetici yetkisi gerekiyor.")
    return current_teacher


# --- TeacherAssignment: the single source of truth for academic access -----
#
# A row with lesson_id IS NULL is a "rehber" (homeroom) assignment: full
# roster + a general view of every subject's records in that classroom, but
# no grade/homework/schedule editing rights. A row with lesson_id set is a
# "branş" (subject) assignment: view AND edit rights, scoped to exactly that
# classroom+lesson. Deactivated assignments (is_active=False) are excluded
# everywhere below but never deleted, so past academic years stay intact.


def current_academic_year(db: Session) -> AcademicYear | None:
    return db.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))


def _active_assignments(teacher: Teacher, db: Session) -> list[TeacherAssignment]:
    statement = select(TeacherAssignment).where(
        TeacherAssignment.teacher_id == teacher.id,
        TeacherAssignment.is_active.is_(True),
    )
    year = current_academic_year(db)
    if year is not None:
        statement = statement.where(TeacherAssignment.academic_year_id == year.id)
    return list(db.scalars(statement).all())


def visible_academic_scope(teacher: Teacher, db: Session) -> tuple[set[int], set[tuple[int, int]]]:
    """(homeroom_classroom_ids, subject_pairs) for this teacher's active
    assignments. A classroom in the first set grants VIEW access to every
    subject's records there; a (classroom_id, lesson_id) pair in the second
    set grants VIEW access to just that subject's records. Used everywhere a
    list/detail endpoint needs to filter what a teacher can *see*."""
    if teacher.role == TeacherRole.admin:
        # Madde 12: yönetici okul genelinde geniş yetkiye sahip — every
        # classroom behaves like a homeroom assignment for view purposes.
        return set(db.scalars(select(Classroom.id)).all()), set()
    assignments = _active_assignments(teacher, db)
    homeroom_classroom_ids = {a.classroom_id for a in assignments if a.lesson_id is None}
    subject_pairs = {(a.classroom_id, a.lesson_id) for a in assignments if a.lesson_id is not None}
    return homeroom_classroom_ids, subject_pairs


def assigned_classroom_ids(teacher: Teacher, db: Session) -> set[int]:
    if teacher.role == TeacherRole.admin:
        return set(db.scalars(select(Classroom.id)).all())
    return {a.classroom_id for a in _active_assignments(teacher, db)}


def assigned_subject_pairs(teacher: Teacher, db: Session) -> set[tuple[int, int]]:
    return {(a.classroom_id, a.lesson_id) for a in _active_assignments(teacher, db) if a.lesson_id is not None}


def ensure_classroom_access(classroom: Classroom | None, teacher: Teacher, db: Session) -> Classroom:
    """Any active assignment (homeroom or subject) in this classroom. Used
    for roster-level access — madde 5: an assigned teacher, of any kind, can
    see who's in the class."""
    if classroom is None or classroom.id not in assigned_classroom_ids(teacher, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    return classroom


def ensure_classroom_homeroom_access(classroom: Classroom | None, teacher: Teacher, db: Session) -> Classroom:
    """Only the rehber (homeroom, lesson_id IS NULL) assignment may edit or
    delete the classroom itself — a subject-only assignment gives grade/
    homework rights for one lesson, not roster/classroom management."""
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    homeroom_ids, _subject_pairs = visible_academic_scope(teacher, db)
    if classroom.id in homeroom_ids:
        return classroom
    if classroom.id in assigned_classroom_ids(teacher, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu sınıfı yönetmek için rehber öğretmeni olmalısınız.",
        )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")


def ensure_subject_write_access(teacher: Teacher, classroom_id: int, lesson_id: int, db: Session) -> None:
    """Only an active *subject* assignment for this exact classroom+lesson
    grants write access — a homeroom assignment alone is not enough (madde
    11: genel görüntüleme != not düzenleme). 404 when the teacher has no
    relationship to the classroom at all (don't reveal it exists); 403 when
    they can see the classroom but aren't assigned to this specific subject
    (madde 9's literal example)."""
    if teacher.role == TeacherRole.admin:
        return
    if classroom_id not in assigned_classroom_ids(teacher, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if (classroom_id, lesson_id) not in assigned_subject_pairs(teacher, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu ders için yetkiniz yok.")


def ensure_student_owner(student: Student | None, teacher: Teacher, db: Session) -> Student:
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    ensure_classroom_access(db.get(Classroom, student.classroom_id), teacher, db)
    return student


def ensure_grade_view_access(grade: Grade | None, teacher: Teacher, db: Session) -> Grade:
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    student = db.get(Student, grade.student_id)
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    if student.classroom_id in homeroom_ids or (student.classroom_id, grade.lesson_id) in subject_pairs:
        return grade
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")


def ensure_grade_write_access(grade: Grade | None, teacher: Teacher, db: Session) -> Grade:
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    student = db.get(Student, grade.student_id)
    ensure_subject_write_access(teacher, student.classroom_id, grade.lesson_id, db)
    return grade


def ensure_homework_write_access(homework: Homework | None, teacher: Teacher, db: Session) -> Homework:
    if homework is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    ensure_subject_write_access(teacher, homework.classroom_id, homework.lesson_id, db)
    return homework


def ensure_schedule_write_access(entry: ScheduleEntry | None, teacher: Teacher, db: Session) -> ScheduleEntry:
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule entry not found")
    ensure_subject_write_access(teacher, entry.classroom_id, entry.lesson_id, db)
    return entry


def visible_lesson_ids_for_classroom(teacher: Teacher, classroom_id: int, db: Session) -> set[int] | None:
    """None means "every lesson is visible" (this teacher has a homeroom
    assignment in the classroom); otherwise the specific subject lesson_ids
    they may see there. Used to filter the grades embedded in a student's
    profile and in AI context — madde 5/19: a subject teacher must not see
    (or hand to the AI) another subject's detailed records."""
    if teacher.role == TeacherRole.admin:
        return None
    assignments = _active_assignments(teacher, db)
    classroom_assignments = [a for a in assignments if a.classroom_id == classroom_id]
    if any(a.lesson_id is None for a in classroom_assignments):
        return None
    return {a.lesson_id for a in classroom_assignments if a.lesson_id is not None}


def visible_lesson_ids(teacher: Teacher, db: Session) -> set[int]:
    """Every lesson_id this teacher may reference — either because they
    created it (catalog authorship) or because they hold an active subject
    assignment for it in some classroom."""
    created = set(db.scalars(select(Lesson.id).where(Lesson.teacher_id == teacher.id)).all())
    _, subject_pairs = visible_academic_scope(teacher, db)
    return created | {lesson_id for _classroom_id, lesson_id in subject_pairs}
