from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.api.deps import (
    ensure_assessment_write_access,
    ensure_subject_write_access,
    get_current_teacher,
    visible_academic_scope,
)
from app.db.session import get_db
from app.models import Assessment, AssessmentRecord, AssessmentType, Student, Teacher
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentRecordBulkUpdate,
    AssessmentRecordResponse,
    AssessmentRecordUpdate,
    AssessmentResponse,
    AssessmentUpdate,
)
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/assessments", tags=["assessments"])


def _visible_assessments_condition(teacher: Teacher, db: Session):
    homeroom_ids, subject_pairs = visible_academic_scope(teacher, db)
    conditions = []
    if homeroom_ids:
        conditions.append(Assessment.classroom_id.in_(homeroom_ids))
    if subject_pairs:
        conditions.append(tuple_(Assessment.classroom_id, Assessment.lesson_id).in_(subject_pairs))
    return or_(*conditions) if conditions else false()


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Assessment:
    ensure_subject_write_access(current_teacher, payload.classroom_id, payload.lesson_id, db)
    assessment = Assessment(**payload.model_dump(), teacher_id=current_teacher.id)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("", response_model=PageResponse[AssessmentResponse])
def list_assessments(
    classroom_id: int | None = None,
    lesson_id: int | None = None,
    assessment_type: AssessmentType | None = None,
    student_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[AssessmentResponse]:
    statement = (
        select(Assessment)
        .where(_visible_assessments_condition(current_teacher, db))
        .order_by(Assessment.date.desc(), Assessment.id.desc())
    )
    if classroom_id is not None:
        statement = statement.where(Assessment.classroom_id == classroom_id)
    if lesson_id is not None:
        statement = statement.where(Assessment.lesson_id == lesson_id)
    if assessment_type is not None:
        statement = statement.where(Assessment.assessment_type == assessment_type)
    if student_id is not None:
        statement = statement.where(
            Assessment.id.in_(select(AssessmentRecord.assessment_id).where(AssessmentRecord.student_id == student_id))
        )

    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Assessment:
    return ensure_assessment_write_access(db.get(Assessment, assessment_id), current_teacher, db)


@router.patch("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: int,
    payload: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Assessment:
    assessment = ensure_assessment_write_access(db.get(Assessment, assessment_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    next_classroom_id = update_data.get("classroom_id", assessment.classroom_id)
    next_lesson_id = update_data.get("lesson_id", assessment.lesson_id)
    if "classroom_id" in update_data or "lesson_id" in update_data:
        ensure_subject_write_access(current_teacher, next_classroom_id, next_lesson_id, db)

    for field, value in update_data.items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    assessment = ensure_assessment_write_access(db.get(Assessment, assessment_id), current_teacher, db)
    db.delete(assessment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{assessment_id}/records", response_model=list[AssessmentRecordResponse])
def list_assessment_records(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[AssessmentRecord]:
    assessment = ensure_assessment_write_access(db.get(Assessment, assessment_id), current_teacher, db)
    statement = select(AssessmentRecord).where(AssessmentRecord.assessment_id == assessment.id)
    return list(db.scalars(statement).all())


def _upsert_record(assessment_id: int, student_id: int, payload: AssessmentRecordUpdate, db: Session) -> AssessmentRecord:
    record = db.scalar(
        select(AssessmentRecord).where(
            AssessmentRecord.assessment_id == assessment_id,
            AssessmentRecord.student_id == student_id,
        )
    )
    if record is None:
        record = AssessmentRecord(
            assessment_id=assessment_id,
            student_id=student_id,
            score=payload.score,
            is_completed=payload.is_completed,
        )
        db.add(record)
    else:
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)
    return record


@router.put("/{assessment_id}/records/{student_id}", response_model=AssessmentRecordResponse)
def upsert_assessment_record(
    assessment_id: int,
    student_id: int,
    payload: AssessmentRecordUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> AssessmentRecord:
    assessment = ensure_assessment_write_access(db.get(Assessment, assessment_id), current_teacher, db)
    student = db.get(Student, student_id)
    if student is None or student.classroom_id != assessment.classroom_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this classroom")

    record = _upsert_record(assessment.id, student_id, payload, db)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{assessment_id}/records", response_model=list[AssessmentRecordResponse])
def bulk_upsert_assessment_records(
    assessment_id: int,
    payload: AssessmentRecordBulkUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[AssessmentRecord]:
    assessment = ensure_assessment_write_access(db.get(Assessment, assessment_id), current_teacher, db)

    roster_ids = set(db.scalars(select(Student.id).where(Student.classroom_id == assessment.classroom_id)).all())
    records: list[AssessmentRecord] = []
    for entry in payload.records:
        if entry.student_id not in roster_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found in this classroom")
        records.append(
            _upsert_record(
                assessment.id,
                entry.student_id,
                AssessmentRecordUpdate(score=entry.score, is_completed=entry.is_completed),
                db,
            )
        )
    db.commit()
    for record in records:
        db.refresh(record)
    return records
