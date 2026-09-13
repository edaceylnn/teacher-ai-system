from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import ensure_assessment_write_access, ensure_subject_write_access, get_current_teacher, visible_academic_scope
from app.db.session import get_db
from app.models import Assessment, AssessmentRecord, AssessmentType, Student, Teacher
from app.schemas.homework import HomeworkCreate, HomeworkResponse, HomeworkUpdate
from app.schemas.homework_submission import HomeworkSubmissionResponse, HomeworkSubmissionUpdate
from app.schemas.pagination import PageResponse

# Legacy compatibility router — a "homework" is now an
# Assessment(assessment_type="odev"); per-student completion is an
# AssessmentRecord.is_completed. This keeps the /homeworks URL and JSON
# shape stable for the not-yet-migrated frontend while reading/writing the
# new Assessment/AssessmentRecord tables directly.

router = APIRouter(prefix="/homeworks", tags=["homeworks"])


def _derive_status(assessment: Assessment, records: list[AssessmentRecord]) -> str:
    if not records:
        return "assigned"
    if all(record.is_completed for record in records):
        return "completed"
    if assessment.date < date.today():
        return "missing"
    return "assigned"


def _to_response(assessment: Assessment, db: Session) -> HomeworkResponse:
    records = list(db.scalars(select(AssessmentRecord).where(AssessmentRecord.assessment_id == assessment.id)).all())
    return HomeworkResponse(
        id=assessment.id,
        teacher_id=assessment.teacher_id,
        classroom_id=assessment.classroom_id,
        lesson_id=assessment.lesson_id,
        title=assessment.title,
        description=assessment.description,
        due_date=assessment.date,
        status=_derive_status(assessment, records),
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
    )


def _visible_homework_condition(teacher: Teacher, db: Session):
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(Assessment.classroom_id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(Assessment.classroom_id, Assessment.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


def _get_homework_assessment(homework_id: int, teacher: Teacher, db: Session) -> Assessment:
    assessment = db.get(Assessment, homework_id)
    if assessment is None or assessment.assessment_type != AssessmentType.odev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    ensure_assessment_write_access(assessment, teacher, db)
    return assessment


@router.post("", response_model=HomeworkResponse, status_code=status.HTTP_201_CREATED)
def create_homework(
    payload: HomeworkCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> HomeworkResponse:
    ensure_subject_write_access(current_teacher, payload.classroom_id, payload.lesson_id, db)
    assessment = Assessment(
        classroom_id=payload.classroom_id,
        lesson_id=payload.lesson_id,
        teacher_id=current_teacher.id,
        assessment_type=AssessmentType.odev,
        title=payload.title,
        description=payload.description,
        date=payload.due_date,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _to_response(assessment, db)


@router.get("", response_model=PageResponse[HomeworkResponse])
def list_homeworks(
    teacher_id: int | None = None,
    classroom_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[HomeworkResponse]:
    statement = (
        select(Assessment)
        .where(Assessment.assessment_type == AssessmentType.odev)
        .where(_visible_homework_condition(current_teacher, db))
        .order_by(Assessment.date, Assessment.id)
    )
    if classroom_id is not None:
        statement = statement.where(Assessment.classroom_id == classroom_id)

    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=[_to_response(item, db) for item in items], total=total, limit=limit, offset=offset)


@router.patch("/{homework_id}", response_model=HomeworkResponse)
def update_homework(
    homework_id: int,
    payload: HomeworkUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> HomeworkResponse:
    assessment = _get_homework_assessment(homework_id, current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    next_classroom_id = update_data.get("classroom_id", assessment.classroom_id)
    next_lesson_id = update_data.get("lesson_id", assessment.lesson_id)
    if "classroom_id" in update_data or "lesson_id" in update_data:
        ensure_subject_write_access(current_teacher, next_classroom_id, next_lesson_id, db)

    if "classroom_id" in update_data:
        assessment.classroom_id = update_data["classroom_id"]
    if "lesson_id" in update_data:
        assessment.lesson_id = update_data["lesson_id"]
    if "title" in update_data:
        assessment.title = update_data["title"]
    if "description" in update_data:
        assessment.description = update_data["description"]
    if "due_date" in update_data:
        assessment.date = update_data["due_date"]
    # "status" is intentionally not persisted — see schemas/homework.py.

    db.commit()
    db.refresh(assessment)
    return _to_response(assessment, db)


@router.delete("/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_homework(
    homework_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    assessment = _get_homework_assessment(homework_id, current_teacher, db)
    db.delete(assessment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{homework_id}/submissions", response_model=list[HomeworkSubmissionResponse])
def list_homework_submissions(
    homework_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[HomeworkSubmissionResponse]:
    assessment = _get_homework_assessment(homework_id, current_teacher, db)
    records = list(db.scalars(select(AssessmentRecord).where(AssessmentRecord.assessment_id == assessment.id)).all())
    return [
        HomeworkSubmissionResponse(
            id=record.id,
            homework_id=assessment.id,
            student_id=record.student_id,
            is_completed=bool(record.is_completed),
            updated_at=record.updated_at,
        )
        for record in records
    ]


@router.put("/{homework_id}/submissions/{student_id}", response_model=HomeworkSubmissionResponse)
def upsert_homework_submission(
    homework_id: int,
    student_id: int,
    payload: HomeworkSubmissionUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> HomeworkSubmissionResponse:
    assessment = _get_homework_assessment(homework_id, current_teacher, db)
    student = db.get(Student, student_id)
    if student is None or student.classroom_id != assessment.classroom_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this classroom")

    record = db.scalar(
        select(AssessmentRecord).where(
            AssessmentRecord.assessment_id == assessment.id,
            AssessmentRecord.student_id == student_id,
        )
    )
    if record is None:
        record = AssessmentRecord(assessment_id=assessment.id, student_id=student_id, is_completed=payload.is_completed)
        db.add(record)
    else:
        record.is_completed = payload.is_completed
    db.commit()
    db.refresh(record)
    return HomeworkSubmissionResponse(
        id=record.id,
        homework_id=assessment.id,
        student_id=record.student_id,
        is_completed=bool(record.is_completed),
        updated_at=record.updated_at,
    )
