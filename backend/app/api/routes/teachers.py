from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.rate_limit import InMemoryRateLimiter
from app.core.security import hash_password
from app.db.session import get_db
from app.models import Teacher
from app.schemas.teacher import TeacherCreate, TeacherResponse, TeacherUpdate

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
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.get("", response_model=list[TeacherResponse])
def list_teachers(current_teacher: Teacher = Depends(get_current_teacher)) -> list[Teacher]:
    return [current_teacher]


@router.get("/{teacher_id}", response_model=TeacherResponse)
def get_teacher(
    teacher_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
) -> Teacher:
    if teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    return current_teacher


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
