from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Attendance, Student
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/attendance-records", tags=["attendance"])


def _ensure_student_exists(student_id: int, db: Session) -> None:
    if db.get(Student, student_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(payload: AttendanceCreate, db: Session = Depends(get_db)) -> Attendance:
    _ensure_student_exists(payload.student_id, db)

    attendance = Attendance(
        student_id=payload.student_id,
        date=payload.date,
        status=payload.status,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.get("", response_model=PageResponse[AttendanceResponse])
def list_attendance_records(
    student_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> PageResponse[AttendanceResponse]:
    statement = select(Attendance).order_by(Attendance.date, Attendance.id)
    if student_id is not None:
        statement = statement.where(Attendance.student_id == student_id)

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance(attendance_id: int, db: Session = Depends(get_db)) -> Attendance:
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    return attendance


@router.patch("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
) -> Attendance:
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    update_data = payload.model_dump(exclude_unset=True)
    student_id = update_data.get("student_id")
    if student_id is not None:
        _ensure_student_exists(student_id, db)

    for field, value in update_data.items():
        setattr(attendance, field, value)

    db.commit()
    db.refresh(attendance)
    return attendance


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)) -> Response:
    attendance = db.get(Attendance, attendance_id)
    if attendance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    db.delete(attendance)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
