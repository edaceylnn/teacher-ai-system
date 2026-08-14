from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import ensure_classroom_owner, ensure_student_owner, get_current_teacher
from app.core.email import send_parent_message_email
from app.db.session import get_db
from app.models import Attendance, AttendanceStatus, Classroom, Grade, Lesson, Student, Teacher
from app.schemas.pagination import PageResponse
from app.schemas.student import (
    StudentCreate,
    StudentMessageRequest,
    StudentProfileAttendanceRecord,
    StudentProfileAttendanceSummary,
    StudentProfileClassroom,
    StudentProfileGrade,
    StudentProfileResponse,
    StudentResponse,
    StudentUpdate,
)

router = APIRouter(prefix="/students", tags=["students"])


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Student:
    ensure_classroom_owner(db.get(Classroom, payload.classroom_id), current_teacher)

    student = Student(
        classroom_id=payload.classroom_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        enrollment_status=payload.enrollment_status,
        parent_full_name=payload.parent_full_name,
        parent_phone=payload.parent_phone,
        parent_email=payload.parent_email,
        home_address=payload.home_address,
        observation_notes=payload.observation_notes,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("", response_model=PageResponse[StudentResponse])
def list_students(
    classroom_id: int | None = None,
    search: str | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[StudentResponse]:
    statement = select(Student).join(Classroom, Classroom.id == Student.classroom_id).where(
        Classroom.teacher_id == current_teacher.id
    ).order_by(Student.id)
    if classroom_id is not None:
        statement = statement.where(Student.classroom_id == classroom_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Student.first_name.ilike(search_pattern),
                Student.last_name.ilike(search_pattern),
            )
        )

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Student:
    return ensure_student_owner(db.get(Student, student_id), current_teacher, db)


@router.get("/{student_id}/profile", response_model=StudentProfileResponse)
def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> StudentProfileResponse:
    student = ensure_student_owner(db.get(Student, student_id), current_teacher, db)
    classroom = db.get(Classroom, student.classroom_id)
    grades = db.execute(
        select(Grade, Lesson.name)
        .join(Lesson, Lesson.id == Grade.lesson_id)
        .where(Grade.student_id == student.id)
        .order_by(Lesson.name, Grade.id)
    ).all()
    attendance_records = list(
        db.scalars(
            select(Attendance).where(Attendance.student_id == student.id).order_by(Attendance.date, Attendance.id)
        ).all()
    )
    attendance_counts = {attendance_status: 0 for attendance_status in AttendanceStatus}
    for attendance in attendance_records:
        attendance_counts[attendance.status] += 1

    return StudentProfileResponse(
        id=student.id,
        classroom_id=student.classroom_id,
        first_name=student.first_name,
        last_name=student.last_name,
        email=student.email,
        enrollment_status=student.enrollment_status,
        parent_full_name=student.parent_full_name,
        parent_phone=student.parent_phone,
        parent_email=student.parent_email,
        home_address=student.home_address,
        observation_notes=student.observation_notes,
        created_at=student.created_at,
        updated_at=student.updated_at,
        classroom=StudentProfileClassroom(
            id=classroom.id,
            name=classroom.name,
            grade_level=classroom.grade_level,
        ),
        grades=[
            StudentProfileGrade(
                id=grade.id,
                lesson_id=grade.lesson_id,
                lesson_name=lesson_name,
                exam_name=grade.exam_name,
                score=grade.score,
            )
            for grade, lesson_name in grades
        ],
        attendance_records=[
            StudentProfileAttendanceRecord(
                id=attendance.id,
                date=attendance.date.isoformat(),
                status=attendance.status,
            )
            for attendance in attendance_records
        ],
        attendance_summary=StudentProfileAttendanceSummary(
            present=attendance_counts[AttendanceStatus.present],
            absent=attendance_counts[AttendanceStatus.absent],
            excused=attendance_counts[AttendanceStatus.excused],
            total=len(attendance_records),
        ),
    )


@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Student:
    student = ensure_student_owner(db.get(Student, student_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    classroom_id = update_data.get("classroom_id")
    if classroom_id is not None:
        ensure_classroom_owner(db.get(Classroom, classroom_id), current_teacher)

    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


@router.post("/{student_id}/message", status_code=status.HTTP_202_ACCEPTED)
def send_student_parent_message(
    student_id: int,
    payload: StudentMessageRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    student = ensure_student_owner(db.get(Student, student_id), current_teacher, db)
    if not student.parent_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu öğrenci için kayıtlı bir veli e-postası yok.",
        )

    send_parent_message_email(student.parent_email, payload.subject, payload.message)
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    student = ensure_student_owner(db.get(Student, student_id), current_teacher, db)
    db.delete(student)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
