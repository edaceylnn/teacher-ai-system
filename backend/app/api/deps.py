from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Classroom, Grade, Homework, Lesson, ScheduleEntry, Student, Teacher

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


def ensure_classroom_owner(classroom: Classroom | None, teacher: Teacher) -> Classroom:
    if classroom is None or classroom.teacher_id != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    return classroom


def ensure_lesson_owner(lesson: Lesson | None, teacher: Teacher) -> Lesson:
    if lesson is None or lesson.teacher_id != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


def ensure_student_owner(student: Student | None, teacher: Teacher, db: Session) -> Student:
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    classroom = db.get(Classroom, student.classroom_id)
    ensure_classroom_owner(classroom, teacher)
    return student


def ensure_grade_owner(grade: Grade | None, teacher: Teacher, db: Session) -> Grade:
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    ensure_student_owner(db.get(Student, grade.student_id), teacher, db)
    return grade


def ensure_schedule_owner(entry: ScheduleEntry | None, teacher: Teacher) -> ScheduleEntry:
    if entry is None or entry.teacher_id != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule entry not found")
    return entry


def ensure_homework_owner(homework: Homework | None, teacher: Teacher) -> Homework:
    if homework is None or homework.teacher_id != teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    return homework
