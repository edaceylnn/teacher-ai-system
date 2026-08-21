from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_academic_year, get_current_teacher, require_admin
from app.db.session import get_db
from app.models import Teacher, TeacherAssignment, TeacherRole
from app.schemas.pagination import PageResponse
from app.schemas.teacher_assignment import TeacherAssignmentCreate, TeacherAssignmentResponse, TeacherAssignmentUpdate

router = APIRouter(prefix="/teacher-assignments", tags=["teacher-assignments"])


@router.post("", response_model=TeacherAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_teacher_assignment(
    payload: TeacherAssignmentCreate,
    db: Session = Depends(get_db),
    _admin: Teacher = Depends(require_admin),
) -> TeacherAssignment:
    academic_year_id = payload.academic_year_id
    if academic_year_id is None:
        year = current_academic_year(db)
        if year is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Aktif akademik yıl tanımlı değil."
            )
        academic_year_id = year.id

    # Madde 14: aynı atamanın yanlışlıkla iki kez oluşturulmasını engelle —
    # DB constraint yerine (nullable lesson_id/term_id NULL'ları farklı
    # sayar) burada kontrol ediyoruz.
    duplicate = db.scalar(
        select(TeacherAssignment).where(
            TeacherAssignment.teacher_id == payload.teacher_id,
            TeacherAssignment.classroom_id == payload.classroom_id,
            TeacherAssignment.lesson_id == payload.lesson_id,
            TeacherAssignment.academic_year_id == academic_year_id,
            TeacherAssignment.term_id == payload.term_id,
            TeacherAssignment.is_active.is_(True),
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu atama zaten mevcut.")

    assignment = TeacherAssignment(
        teacher_id=payload.teacher_id,
        classroom_id=payload.classroom_id,
        lesson_id=payload.lesson_id,
        academic_year_id=academic_year_id,
        term_id=payload.term_id,
        is_active=True,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("", response_model=PageResponse[TeacherAssignmentResponse])
def list_teacher_assignments(
    teacher_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[TeacherAssignmentResponse]:
    target_teacher_id = teacher_id if teacher_id is not None else current_teacher.id
    if target_teacher_id != current_teacher.id and current_teacher.role != TeacherRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Başka bir öğretmenin atamalarını görüntüleyemezsiniz."
        )

    statement = (
        select(TeacherAssignment)
        .where(TeacherAssignment.teacher_id == target_teacher_id)
        .order_by(TeacherAssignment.id)
    )
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.patch("/{assignment_id}", response_model=TeacherAssignmentResponse)
def update_teacher_assignment(
    assignment_id: int,
    payload: TeacherAssignmentUpdate,
    db: Session = Depends(get_db),
    _admin: Teacher = Depends(require_admin),
) -> TeacherAssignment:
    # Never hard-deleted (madde 17: geçmiş akademik yıl kayıtları korunmalı)
    # — toggling is_active is the only mutation allowed here.
    assignment = db.get(TeacherAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    assignment.is_active = payload.is_active
    db.commit()
    db.refresh(assignment)
    return assignment
