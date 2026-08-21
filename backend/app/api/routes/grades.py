from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import ensure_grade_view_access, ensure_grade_write_access, ensure_subject_write_access, get_current_teacher, visible_academic_scope
from app.db.session import get_db
from app.models import Classroom, Grade, Student, Teacher
from app.schemas.grade import GradeCreate, GradeResponse, GradeUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/grades", tags=["grades"])


def _visible_grades_condition(teacher: Teacher, db: Session):
    """SQL condition (not a Python filter) so pagination/totals stay correct.
    A grade is visible if its classroom is a homeroom assignment (any
    subject) or its exact (classroom, lesson) pair is a subject assignment."""
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(Classroom.id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(Classroom.id, Grade.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


@router.post("", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(
    payload: GradeCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Grade:
    student = db.get(Student, payload.student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    ensure_subject_write_access(current_teacher, student.classroom_id, payload.lesson_id, db)

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
    statement = (
        select(Grade)
        .join(Student, Student.id == Grade.student_id)
        .join(Classroom, Classroom.id == Student.classroom_id)
        .where(_visible_grades_condition(current_teacher, db))
        .order_by(Grade.id)
    )
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
    return ensure_grade_view_access(db.get(Grade, grade_id), current_teacher, db)


@router.patch("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Grade:
    grade = ensure_grade_write_access(db.get(Grade, grade_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    next_student_id = update_data.get("student_id", grade.student_id)
    next_lesson_id = update_data.get("lesson_id", grade.lesson_id)
    if "student_id" in update_data or "lesson_id" in update_data:
        next_student = db.get(Student, next_student_id)
        if next_student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        ensure_subject_write_access(current_teacher, next_student.classroom_id, next_lesson_id, db)

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
    grade = ensure_grade_write_access(db.get(Grade, grade_id), current_teacher, db)
    db.delete(grade)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
