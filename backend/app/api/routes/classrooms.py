from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Classroom, Teacher
from app.schemas.classroom import ClassroomCreate, ClassroomResponse, ClassroomUpdate

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


@router.post("", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED)
def create_classroom(payload: ClassroomCreate, db: Session = Depends(get_db)) -> Classroom:
    teacher = db.get(Teacher, payload.teacher_id)
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    classroom = Classroom(
        teacher_id=payload.teacher_id,
        name=payload.name,
        grade_level=payload.grade_level,
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


@router.get("", response_model=list[ClassroomResponse])
def list_classrooms(teacher_id: int | None = None, db: Session = Depends(get_db)) -> list[Classroom]:
    statement = select(Classroom).order_by(Classroom.id)
    if teacher_id is not None:
        statement = statement.where(Classroom.teacher_id == teacher_id)

    return list(db.scalars(statement).all())


@router.get("/{classroom_id}", response_model=ClassroomResponse)
def get_classroom(classroom_id: int, db: Session = Depends(get_db)) -> Classroom:
    classroom = db.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    return classroom


@router.patch("/{classroom_id}", response_model=ClassroomResponse)
def update_classroom(
    classroom_id: int,
    payload: ClassroomUpdate,
    db: Session = Depends(get_db),
) -> Classroom:
    classroom = db.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(classroom, field, value)

    db.commit()
    db.refresh(classroom)
    return classroom


@router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classroom(classroom_id: int, db: Session = Depends(get_db)) -> Response:
    classroom = db.get(Classroom, classroom_id)
    if classroom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")

    db.delete(classroom)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
