from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import (
    assigned_classroom_ids,
    current_academic_year,
    ensure_classroom_access,
    ensure_classroom_homeroom_access,
    get_current_teacher,
)
from app.db.session import get_db
from app.models import Classroom, Teacher, TeacherAssignment
from app.schemas.classroom import ClassroomCreate, ClassroomResponse, ClassroomUpdate
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


@router.post("", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED)
def create_classroom(
    payload: ClassroomCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Classroom:
    if payload.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    year = current_academic_year(db)
    if year is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Aktif akademik yıl tanımlı değil.")

    classroom = Classroom(
        teacher_id=current_teacher.id,
        name=payload.name,
        grade_level=payload.grade_level,
    )
    db.add(classroom)
    db.flush()
    # Creating a classroom makes you its rehber (homeroom) teacher — a
    # TeacherAssignment with no lesson, the same as everyone else's access.
    db.add(
        TeacherAssignment(
            teacher_id=current_teacher.id,
            classroom_id=classroom.id,
            lesson_id=None,
            academic_year_id=year.id,
            is_active=True,
        )
    )
    db.commit()
    db.refresh(classroom)
    return classroom


@router.get("", response_model=PageResponse[ClassroomResponse])
def list_classrooms(
    teacher_id: int | None = None,
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[ClassroomResponse]:
    accessible_ids = assigned_classroom_ids(current_teacher, db)
    statement = select(Classroom).where(Classroom.id.in_(accessible_ids)).order_by(Classroom.id)

    total = (
        db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
        or 0
    )
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{classroom_id}", response_model=ClassroomResponse)
def get_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Classroom:
    return ensure_classroom_access(db.get(Classroom, classroom_id), current_teacher, db)


@router.patch("/{classroom_id}", response_model=ClassroomResponse)
def update_classroom(
    classroom_id: int,
    payload: ClassroomUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Classroom:
    classroom = ensure_classroom_homeroom_access(db.get(Classroom, classroom_id), current_teacher, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(classroom, field, value)

    db.commit()
    db.refresh(classroom)
    return classroom


@router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    classroom = ensure_classroom_homeroom_access(db.get(Classroom, classroom_id), current_teacher, db)
    db.delete(classroom)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
