# Teacher AI System API

FastAPI backend for Teacher AI System.

Frontend dev server runs on `http://127.0.0.1:5173`, so this API allows that origin in development.

## Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload
```

## Test

```bash
pytest
```

## Database Migration

```bash
alembic upgrade head
```

## Seed Demo Data

```bash
python -m app.db.seed
```

## Health Check

```bash
curl http://127.0.0.1:8000/health
```

## Current Endpoints

- `GET /health`
- `POST /teachers`
- `GET /teachers`
- `GET /teachers/{teacher_id}`
- `PATCH /teachers/{teacher_id}`
- `DELETE /teachers/{teacher_id}`
- `POST /classrooms`
- `GET /classrooms`
- `GET /classrooms/{classroom_id}`
- `PATCH /classrooms/{classroom_id}`
- `DELETE /classrooms/{classroom_id}`
- `POST /students`
- `GET /students`
- `GET /students/{student_id}`
- `GET /students/{student_id}/profile`
- `PATCH /students/{student_id}`
- `DELETE /students/{student_id}`
- `POST /lessons`
- `GET /lessons`
- `GET /lessons/{lesson_id}`
- `PATCH /lessons/{lesson_id}`
- `DELETE /lessons/{lesson_id}`
- `POST /grades`
- `GET /grades`
- `GET /grades/{grade_id}`
- `PATCH /grades/{grade_id}`
- `DELETE /grades/{grade_id}`
- `POST /attendance-records`
- `GET /attendance-records`
- `GET /attendance-records/{attendance_id}`
- `PATCH /attendance-records/{attendance_id}`
- `DELETE /attendance-records/{attendance_id}`

## Current Models

- Teacher
- Classroom
- Student
- Lesson
- Grade
- Attendance
- AIOutput
