from datetime import time

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Classroom, Lesson, ScheduleEntry, Teacher
from app.schemas.pagination import PageResponse
from app.schemas.schedule import ScheduleEntryCreate, ScheduleEntryResponse, ScheduleEntryUpdate

router = APIRouter(prefix="/schedule-entries", tags=["schedule"])


def _ensure_refs(payload: ScheduleEntryCreate | ScheduleEntryUpdate, teacher_id: int | None, db: Session) -> None:
    if teacher_id is not None and db.get(Teacher, teacher_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    if payload.classroom_id is not None and db.get(Classroom, payload.classroom_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    if payload.lesson_id is not None and db.get(Lesson, payload.lesson_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")


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
def create_schedule_entry(payload: ScheduleEntryCreate, db: Session = Depends(get_db)) -> ScheduleEntry:
    _ensure_refs(payload, payload.teacher_id, db)
    _ensure_no_conflict(payload.teacher_id, payload.weekday, payload.start_time, payload.end_time, db)
    entry = ScheduleEntry(**payload.model_dump())
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
) -> PageResponse[ScheduleEntryResponse]:
    statement = select(ScheduleEntry).order_by(ScheduleEntry.weekday, ScheduleEntry.start_time, ScheduleEntry.id)
    if teacher_id is not None:
        statement = statement.where(ScheduleEntry.teacher_id == teacher_id)
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
) -> ScheduleEntry:
    entry = db.get(ScheduleEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule entry not found")
    _ensure_refs(payload, None, db)

    update_data = payload.model_dump(exclude_unset=True)
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
def delete_schedule_entry(entry_id: int, db: Session = Depends(get_db)) -> Response:
    entry = db.get(ScheduleEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule entry not found")
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
