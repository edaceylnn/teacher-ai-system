from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Grade, Lesson, Student
from app.schemas.grade import GradeCreate, GradeResponse, GradeUpdate

router = APIRouter(prefix="/grades", tags=["grades"])


def _ensure_student_exists(student_id: int, db: Session) -> None:
    if db.get(Student, student_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


def _ensure_lesson_exists(lesson_id: int, db: Session) -> None:
    if db.get(Lesson, lesson_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")


@router.post("", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(payload: GradeCreate, db: Session = Depends(get_db)) -> Grade:
    _ensure_student_exists(payload.student_id, db)
    _ensure_lesson_exists(payload.lesson_id, db)

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


@router.get("", response_model=list[GradeResponse])
def list_grades(
    student_id: int | None = None,
    lesson_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[Grade]:
    statement = select(Grade).order_by(Grade.id)
    if student_id is not None:
        statement = statement.where(Grade.student_id == student_id)
    if lesson_id is not None:
        statement = statement.where(Grade.lesson_id == lesson_id)

    return list(db.scalars(statement).all())


@router.get("/{grade_id}", response_model=GradeResponse)
def get_grade(grade_id: int, db: Session = Depends(get_db)) -> Grade:
    grade = db.get(Grade, grade_id)
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")

    return grade


@router.patch("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: Session = Depends(get_db),
) -> Grade:
    grade = db.get(Grade, grade_id)
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")

    update_data = payload.model_dump(exclude_unset=True)
    student_id = update_data.get("student_id")
    lesson_id = update_data.get("lesson_id")
    if student_id is not None:
        _ensure_student_exists(student_id, db)
    if lesson_id is not None:
        _ensure_lesson_exists(lesson_id, db)

    for field, value in update_data.items():
        setattr(grade, field, value)

    db.commit()
    db.refresh(grade)
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(grade_id: int, db: Session = Depends(get_db)) -> Response:
    grade = db.get(Grade, grade_id)
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")

    db.delete(grade)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
