from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models import AIOutputType


class AIGenerateRequest(BaseModel):
    student_id: int


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
