from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import ensure_assessment_write_access, ensure_subject_write_access, get_current_teacher, visible_academic_scope
from app.db.session import get_db
from app.models import Assessment, AssessmentRecord, Student, Teacher
from app.schemas.grade import GradeCreate, GradeResponse, GradeUpdate
from app.schemas.pagination import PageResponse

# Legacy compatibility router — "notes" are now AssessmentRecord rows (each
# tied to a parent Assessment for classroom/lesson/type/title/date), not a
# standalone Grade table. This router keeps the /grades URL and JSON shape
# stable for the not-yet-migrated frontend while reading/writing the new
# Assessment/AssessmentRecord tables directly, so there is only one real
# source of truth in the database. Every POST here creates its own
# one-record Assessment (this legacy API only ever handled a single
# student+score at a time); true multi-student grouping happens through the
# new /assessments endpoints (bulk entry, added for the next phase).

router = APIRouter(prefix="/grades", tags=["grades"])


def _to_response(record: AssessmentRecord) -> GradeResponse:
    return GradeResponse(
        id=record.id,
        student_id=record.student_id,
        lesson_id=record.assessment.lesson_id,
        exam_name=record.assessment.title,
        category=record.assessment.assessment_type,
        score=record.score,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _visible_grade_records_condition(teacher: Teacher, db: Session):
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(Assessment.classroom_id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(Assessment.classroom_id, Assessment.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


@router.post("", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(
    payload: GradeCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> GradeResponse:
    student = db.get(Student, payload.student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    ensure_subject_write_access(current_teacher, student.classroom_id, payload.lesson_id, db)

    assessment = Assessment(
        classroom_id=student.classroom_id,
        lesson_id=payload.lesson_id,
        teacher_id=current_teacher.id,
        assessment_type=payload.category,
        title=payload.exam_name,
        date=date.today(),
    )
    db.add(assessment)
    db.flush()
    record = AssessmentRecord(assessment_id=assessment.id, student_id=payload.student_id, score=payload.score)
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.get("", response_model=PageResponse[GradeResponse])
def list_grades(
    student_id: int | None = None,
    lesson_id: int | None = None,
    classroom_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[GradeResponse]:
    statement = (
        select(AssessmentRecord)
        .join(Assessment, Assessment.id == AssessmentRecord.assessment_id)
        .options(joinedload(AssessmentRecord.assessment))
        # score is never null for a legacy "grade" — this is what tells a
        # scored note apart from a homework-completion-only record sharing
        # the same underlying table.
        .where(AssessmentRecord.score.is_not(None))
        .where(_visible_grade_records_condition(current_teacher, db))
        .order_by(AssessmentRecord.id)
    )
    if student_id is not None:
        statement = statement.where(AssessmentRecord.student_id == student_id)
    if lesson_id is not None:
        statement = statement.where(Assessment.lesson_id == lesson_id)
    if classroom_id is not None:
        statement = statement.where(Assessment.classroom_id == classroom_id)

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=[_to_response(record) for record in items], total=total, limit=limit, offset=offset)


def _get_record_for_grade(grade_id: int, teacher: Teacher, db: Session) -> AssessmentRecord:
    record = db.get(AssessmentRecord, grade_id)
    if record is None or record.score is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    ensure_assessment_write_access(record.assessment, teacher, db)
    return record


@router.get("/{grade_id}", response_model=GradeResponse)
def get_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> GradeResponse:
    return _to_response(_get_record_for_grade(grade_id, current_teacher, db))


@router.patch("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> GradeResponse:
    record = _get_record_for_grade(grade_id, current_teacher, db)
    assessment = record.assessment

    update_data = payload.model_dump(exclude_unset=True)
    next_student_id = update_data.get("student_id", record.student_id)
    next_lesson_id = update_data.get("lesson_id", assessment.lesson_id)
    if "student_id" in update_data or "lesson_id" in update_data:
        next_student = db.get(Student, next_student_id)
        if next_student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        ensure_subject_write_access(current_teacher, next_student.classroom_id, next_lesson_id, db)
        assessment.classroom_id = next_student.classroom_id

    if "student_id" in update_data:
        record.student_id = update_data["student_id"]
    if "lesson_id" in update_data:
        assessment.lesson_id = update_data["lesson_id"]
    if "exam_name" in update_data:
        assessment.title = update_data["exam_name"]
    if "category" in update_data:
        assessment.assessment_type = update_data["category"]
    if "score" in update_data:
        record.score = update_data["score"]

    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    record = _get_record_for_grade(grade_id, current_teacher, db)
    assessment = record.assessment
    db.delete(record)
    db.flush()
    # This legacy endpoint always creates a one-record Assessment, so once
    # its only record is gone the Assessment is just dead weight.
    remaining = db.scalar(
        select(func.count()).select_from(AssessmentRecord).where(AssessmentRecord.assessment_id == assessment.id)
    )
    if not remaining:
        db.delete(assessment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
