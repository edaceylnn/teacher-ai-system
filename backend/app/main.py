from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, attendance, classrooms, grades, health, homework, lessons, schedule, students, teachers
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(teachers.router)
    app.include_router(classrooms.router)
    app.include_router(students.router)
    app.include_router(lessons.router)
    app.include_router(grades.router)
    app.include_router(attendance.router)
    app.include_router(schedule.router)
    app.include_router(homework.router)
    app.include_router(ai.router)

    return app


app = create_app()
