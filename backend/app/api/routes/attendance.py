from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import assigned_classroom_ids, ensure_student_owner, get_current_teacher
from app.db.session import get_db
from app.models import AttendanceRecord, AttendanceSession, Student, Teacher
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceUpdate
from app.schemas.pagination import PageResponse

# Legacy compatibility router — a per-student, lesson-less "attendance
# record" is now an AttendanceRecord inside a lesson-less (lesson_id=NULL)
# AttendanceSession for that classroom+date. Multiple students marked one
# at a time for the same day land in the same session, matching the old
# table's implicit "one day = one attendance state per student" shape,
# while lesson-scoped roll-call (Faz 2) uses /attendance-sessions instead.

router = APIRouter(prefix="/attendance-records", tags=["attendance"])


def _to_response(record: AttendanceRecord) -> AttendanceResponse:
    return AttendanceResponse(
        id=record.id,
        student_id=record.student_id,
        date=record.session.date,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _find_or_create_session(classroom_id: int, date_value, teacher: Teacher, db: Session) -> AttendanceSession:
    session = db.scalar(
        select(AttendanceSession).where(
            AttendanceSession.classroom_id == classroom_id,
            AttendanceSession.lesson_id.is_(None),
            AttendanceSession.date == date_value,
        )
    )
    if session is None:
        session = AttendanceSession(classroom_id=classroom_id, lesson_id=None, teacher_id=teacher.id, date=date_value)
        db.add(session)
        db.flush()
    return session


def _delete_session_if_empty(session_id: int, db: Session) -> None:
    remaining = db.scalar(
        select(func.count()).select_from(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
    )
    if not remaining:
        session = db.get(AttendanceSession, session_id)
        if session is not None:
            db.delete(session)


def _ensure_student_exists(student_id: int, teacher: Teacher, db: Session) -> Student:
    return ensure_student_owner(db.get(Student, student_id), teacher, db)


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AttendanceResponse:
    student = _ensure_student_exists(payload.student_id, current_teacher, db)

    session = _find_or_create_session(student.classroom_id, payload.date, current_teacher, db)
    record = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.student_id == student.id,
        )
    )
    if record is None:
        record = AttendanceRecord(session_id=session.id, student_id=student.id, status=payload.status)
        db.add(record)
    else:
        record.status = payload.status
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.get("", response_model=PageResponse[AttendanceResponse])
def list_attendance_records(
    student_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[AttendanceResponse]:
    accessible_ids = assigned_classroom_ids(current_teacher, db)
    statement = (
        select(AttendanceRecord)
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .join(Student, Student.id == AttendanceRecord.student_id)
        .where(Student.classroom_id.in_(accessible_ids))
        .order_by(AttendanceSession.date, AttendanceRecord.id)
    )
    if student_id is not None:
        statement = statement.where(AttendanceRecord.student_id == student_id)

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=[_to_response(record) for record in items], total=total, limit=limit, offset=offset)


def _get_record(attendance_id: int, teacher: Teacher, db: Session) -> AttendanceRecord:
    record = db.get(AttendanceRecord, attendance_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    ensure_student_owner(db.get(Student, record.student_id), teacher, db)
    return record


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AttendanceResponse:
    return _to_response(_get_record(attendance_id, current_teacher, db))


@router.patch("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AttendanceResponse:
    record = _get_record(attendance_id, current_teacher, db)
    old_session_id = record.session_id

    update_data = payload.model_dump(exclude_unset=True)
    next_student = record.student
    if "student_id" in update_data:
        next_student = _ensure_student_exists(update_data["student_id"], current_teacher, db)

    next_date = update_data.get("date", record.session.date)
    needs_new_session = "student_id" in update_data or "date" in update_data
    if needs_new_session:
        new_session = _find_or_create_session(next_student.classroom_id, next_date, current_teacher, db)
        record.session_id = new_session.id
    if "student_id" in update_data:
        record.student_id = next_student.id
    if "status" in update_data:
        record.status = update_data["status"]

    db.flush()
    if needs_new_session and old_session_id != record.session_id:
        _delete_session_if_empty(old_session_id, db)

    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    record = _get_record(attendance_id, current_teacher, db)
    session_id = record.session_id
    db.delete(record)
    db.flush()
    _delete_session_if_empty(session_id, db)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
