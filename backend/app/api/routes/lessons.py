from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher, visible_lesson_ids
from app.db.session import get_db
from app.models import Lesson, Teacher, TeacherRole
from app.schemas.lesson import LessonCreate, LessonResponse, LessonUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _ensure_lesson_visible(lesson: Lesson | None, teacher: Teacher, db: Session) -> Lesson:
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if teacher.role == TeacherRole.admin or lesson.id in visible_lesson_ids(teacher, db):
        return lesson
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")


def _ensure_lesson_manageable(lesson: Lesson | None, teacher: Teacher) -> Lesson:
    # Renaming/deleting a catalog entry is self-service for whoever created
    # it (unchanged from before Lesson became shareable) — or an admin, since
    # other teachers may hold TeacherAssignment rows against it by now.
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if teacher.role == TeacherRole.admin or lesson.teacher_id == teacher.id:
        return lesson
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Lesson:
    # Lesson is a shared subject catalog (madde 16) — creating one just
    # records who added it first; it grants no access by itself, that comes
    # from a TeacherAssignment.
    if payload.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    lesson = Lesson(teacher_id=current_teacher.id, name=payload.name)
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("", response_model=PageResponse[LessonResponse])
def list_lessons(
    teacher_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[LessonResponse]:
    statement = select(Lesson).order_by(Lesson.id)
    if current_teacher.role != TeacherRole.admin:
        # A regular teacher's "my lessons" = subjects they're assigned to
        # teach, union subjects they authored (so a newly-created lesson is
        # visible to its author even before any assignment exists).
        statement = statement.where(Lesson.id.in_(visible_lesson_ids(current_teacher, db)))

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Lesson:
    return _ensure_lesson_visible(db.get(Lesson, lesson_id), current_teacher, db)


@router.patch("/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Lesson:
    lesson = _ensure_lesson_manageable(db.get(Lesson, lesson_id), current_teacher)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    lesson = _ensure_lesson_manageable(db.get(Lesson, lesson_id), current_teacher)
    db.delete(lesson)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
