from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.db.session import get_db
from app.models import AuditLog, Teacher
from app.schemas.audit import AuditLogResponse
from app.schemas.pagination import PageResponse

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=PageResponse[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
) -> PageResponse[AuditLogResponse]:
    statement = (
        select(AuditLog)
        .where(AuditLog.teacher_id == current_teacher.id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    )
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = list(db.scalars(statement.limit(limit).offset(offset)).all())
    return PageResponse(items=items, total=total, limit=limit, offset=offset)
