from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models import Teacher
from app.schemas.auth import CurrentTeacherResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    teacher = db.scalar(select(Teacher).where(Teacher.email == str(payload.email)))
    if teacher is None or not verify_password(payload.password, teacher.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(str(teacher.id)),
        teacher_id=teacher.id,
        full_name=teacher.full_name,
        email=teacher.email,
    )


@router.get("/me", response_model=CurrentTeacherResponse)
def get_me(current_teacher: Teacher = Depends(get_current_teacher)) -> Teacher:
    return current_teacher
