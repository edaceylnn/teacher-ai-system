from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import ensure_grade_owner, ensure_lesson_owner, ensure_student_owner, get_current_teacher
from app.db.session import get_db
from app.models import Classroom, Grade, Lesson, Student, Teacher
from app.schemas.grade import GradeCreate, GradeResponse, GradeUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/grades", tags=["grades"])


def _ensure_student_exists(student_id: int, teacher: Teacher, db: Session) -> None:
    ensure_student_owner(db.get(Student, student_id), teacher, db)


def _ensure_lesson_exists(lesson_id: int, teacher: Teacher, db: Session) -> None:
    ensure_lesson_owner(db.get(Lesson, lesson_id), teacher)


@router.post("", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(
    payload: GradeCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Grade:
    _ensure_student_exists(payload.student_id, current_teacher, db)
    _ensure_lesson_exists(payload.lesson_id, current_teacher, db)

    grade = Grade(
        student_id=payload.student_id,
        lesson_id=payload.lesson_id,
        exam_name=payload.exam_name,
        score=payload.score,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


@router.get("", response_model=PageResponse[GradeResponse])
def list_grades(
    student_id: int | None = None,
    lesson_id: int | None = None,
    classroom_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[GradeResponse]:
    statement = select(Grade).join(Student, Student.id == Grade.student_id).join(
        Classroom, Classroom.id == Student.classroom_id
    ).where(Classroom.teacher_id == current_teacher.id).order_by(Grade.id)
    if student_id is not None:
        statement = statement.where(Grade.student_id == student_id)
    if lesson_id is not None:
        statement = statement.where(Grade.lesson_id == lesson_id)
    if classroom_id is not None:
        statement = statement.where(Student.classroom_id == classroom_id)

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{grade_id}", response_model=GradeResponse)
def get_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Grade:
    return ensure_grade_owner(db.get(Grade, grade_id), current_teacher, db)


@router.patch("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Grade:
    grade = ensure_grade_owner(db.get(Grade, grade_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    student_id = update_data.get("student_id")
    lesson_id = update_data.get("lesson_id")
    if student_id is not None:
        _ensure_student_exists(student_id, current_teacher, db)
    if lesson_id is not None:
        _ensure_lesson_exists(lesson_id, current_teacher, db)

    for field, value in update_data.items():
        setattr(grade, field, value)

    db.commit()
    db.refresh(grade)
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    grade = ensure_grade_owner(db.get(Grade, grade_id), current_teacher, db)
    db.delete(grade)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
