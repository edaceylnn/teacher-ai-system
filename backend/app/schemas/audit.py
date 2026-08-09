from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    method: str
    path: str
    status_code: int
    client_ip: str | None
    created_at: datetime
