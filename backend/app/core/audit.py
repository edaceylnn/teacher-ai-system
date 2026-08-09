from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import AuditLog

AUDITED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
# Auth/session endpoints aren't "who touched which student record" events —
# excluding them keeps the log focused on data mutations.
EXCLUDED_PATH_PREFIXES = ("/auth",)


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.method in AUDITED_METHODS and not request.url.path.startswith(EXCLUDED_PATH_PREFIXES):
            await run_in_threadpool(_record, request, response)

        return response


def _record(request: Request, response: Response) -> None:
    # Route through app.dependency_overrides so tests that swap get_db for an
    # isolated test session (see tests/*.py) don't leak audit rows into the
    # real database — middleware sits outside FastAPI's own DI for routes.
    db_dependency = request.app.dependency_overrides.get(get_db, get_db)
    db_gen = db_dependency()
    db = next(db_gen)
    try:
        db.add(
            AuditLog(
                teacher_id=_extract_teacher_id(request),
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                client_ip=request.client.host if request.client else None,
            )
        )
        db.commit()
    finally:
        next(db_gen, None)


def _extract_teacher_id(request: Request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    payload = decode_access_token(auth_header[7:])
    if payload is None:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        return None
