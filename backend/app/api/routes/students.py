from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Attendance, AttendanceStatus, Classroom, Grade, Lesson, Student
from app.schemas.student import (
    StudentCreate,
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
def create_student(payload: StudentCreate, db: Session = Depends(get_db)) -> Student:
    classroom = db.get(Classroom, payload.classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    student = Student(
        classroom_id=payload.classroom_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        observation_notes=payload.observation_notes,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("", response_model=list[StudentResponse])
def list_students(classroom_id: int | None = None, db: Session = Depends(get_db)) -> list[Student]:
    statement = select(Student).order_by(Student.id)
    if classroom_id is not None:
        statement = statement.where(Student.classroom_id == classroom_id)

    return list(db.scalars(statement).all())


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    return student


@router.get("/{student_id}/profile", response_model=StudentProfileResponse)
def get_student_profile(student_id: int, db: Session = Depends(get_db)) -> StudentProfileResponse:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

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
) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    update_data = payload.model_dump(exclude_unset=True)
    classroom_id = update_data.get("classroom_id")
    if classroom_id is not None and db.get(Classroom, classroom_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)) -> Response:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    db.delete(student)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
