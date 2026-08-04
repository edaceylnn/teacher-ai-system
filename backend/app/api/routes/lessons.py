from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Lesson, Teacher
from app.schemas.lesson import LessonCreate, LessonResponse, LessonUpdate

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(payload: LessonCreate, db: Session = Depends(get_db)) -> Lesson:
    teacher = db.get(Teacher, payload.teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    lesson = Lesson(teacher_id=payload.teacher_id, name=payload.name)
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("", response_model=list[LessonResponse])
def list_lessons(teacher_id: int | None = None, db: Session = Depends(get_db)) -> list[Lesson]:
    statement = select(Lesson).order_by(Lesson.id)
    if teacher_id is not None:
        statement = statement.where(Lesson.teacher_id == teacher_id)

    return list(db.scalars(statement).all())


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(lesson_id: int, db: Session = Depends(get_db)) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    db: Session = Depends(get_db),
) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)) -> Response:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    db.delete(lesson)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
