from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import false, func, or_, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher, visible_lesson_ids
from app.db.session import get_db
from app.models import Assessment, CurriculumOutcome, Teacher, TeacherRole
from app.schemas.curriculum import (
    CurriculumOutcomeBulkCreate,
    CurriculumOutcomeCreate,
    CurriculumOutcomeResponse,
    CurriculumOutcomeUpdate,
)
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/curriculum-outcomes", tags=["curriculum-outcomes"])


def _normalize_url(value):
    return str(value) if value is not None else None


def _visible_outcome_condition(teacher: Teacher, db: Session):
    if teacher.role == TeacherRole.admin:
        return True
    lesson_ids = visible_lesson_ids(teacher, db)
    return CurriculumOutcome.lesson_id.in_(lesson_ids) if lesson_ids else false()


def _ensure_outcome_visible(outcome: CurriculumOutcome | None, teacher: Teacher, db: Session) -> CurriculumOutcome:
    if outcome is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kazanım bulunamadı.")
    if teacher.role == TeacherRole.admin or outcome.lesson_id in visible_lesson_ids(teacher, db):
        return outcome
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kazanım bulunamadı.")


def _ensure_outcome_manageable(outcome: CurriculumOutcome | None, teacher: Teacher, db: Session) -> CurriculumOutcome:
    outcome = _ensure_outcome_visible(outcome, teacher, db)
    if teacher.role == TeacherRole.admin or outcome.created_by_teacher_id == teacher.id:
        return outcome
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu kazanımı düzenleme yetkiniz yok.")


def _ensure_lesson_can_use(lesson_id: int, teacher: Teacher, db: Session) -> None:
    if teacher.role == TeacherRole.admin:
        return
    if lesson_id not in visible_lesson_ids(teacher, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu ders için kazanım ekleme yetkiniz yok.")


def _create_outcome(payload: CurriculumOutcomeCreate, teacher: Teacher, db: Session) -> CurriculumOutcome:
    _ensure_lesson_can_use(payload.lesson_id, teacher, db)
    data = payload.model_dump()
    data["source_url"] = _normalize_url(payload.source_url)
    outcome = CurriculumOutcome(**data, created_by_teacher_id=teacher.id)
    db.add(outcome)
    return outcome


@router.post("", response_model=CurriculumOutcomeResponse, status_code=status.HTTP_201_CREATED)
def create_curriculum_outcome(
    payload: CurriculumOutcomeCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> CurriculumOutcome:
    outcome = _create_outcome(payload, current_teacher, db)
    db.commit()
    db.refresh(outcome)
    return outcome


@router.post("/bulk", response_model=list[CurriculumOutcomeResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_curriculum_outcomes(
    payload: CurriculumOutcomeBulkCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[CurriculumOutcome]:
    outcomes = [_create_outcome(entry, current_teacher, db) for entry in payload.outcomes]
    db.commit()
    for outcome in outcomes:
        db.refresh(outcome)
    return outcomes


@router.get("", response_model=PageResponse[CurriculumOutcomeResponse])
def list_curriculum_outcomes(
    lesson_id: int | None = None,
    grade_level: str | None = None,
    search: str | None = None,
    active_only: bool = True,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[CurriculumOutcomeResponse]:
    statement = select(CurriculumOutcome).where(_visible_outcome_condition(current_teacher, db))
    if lesson_id is not None:
        statement = statement.where(CurriculumOutcome.lesson_id == lesson_id)
    if grade_level:
        statement = statement.where(CurriculumOutcome.grade_level == grade_level)
    if active_only:
        statement = statement.where(CurriculumOutcome.is_active.is_(True))
    if search:
        like = f"%{search}%"
        statement = statement.where(
            or_(
                CurriculumOutcome.code.ilike(like),
                CurriculumOutcome.unit_title.ilike(like),
                CurriculumOutcome.outcome_text.ilike(like),
            )
        )
    statement = statement.order_by(
        CurriculumOutcome.grade_level,
        CurriculumOutcome.lesson_id,
        CurriculumOutcome.unit_title,
        CurriculumOutcome.code,
        CurriculumOutcome.id,
    )
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{outcome_id}", response_model=CurriculumOutcomeResponse)
def get_curriculum_outcome(
    outcome_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> CurriculumOutcome:
    return _ensure_outcome_visible(db.get(CurriculumOutcome, outcome_id), current_teacher, db)


@router.patch("/{outcome_id}", response_model=CurriculumOutcomeResponse)
def update_curriculum_outcome(
    outcome_id: int,
    payload: CurriculumOutcomeUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> CurriculumOutcome:
    outcome = _ensure_outcome_manageable(db.get(CurriculumOutcome, outcome_id), current_teacher, db)
    update_data = payload.model_dump(exclude_unset=True)
    if "lesson_id" in update_data:
        _ensure_lesson_can_use(update_data["lesson_id"], current_teacher, db)
    if "source_url" in update_data:
        update_data["source_url"] = _normalize_url(payload.source_url)
    for field, value in update_data.items():
        setattr(outcome, field, value)
    db.commit()
    db.refresh(outcome)
    return outcome


@router.delete("/{outcome_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_curriculum_outcome(
    outcome_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    outcome = _ensure_outcome_manageable(db.get(CurriculumOutcome, outcome_id), current_teacher, db)
    db.execute(
        update(Assessment)
        .where(Assessment.curriculum_outcome_id == outcome.id)
        .values(curriculum_outcome_id=None)
    )
    db.delete(outcome)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
