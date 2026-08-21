from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TeacherAssignmentCreate(BaseModel):
    teacher_id: int
    classroom_id: int
    # None => "rehber" (homeroom) assignment: full roster + general view, no
    # grade-editing rights. A value => "branş" (subject) assignment: view +
    # edit rights scoped to that classroom+lesson.
    lesson_id: int | None = None
    # None => the current academic year is used.
    academic_year_id: int | None = None
    term_id: int | None = None


class TeacherAssignmentUpdate(BaseModel):
    is_active: bool


class TeacherAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    classroom_id: int
    lesson_id: int | None
    academic_year_id: int
    term_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
