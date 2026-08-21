from datetime import time

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import ensure_schedule_write_access, ensure_subject_write_access, get_current_teacher, visible_academic_scope
from app.db.session import get_db
from app.models import ScheduleEntry, Teacher
from app.schemas.pagination import PageResponse
from app.schemas.schedule import ScheduleEntryCreate, ScheduleEntryResponse, ScheduleEntryUpdate

router = APIRouter(prefix="/schedule-entries", tags=["schedule"])


def _visible_schedule_condition(teacher: Teacher, db: Session):
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(ScheduleEntry.classroom_id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(ScheduleEntry.classroom_id, ScheduleEntry.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


def _ensure_no_conflict(
    teacher_id: int,
    weekday: int,
    start_time: time,
    end_time: time,
    db: Session,
    exclude_id: int | None = None,
) -> None:
    statement = select(ScheduleEntry).where(
        ScheduleEntry.teacher_id == teacher_id,
        ScheduleEntry.weekday == weekday,
        ScheduleEntry.start_time < end_time,
        ScheduleEntry.end_time > start_time,
    )
    if exclude_id is not None:
        statement = statement.where(ScheduleEntry.id != exclude_id)
    if db.scalar(statement.limit(1)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Schedule time conflicts with another lesson")


@router.post("", response_model=ScheduleEntryResponse, status_code=status.HTTP_201_CREATED)
def create_schedule_entry(
    payload: ScheduleEntryCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ScheduleEntry:
    ensure_subject_write_access(current_teacher, payload.classroom_id, payload.lesson_id, db)
    _ensure_no_conflict(current_teacher.id, payload.weekday, payload.start_time, payload.end_time, db)
    entry = ScheduleEntry(**{**payload.model_dump(), "teacher_id": current_teacher.id})
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=PageResponse[ScheduleEntryResponse])
def list_schedule_entries(
    teacher_id: int | None = None,
    weekday: int | None = Query(default=None, ge=0, le=6),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[ScheduleEntryResponse]:
    statement = (
        select(ScheduleEntry)
        .where(_visible_schedule_condition(current_teacher, db))
        .order_by(ScheduleEntry.weekday, ScheduleEntry.start_time, ScheduleEntry.id)
    )
    if weekday is not None:
        statement = statement.where(ScheduleEntry.weekday == weekday)

    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.patch("/{entry_id}", response_model=ScheduleEntryResponse)
def update_schedule_entry(
    entry_id: int,
    payload: ScheduleEntryUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> ScheduleEntry:
    entry = ensure_schedule_write_access(db.get(ScheduleEntry, entry_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    next_classroom_id = update_data.get("classroom_id", entry.classroom_id)
    next_lesson_id = update_data.get("lesson_id", entry.lesson_id)
    if "classroom_id" in update_data or "lesson_id" in update_data:
        ensure_subject_write_access(current_teacher, next_classroom_id, next_lesson_id, db)

    next_weekday = update_data.get("weekday", entry.weekday)
    next_start = update_data.get("start_time", entry.start_time)
    next_end = update_data.get("end_time", entry.end_time)
    if next_end <= next_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="end_time must be after start_time")
    _ensure_no_conflict(entry.teacher_id, next_weekday, next_start, next_end, db, exclude_id=entry.id)

    for field, value in update_data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    entry = ensure_schedule_write_access(db.get(ScheduleEntry, entry_id), current_teacher, db)
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
