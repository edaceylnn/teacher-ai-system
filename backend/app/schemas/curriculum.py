from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class CurriculumOutcomeBase(BaseModel):
    lesson_id: int
    grade_level: str = Field(min_length=1, max_length=20)
    unit_title: str | None = Field(default=None, max_length=180)
    code: str | None = Field(default=None, max_length=60)
    outcome_text: str = Field(min_length=1)
    source_name: str | None = Field(default=None, max_length=160)
    source_url: HttpUrl | None = None
    version_label: str | None = Field(default=None, max_length=80)
    is_active: bool = True


class CurriculumOutcomeCreate(CurriculumOutcomeBase):
    pass


class CurriculumOutcomeUpdate(BaseModel):
    lesson_id: int | None = None
    grade_level: str | None = Field(default=None, min_length=1, max_length=20)
    unit_title: str | None = Field(default=None, max_length=180)
    code: str | None = Field(default=None, max_length=60)
    outcome_text: str | None = Field(default=None, min_length=1)
    source_name: str | None = Field(default=None, max_length=160)
    source_url: HttpUrl | None = None
    version_label: str | None = Field(default=None, max_length=80)
    is_active: bool | None = None


class CurriculumOutcomeBulkCreate(BaseModel):
    outcomes: list[CurriculumOutcomeCreate] = Field(min_length=1, max_length=500)


class CurriculumOutcomeResponse(CurriculumOutcomeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_teacher_id: int | None
    created_at: datetime
    updated_at: datetime
