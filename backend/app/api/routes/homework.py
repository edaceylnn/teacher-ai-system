from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import ensure_homework_write_access, ensure_subject_write_access, get_current_teacher, visible_academic_scope
from app.db.session import get_db
from app.models import Homework, Teacher
from app.schemas.homework import HomeworkCreate, HomeworkResponse, HomeworkUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/homeworks", tags=["homeworks"])


def _visible_homework_condition(teacher: Teacher, db: Session):
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(Homework.classroom_id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(Homework.classroom_id, Homework.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


@router.post("", response_model=HomeworkResponse, status_code=status.HTTP_201_CREATED)
def create_homework(
    payload: HomeworkCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Homework:
    ensure_subject_write_access(current_teacher, payload.classroom_id, payload.lesson_id, db)
    homework = Homework(**{**payload.model_dump(), "teacher_id": current_teacher.id})
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
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[HomeworkResponse]:
    statement = (
        select(Homework)
        .where(_visible_homework_condition(current_teacher, db))
        .order_by(Homework.due_date, Homework.id)
    )
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
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Homework:
    homework = ensure_homework_write_access(db.get(Homework, homework_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    next_classroom_id = update_data.get("classroom_id", homework.classroom_id)
    next_lesson_id = update_data.get("lesson_id", homework.lesson_id)
    if "classroom_id" in update_data or "lesson_id" in update_data:
        ensure_subject_write_access(current_teacher, next_classroom_id, next_lesson_id, db)

    for field, value in update_data.items():
        setattr(homework, field, value)
    db.commit()
    db.refresh(homework)
    return homework


@router.delete("/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_homework(
    homework_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    homework = ensure_homework_write_access(db.get(Homework, homework_id), current_teacher, db)
    db.delete(homework)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
