from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Classroom, Homework, Lesson, Teacher
from app.schemas.homework import HomeworkCreate, HomeworkResponse, HomeworkUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/homeworks", tags=["homeworks"])


def _ensure_refs(payload: HomeworkCreate | HomeworkUpdate, teacher_id: int | None, db: Session) -> None:
    if teacher_id is not None and db.get(Teacher, teacher_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    if payload.classroom_id is not None and db.get(Classroom, payload.classroom_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if payload.lesson_id is not None and db.get(Lesson, payload.lesson_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")


@router.post("", response_model=HomeworkResponse, status_code=status.HTTP_201_CREATED)
def create_homework(payload: HomeworkCreate, db: Session = Depends(get_db)) -> Homework:
    _ensure_refs(payload, payload.teacher_id, db)
    homework = Homework(**payload.model_dump())
    db.add(homework)
    db.commit()
    db.refresh(homework)
    return homework


@router.get("", response_model=PageResponse[HomeworkResponse])
def list_homeworks(
    teacher_id: int | None = None,
    classroom_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> PageResponse[HomeworkResponse]:
    statement = select(Homework).order_by(Homework.due_date, Homework.id)
    if teacher_id is not None:
        statement = statement.where(Homework.teacher_id == teacher_id)
    if classroom_id is not None:
        statement = statement.where(Homework.classroom_id == classroom_id)

    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.patch("/{homework_id}", response_model=HomeworkResponse)
def update_homework(
    homework_id: int,
    payload: HomeworkUpdate,
    db: Session = Depends(get_db),
) -> Homework:
    homework = db.get(Homework, homework_id)
    if homework is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    _ensure_refs(payload, None, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(homework, field, value)
    db.commit()
    db.refresh(homework)
    return homework


@router.delete("/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_homework(homework_id: int, db: Session = Depends(get_db)) -> Response:
    homework = db.get(Homework, homework_id)
    if homework is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    db.delete(homework)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
