from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models import AIOutputType


class AIGenerateRequest(BaseModel):
    student_id: int
    force_regenerate: bool = False


class AIWeeklySummaryRequest(BaseModel):
    teacher_id: int
    classroom_id: int | None = None


class AILessonPlanRequest(BaseModel):
    teacher_id: int
    classroom_id: int
    lesson_id: int
    topic: str | None = None


class AIWeeklySummaryResponse(BaseModel):
    title: str
    summary: str
    attention_points: list[str]
    positive_signals: list[str]
    suggested_actions: list[str]


class AILessonPlanResponse(BaseModel):
    title: str
    objective: str
    warmup: str
    activities: list[str]
    assessment: str
    homework: str


class AIOutputUpdate(BaseModel):
    output_payload: dict[str, Any]


class AIOutputResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    output_type: AIOutputType
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime
