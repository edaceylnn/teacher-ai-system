from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher, require_admin
from app.core.rate_limit import InMemoryRateLimiter
from app.core.security import hash_password
from app.db.session import get_db
from app.models import Classroom, Lesson, Teacher, TeacherAssignment, TeacherRole
from app.schemas.teacher import (
    TeacherAdminResponse,
    TeacherAssignmentSummary,
    TeacherCreate,
    TeacherResponse,
    TeacherRoleUpdate,
    TeacherUpdate,
)

router = APIRouter(prefix="/teachers", tags=["teachers"])
registration_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)


def _ensure_email_is_available(email: str, db: Session, teacher_id: int | None = None) -> None:
    existing_teacher = db.scalar(select(Teacher).where(Teacher.email == email))
    if existing_teacher is not None and existing_teacher.id != teacher_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher email already exists")


@router.post(
    "",
    response_model=TeacherResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(registration_rate_limiter)],
)
def create_teacher(payload: TeacherCreate, db: Session = Depends(get_db)) -> Teacher:
    _ensure_email_is_available(str(payload.email), db)
    password_hash = payload.password_hash or (hash_password(payload.password) if payload.password else None)
    if password_hash is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password is required")

    teacher = Teacher(
        full_name=payload.full_name,
        email=str(payload.email),
        password_hash=password_hash,
        title=payload.title,
        branch=payload.branch,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.get("", response_model=list[TeacherResponse] | list[TeacherAdminResponse])
def list_teachers(
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> list[Teacher] | list[TeacherAdminResponse]:
    if current_teacher.role != TeacherRole.admin:
        return [current_teacher]

    teachers = list(db.scalars(select(Teacher).order_by(Teacher.id)).all())
    assignments = list(
        db.execute(
            select(TeacherAssignment, Classroom.name, Lesson.name)
            .join(Classroom, Classroom.id == TeacherAssignment.classroom_id)
            .outerjoin(Lesson, Lesson.id == TeacherAssignment.lesson_id)
            .where(TeacherAssignment.is_active.is_(True))
        ).all()
    )
    assignments_by_teacher: dict[int, list[TeacherAssignmentSummary]] = {}
    for assignment, classroom_name, lesson_name in assignments:
        assignments_by_teacher.setdefault(assignment.teacher_id, []).append(
            TeacherAssignmentSummary(
                id=assignment.id,
                classroom_id=assignment.classroom_id,
                classroom_name=classroom_name,
                lesson_id=assignment.lesson_id,
                lesson_name=lesson_name,
                is_active=assignment.is_active,
            )
        )

    return [
        TeacherAdminResponse(
            **TeacherResponse.model_validate(teacher).model_dump(),
            assignments=assignments_by_teacher.get(teacher.id, []),
        )
        for teacher in teachers
    ]


@router.get("/{teacher_id}", response_model=TeacherResponse)
def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Teacher:
    if teacher_id == current_teacher.id:
        return current_teacher
    if current_teacher.role == TeacherRole.admin:
        teacher = db.get(Teacher, teacher_id)
        if teacher is not None:
            return teacher
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")


@router.patch("/{teacher_id}/role", response_model=TeacherResponse)
def update_teacher_role(
    teacher_id: int,
    payload: TeacherRoleUpdate,
    db: Session = Depends(get_db),
    _admin: Teacher = Depends(require_admin),
) -> Teacher:
    teacher = db.get(Teacher, teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    teacher.role = payload.role
    db.commit()
    db.refresh(teacher)
    return teacher


@router.patch("/{teacher_id}", response_model=TeacherResponse)
def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Teacher:
    if teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    teacher = current_teacher

    update_data = payload.model_dump(exclude_unset=True)
    email = update_data.get("email")
    if email is not None:
        update_data["email"] = str(email)
        _ensure_email_is_available(update_data["email"], db, teacher_id=teacher.id)
    if update_data.get("password_hash") is not None:
        update_data["password_hash"] = hash_password(update_data["password_hash"])

    for field, value in update_data.items():
        setattr(teacher, field, value)

    db.commit()
    db.refresh(teacher)
    return teacher


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Response:
    if teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    db.delete(current_teacher)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
