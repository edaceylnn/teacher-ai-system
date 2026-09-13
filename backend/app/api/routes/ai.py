from datetime import date
from decimal import Decimal
from typing import Any, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    assigned_classroom_ids,
    ensure_student_owner,
    ensure_subject_write_access,
    get_current_teacher,
    visible_academic_scope,
    visible_lesson_ids_for_classroom,
)
from app.core.rate_limit import InMemoryRateLimiter
from app.db.session import get_db
from app.models import (
    AIOutput,
    AIOutputType,
    Assessment,
    AssessmentRecord,
    AssessmentType,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    Classroom,
    Lesson,
    Student,
    Teacher,
    TeacherRole,
)
from app.schemas.ai import (
    AIGenerateRequest,
    AILessonPlanRequest,
    AILessonPlanResponse,
    AIOutputResponse,
    AIOutputUpdate,
    AIWeeklySummaryRequest,
    AIWeeklySummaryResponse,
)
from app.services import ai as ai_service

router = APIRouter(prefix="/ai", tags=["ai"])

# Shared (per client IP) across all generation endpoints below (not list/update)
# since each call is a billed OpenAI request.
ai_generation_rate_limiter = InMemoryRateLimiter(max_requests=15, window_seconds=60)


def _decimal_to_float(value: Decimal) -> float:
    return float(value)


GRADE_CATEGORY_LABELS_TR = {
    AssessmentType.sinav: "Sınav",
    AssessmentType.ders_ici_performans: "Ders İçi Performans",
    AssessmentType.performans_odevi: "Performans Ödevi",
    AssessmentType.odev: "Ödev",
}


def _homework_status_label(assessment_date, records: list) -> str:
    if not records:
        return "assigned"
    if all(record.is_completed for record in records):
        return "completed"
    if assessment_date < date.today():
        return "missing"
    return "assigned"


def _build_student_payload(student_id: int, db: Session, teacher: Teacher) -> dict[str, Any]:
    student = ensure_student_owner(db.get(Student, student_id), teacher, db)

    classroom = db.get(Classroom, student.classroom_id)
    grades = db.execute(
        select(AssessmentRecord, Assessment, Lesson.name)
        .join(Assessment, Assessment.id == AssessmentRecord.assessment_id)
        .join(Lesson, Lesson.id == Assessment.lesson_id)
        .where(AssessmentRecord.student_id == student.id, AssessmentRecord.score.is_not(None))
        .order_by(Lesson.name, AssessmentRecord.id)
    ).all()
    # Madde 19: a subject teacher's AI context must never include another
    # subject's detailed records — only a rehber (homeroom) assignment sees
    # everything for this student.
    visible_lessons = visible_lesson_ids_for_classroom(teacher, student.classroom_id, db)
    if visible_lessons is not None:
        grades = [row for row in grades if row[1].lesson_id in visible_lessons]
    attendance_records = list(
        db.execute(
            select(AttendanceRecord, AttendanceSession.date)
            .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
            .where(AttendanceRecord.student_id == student.id)
            .order_by(AttendanceSession.date, AttendanceRecord.id)
        ).all()
    )
    attendance_counts = {attendance_status: 0 for attendance_status in AttendanceStatus}
    for attendance, _attendance_date in attendance_records:
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
                "exam_name": assessment.title,
                "category": GRADE_CATEGORY_LABELS_TR[assessment.assessment_type],
                "score": _decimal_to_float(record.score),
            }
            for record, assessment, lesson_name in grades
        ],
        "attendance": {
            "records": [
                {"date": attendance_date.isoformat(), "status": attendance.status.value}
                for attendance, attendance_date in attendance_records
            ],
            "summary": {
                "present": attendance_counts[AttendanceStatus.present],
                "absent": attendance_counts[AttendanceStatus.absent],
                "excused": attendance_counts[AttendanceStatus.excused],
                "total": len(attendance_records),
            },
        },
    }


def _find_reusable_output(
    student_id: int, output_type: AIOutputType, input_payload: dict[str, Any], db: Session
) -> AIOutput | None:
    latest = db.scalar(
        select(AIOutput)
        .where(AIOutput.student_id == student_id, AIOutput.output_type == output_type)
        .order_by(AIOutput.created_at.desc(), AIOutput.id.desc())
        .limit(1)
    )
    if latest is not None and latest.input_payload == input_payload:
        return latest
    return None


def _generate_and_save(
    payload: AIGenerateRequest,
    output_type: AIOutputType,
    generator: Callable[[dict[str, Any]], dict[str, Any]],
    db: Session,
    teacher: Teacher,
) -> AIOutput:
    input_payload = _build_student_payload(payload.student_id, db, teacher)

    # Skip the OpenAI call when nothing the report is based on (grades,
    # attendance, notes) has changed since the last time it was generated.
    if not payload.force_regenerate:
        reusable = _find_reusable_output(payload.student_id, output_type, input_payload, db)
        if reusable is not None:
            return reusable

    try:
        output_payload = generator(input_payload)
    except ai_service.AIServiceUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    ai_output = AIOutput(
        student_id=payload.student_id,
        teacher_id=teacher.id,
        output_type=output_type,
        input_payload=input_payload,
        output_payload=output_payload,
    )
    db.add(ai_output)
    db.commit()
    db.refresh(ai_output)
    return ai_output


def _build_weekly_payload(payload: AIWeeklySummaryRequest, db: Session, teacher: Teacher) -> dict[str, Any]:
    accessible_ids = assigned_classroom_ids(teacher, db)
    if payload.classroom_id is not None:
        if payload.classroom_id not in accessible_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
        classroom_ids = [payload.classroom_id]
    else:
        classroom_ids = list(accessible_ids)
    classrooms = (
        list(db.scalars(select(Classroom).where(Classroom.id.in_(classroom_ids)).order_by(Classroom.id)).all())
        if classroom_ids
        else []
    )

    # Madde 18/19: the weekly summary's context is bounded by what this
    # teacher can actually see — a rehber's classrooms show every subject,
    # a branş-only classroom only shows that subject's grades/homework.
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)

    students = list(
        db.scalars(select(Student).where(Student.classroom_id.in_(classroom_ids)).order_by(Student.id)).all()
        if classroom_ids
        else []
    )
    student_ids = [student.id for student in students]
    all_grades = (
        db.execute(
            select(AssessmentRecord, Assessment, Lesson.name, Student.first_name, Student.last_name, Student.classroom_id)
            .join(Assessment, Assessment.id == AssessmentRecord.assessment_id)
            .join(Lesson, Lesson.id == Assessment.lesson_id)
            .join(Student, Student.id == AssessmentRecord.student_id)
            .where(AssessmentRecord.student_id.in_(student_ids), AssessmentRecord.score.is_not(None))
            .order_by(AssessmentRecord.id.desc())
            .limit(200)
        ).all()
        if student_ids
        else []
    )
    grades = [
        (record, assessment, lesson_name, first_name, last_name)
        for record, assessment, lesson_name, first_name, last_name, classroom_id in all_grades
        if classroom_id in homeroom_ids or (classroom_id, assessment.lesson_id) in subject_pairs
    ][:80]
    attendance_records = (
        db.execute(
            select(AttendanceRecord, AttendanceSession.date, Student.first_name, Student.last_name)
            .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
            .join(Student, Student.id == AttendanceRecord.student_id)
            .where(AttendanceRecord.student_id.in_(student_ids))
            .order_by(AttendanceSession.date.desc(), AttendanceRecord.id.desc())
            .limit(80)
        ).all()
        if student_ids
        else []
    )
    all_homeworks = (
        db.execute(
            select(Assessment, Classroom.name, Lesson.name)
            .join(Classroom, Classroom.id == Assessment.classroom_id)
            .join(Lesson, Lesson.id == Assessment.lesson_id)
            .where(Assessment.classroom_id.in_(classroom_ids), Assessment.assessment_type == AssessmentType.odev)
            .order_by(Assessment.date.desc(), Assessment.id.desc())
            .limit(200)
        ).all()
        if classroom_ids
        else []
    )
    homeworks = [
        (homework, classroom_name, lesson_name)
        for homework, classroom_name, lesson_name in all_homeworks
        if homework.classroom_id in homeroom_ids or (homework.classroom_id, homework.lesson_id) in subject_pairs
    ][:40]
    homework_ids = [homework.id for homework, _classroom_name, _lesson_name in homeworks]
    homework_records_by_assessment: dict[int, list[AssessmentRecord]] = {homework_id: [] for homework_id in homework_ids}
    if homework_ids:
        for record in db.scalars(
            select(AssessmentRecord).where(AssessmentRecord.assessment_id.in_(homework_ids))
        ).all():
            homework_records_by_assessment[record.assessment_id].append(record)

    return {
        "teacher": {"id": teacher.id, "full_name": teacher.full_name},
        "classrooms": [{"id": classroom.id, "name": classroom.name} for classroom in classrooms],
        "student_count": len(students),
        "recent_grades": [
            {
                "student": f"{first_name} {last_name}",
                "lesson": lesson_name,
                "exam_name": assessment.title,
                "category": GRADE_CATEGORY_LABELS_TR[assessment.assessment_type],
                "score": _decimal_to_float(record.score),
            }
            for record, assessment, lesson_name, first_name, last_name in grades
        ],
        "recent_attendance": [
            {
                "student": f"{first_name} {last_name}",
                "date": attendance_date.isoformat(),
                "status": attendance.status.value,
            }
            for attendance, attendance_date, first_name, last_name in attendance_records
        ],
        "homeworks": [
            {
                "title": homework.title,
                "classroom": classroom_name,
                "lesson": lesson_name,
                "due_date": homework.date.isoformat(),
                "status": _homework_status_label(homework.date, homework_records_by_assessment[homework.id]),
            }
            for homework, classroom_name, lesson_name in homeworks
        ],
    }


def _build_lesson_plan_payload(payload: AILessonPlanRequest, db: Session, teacher: Teacher) -> dict[str, Any]:
    # A lesson plan is written for a specific classroom+subject you actually
    # teach — same bar as editing grades/homework there.
    ensure_subject_write_access(teacher, payload.classroom_id, payload.lesson_id, db)
    classroom = db.get(Classroom, payload.classroom_id)
    lesson = db.get(Lesson, payload.lesson_id)

    students = list(
        db.scalars(select(Student).where(Student.classroom_id == classroom.id).order_by(Student.id)).all()
    )
    student_ids = [student.id for student in students]
    grades = (
        db.execute(
            select(AssessmentRecord, Assessment, Student.first_name, Student.last_name)
            .join(Assessment, Assessment.id == AssessmentRecord.assessment_id)
            .join(Student, Student.id == AssessmentRecord.student_id)
            .where(
                Assessment.lesson_id == lesson.id,
                AssessmentRecord.student_id.in_(student_ids),
                AssessmentRecord.score.is_not(None),
            )
            .order_by(AssessmentRecord.id.desc())
            .limit(40)
        ).all()
        if student_ids
        else []
    )

    return {
        "teacher": {"id": teacher.id, "full_name": teacher.full_name},
        "classroom": {"id": classroom.id, "name": classroom.name, "grade_level": classroom.grade_level},
        "lesson": {"id": lesson.id, "name": lesson.name},
        "topic": payload.topic,
        "student_count": len(students),
        "recent_lesson_grades": [
            {
                "student": f"{first_name} {last_name}",
                "exam_name": assessment.title,
                "category": GRADE_CATEGORY_LABELS_TR[assessment.assessment_type],
                "score": _decimal_to_float(record.score),
            }
            for record, assessment, first_name, last_name in grades
        ],
    }


def _ensure_ai_output_visible(ai_output: AIOutput, student: Student, teacher: Teacher, db: Session) -> None:
    # An AI output's input_payload was built from whatever the generating
    # teacher could see — a subject-only teacher's payload only covers their
    # own subject, a homeroom teacher's covers every subject. Any other
    # teacher who merely shares the classroom (e.g. a different subject)
    # must not be able to read or edit a report they didn't generate and
    # that may embed subjects outside their authorization (Madde 19).
    if teacher.role == TeacherRole.admin:
        return
    if ai_output.teacher_id == teacher.id:
        return
    homeroom_ids, _ = visible_academic_scope(teacher, db)
    if student.classroom_id in homeroom_ids:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu AI çıktısına erişim yetkiniz yok.")


@router.get("/outputs", response_model=list[AIOutputResponse])
def list_ai_outputs(
    student_id: int,
    output_type: AIOutputType | None = None,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[AIOutput]:
    student = ensure_student_owner(db.get(Student, student_id), current_teacher, db)

    statement = (
        select(AIOutput)
        .where(AIOutput.student_id == student_id)
        .order_by(AIOutput.created_at.desc(), AIOutput.id.desc())
    )
    if output_type is not None:
        statement = statement.where(AIOutput.output_type == output_type)

    outputs = list(db.scalars(statement).all())
    if current_teacher.role != TeacherRole.admin:
        homeroom_ids, _ = visible_academic_scope(current_teacher, db)
        if student.classroom_id not in homeroom_ids:
            outputs = [output for output in outputs if output.teacher_id == current_teacher.id]
    return outputs


@router.patch("/outputs/{output_id}", response_model=AIOutputResponse)
def update_ai_output(
    output_id: int,
    payload: AIOutputUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AIOutput:
    ai_output = db.get(AIOutput, output_id)
    if ai_output is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI output not found")
    student = ensure_student_owner(db.get(Student, ai_output.student_id), current_teacher, db)
    _ensure_ai_output_visible(ai_output, student, current_teacher, db)

    ai_output.output_payload = payload.output_payload
    db.commit()
    db.refresh(ai_output)
    return ai_output


@router.post(
    "/report-comments",
    response_model=AIOutputResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(ai_generation_rate_limiter)],
)
def generate_report_comment(
    payload: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AIOutput:
    return _generate_and_save(
        payload=payload,
        output_type=AIOutputType.report_comment,
        generator=ai_service.generate_report_comment,
        db=db,
        teacher=current_teacher,
    )


@router.post(
    "/parent-messages",
    response_model=AIOutputResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(ai_generation_rate_limiter)],
)
def generate_parent_message(
    payload: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AIOutput:
    return _generate_and_save(
        payload=payload,
        output_type=AIOutputType.parent_message,
        generator=ai_service.generate_parent_message,
        db=db,
        teacher=current_teacher,
    )


@router.post(
    "/topic-analyses",
    response_model=AIOutputResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(ai_generation_rate_limiter)],
)
def generate_topic_analysis(
    payload: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AIOutput:
    return _generate_and_save(
        payload=payload,
        output_type=AIOutputType.development_suggestion,
        generator=ai_service.generate_topic_analysis,
        db=db,
        teacher=current_teacher,
    )


@router.post(
    "/weekly-summaries",
    response_model=AIWeeklySummaryResponse,
    dependencies=[Depends(ai_generation_rate_limiter)],
)
def generate_weekly_summary(
    payload: AIWeeklySummaryRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> dict[str, Any]:
    input_payload = _build_weekly_payload(payload, db, current_teacher)
    try:
        return ai_service.generate_weekly_summary(input_payload)
    except ai_service.AIServiceUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post(
    "/lesson-plans",
    response_model=AILessonPlanResponse,
    dependencies=[Depends(ai_generation_rate_limiter)],
)
def generate_lesson_plan(
    payload: AILessonPlanRequest,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> dict[str, Any]:
    input_payload = _build_lesson_plan_payload(payload, db, current_teacher)
    try:
        return ai_service.generate_lesson_plan(input_payload)
    except ai_service.AIServiceUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
