import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    assessments,
    attendance_sessions,
    audit,
    auth,
    ai,
    attendance,
    classrooms,
    curriculum,
    grades,
    health,
    homework,
    lessons,
    schedule,
    schedule_settings,
    students,
    teacher_assignments,
    teachers,
)
from app.core.audit import AuditLogMiddleware
from app.core.config import settings
from app.core.security import (
    ensure_cors_origins_do_not_use_wildcard,
    ensure_email_is_configured_in_production,
    ensure_secret_key_is_not_default,
    ensure_single_worker_in_production,
    warn_if_forwarded_allow_ips_are_default,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app() -> FastAPI:
    ensure_secret_key_is_not_default()
    ensure_single_worker_in_production()
    ensure_email_is_configured_in_production()
    ensure_cors_origins_do_not_use_wildcard()
    warn_if_forwarded_allow_ips_are_default()

    is_production = settings.environment == "production"
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        # The interactive API docs expose the full schema (routes, models,
        # try-it-out) to anyone who can reach the server — keep them off in
        # production rather than relying on network-level access control.
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AuditLogMiddleware)

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(teachers.router)
    app.include_router(teacher_assignments.router)
    app.include_router(curriculum.router)
    app.include_router(classrooms.router)
    app.include_router(students.router)
    app.include_router(lessons.router)
    app.include_router(grades.router)
    app.include_router(attendance.router)
    app.include_router(schedule.router)
    app.include_router(schedule_settings.router)
    app.include_router(homework.router)
    app.include_router(assessments.router)
    app.include_router(attendance_sessions.router)
    app.include_router(ai.router)
    app.include_router(audit.router)

    return app


app = create_app()
