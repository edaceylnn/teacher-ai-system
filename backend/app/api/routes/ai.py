from decimal import Decimal
from typing import Any, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import AIOutput, AIOutputType, Attendance, AttendanceStatus, Classroom, Grade, Homework, Lesson, Student, Teacher
from app.schemas.ai import (
    AIGenerateRequest,
    AIOutputResponse,
    AIOutputUpdate,
    AIWeeklySummaryRequest,
    AIWeeklySummaryResponse,
)
from app.services import ai as ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


def _decimal_to_float(value: Decimal) -> float:
    return float(value)


def _build_student_payload(student_id: int, db: Session) -> dict[str, Any]:
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

    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "classroom": {
                "id": classroom.id,
                "name": classroom.name,
                "grade_level": classroom.grade_level,
            },
            "observation_notes": student.observation_notes,
        },
        "grades": [
            {
                "lesson_name": lesson_name,
                "exam_name": grade.exam_name,
                "score": _decimal_to_float(grade.score),
            }
            for grade, lesson_name in grades
        ],
        "attendance": {
            "records": [
                {"date": attendance.date.isoformat(), "status": attendance.status.value}
                for attendance in attendance_records
            ],
            "summary": {
                "present": attendance_counts[AttendanceStatus.present],
                "absent": attendance_counts[AttendanceStatus.absent],
                "excused": attendance_counts[AttendanceStatus.excused],
                "total": len(attendance_records),
            },
        },
    }


def _generate_and_save(
    payload: AIGenerateRequest,
    output_type: AIOutputType,
    generator: Callable[[dict[str, Any]], dict[str, Any]],
    db: Session,
) -> AIOutput:
    input_payload = _build_student_payload(payload.student_id, db)
    try:
        output_payload = generator(input_payload)
    except ai_service.AIServiceUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    ai_output = AIOutput(
        student_id=payload.student_id,
        output_type=output_type,
        input_payload=input_payload,
        output_payload=output_payload,
    )
    db.add(ai_output)
    db.commit()
    db.refresh(ai_output)
    return ai_output


def _build_weekly_payload(payload: AIWeeklySummaryRequest, db: Session) -> dict[str, Any]:
    teacher = db.get(Teacher, payload.teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    classroom_statement = select(Classroom).where(Classroom.teacher_id == teacher.id).order_by(Classroom.id)
    if payload.classroom_id is not None:
        classroom_statement = classroom_statement.where(Classroom.id == payload.classroom_id)
    classrooms = list(db.scalars(classroom_statement).all())
    classroom_ids = [classroom.id for classroom in classrooms]

    students = list(
        db.scalars(select(Student).where(Student.classroom_id.in_(classroom_ids)).order_by(Student.id)).all()
        if classroom_ids
        else []
    )
    student_ids = [student.id for student in students]
    grades = (
        db.execute(
            select(Grade, Lesson.name, Student.first_name, Student.last_name)
            .join(Lesson, Lesson.id == Grade.lesson_id)
            .join(Student, Student.id == Grade.student_id)
            .where(Grade.student_id.in_(student_ids))
            .order_by(Grade.id.desc())
            .limit(80)
        ).all()
        if student_ids
        else []
    )
    attendance_records = (
        db.execute(
            select(Attendance, Student.first_name, Student.last_name)
            .join(Student, Student.id == Attendance.student_id)
            .where(Attendance.student_id.in_(student_ids))
            .order_by(Attendance.date.desc(), Attendance.id.desc())
            .limit(80)
        ).all()
        if student_ids
        else []
    )
    homeworks = (
        db.execute(
            select(Homework, Classroom.name, Lesson.name)
            .join(Classroom, Classroom.id == Homework.classroom_id)
            .join(Lesson, Lesson.id == Homework.lesson_id)
            .where(Homework.classroom_id.in_(classroom_ids))
            .order_by(Homework.due_date.desc(), Homework.id.desc())
            .limit(40)
        ).all()
        if classroom_ids
        else []
    )

    return {
        "teacher": {"id": teacher.id, "full_name": teacher.full_name},
        "classrooms": [{"id": classroom.id, "name": classroom.name} for classroom in classrooms],
        "student_count": len(students),
        "recent_grades": [
            {
                "student": f"{first_name} {last_name}",
                "lesson": lesson_name,
                "exam_name": grade.exam_name,
                "score": _decimal_to_float(grade.score),
            }
            for grade, lesson_name, first_name, last_name in grades
        ],
        "recent_attendance": [
            {
                "student": f"{first_name} {last_name}",
                "date": attendance.date.isoformat(),
                "status": attendance.status.value,
            }
            for attendance, first_name, last_name in attendance_records
        ],
        "homeworks": [
            {
                "title": homework.title,
                "classroom": classroom_name,
                "lesson": lesson_name,
                "due_date": homework.due_date.isoformat(),
                "status": homework.status.value,
            }
            for homework, classroom_name, lesson_name in homeworks
        ],
    }


@router.get("/outputs", response_model=list[AIOutputResponse])
def list_ai_outputs(
    student_id: int,
    output_type: AIOutputType | None = None,
    db: Session = Depends(get_db),
) -> list[AIOutput]:
    if db.get(Student, student_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    statement = (
        select(AIOutput)
        .where(AIOutput.student_id == student_id)
        .order_by(AIOutput.created_at.desc(), AIOutput.id.desc())
    )
    if output_type is not None:
        statement = statement.where(AIOutput.output_type == output_type)

    return list(db.scalars(statement).all())


@router.patch("/outputs/{output_id}", response_model=AIOutputResponse)
def update_ai_output(
    output_id: int,
    payload: AIOutputUpdate,
    db: Session = Depends(get_db),
) -> AIOutput:
    ai_output = db.get(AIOutput, output_id)
    if ai_output is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI output not found")

    ai_output.output_payload = payload.output_payload
    db.commit()
    db.refresh(ai_output)
    return ai_output


@router.post("/report-comments", response_model=AIOutputResponse, status_code=status.HTTP_201_CREATED)
def generate_report_comment(payload: AIGenerateRequest, db: Session = Depends(get_db)) -> AIOutput:
    return _generate_and_save(
        payload=payload,
        output_type=AIOutputType.report_comment,
        generator=ai_service.generate_report_comment,
        db=db,
    )


@router.post("/parent-messages", response_model=AIOutputResponse, status_code=status.HTTP_201_CREATED)
def generate_parent_message(payload: AIGenerateRequest, db: Session = Depends(get_db)) -> AIOutput:
    return _generate_and_save(
        payload=payload,
        output_type=AIOutputType.parent_message,
        generator=ai_service.generate_parent_message,
        db=db,
    )


@router.post("/weekly-summaries", response_model=AIWeeklySummaryResponse)
def generate_weekly_summary(payload: AIWeeklySummaryRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    input_payload = _build_weekly_payload(payload, db)
    try:
        return ai_service.generate_weekly_summary(input_payload)
    except ai_service.AIServiceUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
