from datetime import date as date_

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import (
    assigned_classroom_ids,
    ensure_attendance_session_write_access,
    ensure_classroom_access,
    ensure_subject_write_access,
    get_current_teacher,
    visible_academic_scope,
)
from app.db.session import get_db
from app.models import AttendanceRecord, AttendanceSession, Classroom, Student, Teacher
from app.schemas.attendance_session import (
    AttendanceRecordBulkUpdate,
    AttendanceRecordResponse,
    AttendanceRecordUpdate,
    AttendanceSessionCreate,
    AttendanceSessionResponse,
)
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/attendance-sessions", tags=["attendance"])


def _visible_sessions_condition(teacher: Teacher, db: Session):
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(AttendanceSession.classroom_id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(AttendanceSession.classroom_id, AttendanceSession.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


@router.post("", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
def create_attendance_session(
    payload: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AttendanceSession:
    if payload.lesson_id is not None:
        ensure_subject_write_access(current_teacher, payload.classroom_id, payload.lesson_id, db)
    else:
        ensure_classroom_access(db.get(Classroom, payload.classroom_id), current_teacher, db)

    session = AttendanceSession(**payload.model_dump(), teacher_id=current_teacher.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=PageResponse[AttendanceSessionResponse])
def list_attendance_sessions(
    classroom_id: int | None = None,
    lesson_id: int | None = None,
    date: date_ | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[AttendanceSessionResponse]:
    accessible_ids = assigned_classroom_ids(current_teacher, db)
    statement = (
        select(AttendanceSession)
        .where(AttendanceSession.classroom_id.in_(accessible_ids))
        .order_by(AttendanceSession.date.desc(), AttendanceSession.id.desc())
    )
    if classroom_id is not None:
        statement = statement.where(AttendanceSession.classroom_id == classroom_id)
    if lesson_id is not None:
        statement = statement.where(AttendanceSession.lesson_id == lesson_id)
    if date is not None:
        statement = statement.where(AttendanceSession.date == date)

    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{session_id}/records", response_model=list[AttendanceRecordResponse])
def list_session_records(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[AttendanceRecord]:
    session = ensure_attendance_session_write_access(db.get(AttendanceSession, session_id), current_teacher, db)
    statement = select(AttendanceRecord).where(AttendanceRecord.session_id == session.id)
    return list(db.scalars(statement).all())


def _upsert_record(session_id: int, student_id: int, status_value, db: Session) -> AttendanceRecord:
    record = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == student_id,
        )
    )
    if record is None:
        record = AttendanceRecord(session_id=session_id, student_id=student_id, status=status_value)
        db.add(record)
    else:
        record.status = status_value
    return record


@router.put("/{session_id}/records/{student_id}", response_model=AttendanceRecordResponse)
def upsert_session_record(
    session_id: int,
    student_id: int,
    payload: AttendanceRecordUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AttendanceRecord:
    session = ensure_attendance_session_write_access(db.get(AttendanceSession, session_id), current_teacher, db)
    student = db.get(Student, student_id)
    if student is None or student.classroom_id != session.classroom_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this classroom")

    record = _upsert_record(session.id, student_id, payload.status, db)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{session_id}/records", response_model=list[AttendanceRecordResponse])
def bulk_upsert_session_records(
    session_id: int,
    payload: AttendanceRecordBulkUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[AttendanceRecord]:
    session = ensure_attendance_session_write_access(db.get(AttendanceSession, session_id), current_teacher, db)

    roster_ids = set(db.scalars(select(Student.id).where(Student.classroom_id == session.classroom_id)).all())
    records: list[AttendanceRecord] = []
    for entry in payload.records:
        if entry.student_id not in roster_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this classroom")
        records.append(_upsert_record(session.id, entry.student_id, entry.status, db))
    db.commit()
    for record in records:
        db.refresh(record)
    return records


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    session = ensure_attendance_session_write_access(db.get(AttendanceSession, session_id), current_teacher, db)
    db.delete(session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
