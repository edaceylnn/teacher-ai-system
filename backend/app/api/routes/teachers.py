import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher, require_admin
from app.core.config import settings
from app.core.email import send_password_reset_email
from app.core.rate_limit import InMemoryRateLimiter
from app.core.security import create_password_reset_token, hash_password
from app.db.session import get_db
from app.models import (
    AIOutput,
    Assessment,
    AttendanceSession,
    AuditLog,
    Classroom,
    Lesson,
    ScheduleEntry,
    Teacher,
    TeacherAssignment,
    TeacherRole,
)
from app.schemas.teacher import (
    TeacherAdminResponse,
    TeacherAssignmentSummary,
    TeacherCreate,
    TeacherCreateResponse,
    TeacherResponse,
    TeacherRoleUpdate,
    TeacherUpdate,
)

router = APIRouter(prefix="/teachers", tags=["teachers"])
registration_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)


def _ensure_email_is_available(email: str, db: Session, teacher_id: int | None = None) -> None:
    existing_teacher = db.scalar(select(Teacher).where(Teacher.email == email))
    if existing_teacher is not None and existing_teacher.id != teacher_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu e-posta ile kayıtlı bir öğretmen zaten var.")


@router.post(
    "",
    response_model=TeacherCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(registration_rate_limiter)],
)
def create_teacher(
    payload: TeacherCreate,
    db: Session = Depends(get_db),
    _admin: Teacher = Depends(require_admin),
) -> TeacherCreateResponse:
    _ensure_email_is_available(str(payload.email), db)
    password_hash = hash_password(payload.password or secrets.token_urlsafe(32))

    teacher = Teacher(
        full_name=payload.full_name,
        email=str(payload.email),
        password_hash=password_hash,
        title=payload.title,
        branch=payload.branch,
        role=payload.role,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    invite_link = None
    if payload.password is None:
        token = create_password_reset_token(teacher.id, teacher.password_hash)
        invite_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        send_password_reset_email(teacher.email, invite_link)

    return TeacherCreateResponse(
        **TeacherResponse.model_validate(teacher).model_dump(),
        invitation_url=invite_link,
    )


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
    password = update_data.pop("password", None)
    if password is not None:
        update_data["password_hash"] = hash_password(password)

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
    if teacher_id == current_teacher.id:
        db.delete(current_teacher)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if current_teacher.role != TeacherRole.admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    teacher = db.get(Teacher, teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    owned_classroom = db.scalar(select(Classroom.id).where(Classroom.teacher_id == teacher_id).limit(1))
    if owned_classroom is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu öğretmenin rehber olduğu sınıflar var. Silmeden önce sınıfları başka bir öğretmene devretmelisiniz.",
        )

    for model in (Assessment, AttendanceSession, ScheduleEntry, TeacherAssignment):
        for row in db.scalars(select(model).where(model.teacher_id == teacher_id)).all():
            db.delete(row)

    for lesson in db.scalars(select(Lesson).where(Lesson.teacher_id == teacher_id)).all():
        lesson.teacher_id = None
    for ai_output in db.scalars(select(AIOutput).where(AIOutput.teacher_id == teacher_id)).all():
        ai_output.teacher_id = None
    for audit_log in db.scalars(select(AuditLog).where(AuditLog.teacher_id == teacher_id)).all():
        audit_log.teacher_id = None

    db.delete(teacher)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
