from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HomeworkSubmissionUpdate(BaseModel):
    is_completed: bool


class HomeworkSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    homework_id: int
    student_id: int
    is_completed: bool
    updated_at: datetime
