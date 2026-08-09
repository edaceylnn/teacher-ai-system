import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import audit, auth, ai, attendance, classrooms, grades, health, homework, lessons, schedule, students, teachers
from app.core.audit import AuditLogMiddleware
from app.core.config import settings
from app.core.security import ensure_secret_key_is_not_default

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def create_app() -> FastAPI:
    ensure_secret_key_is_not_default()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
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
    app.include_router(classrooms.router)
    app.include_router(students.router)
    app.include_router(lessons.router)
    app.include_router(grades.router)
    app.include_router(attendance.router)
    app.include_router(schedule.router)
    app.include_router(homework.router)
    app.include_router(ai.router)
    app.include_router(audit.router)

    return app


app = create_app()
