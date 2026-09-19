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
.venv/bin/python -m pytest
```

## Database Migration

```bash
alembic upgrade head
```

## Seed Demo Data

```bash
python -m app.db.seed
```

Demo login:

```text
eda@example.com / demo12345
```

## AI Configuration

AI endpoints support two providers, selected with `AI_PROVIDER`:

```bash
# OpenAI Responses API (paid, used when there's a budget for it)
AI_PROVIDER="openai"
OPENAI_API_KEY="your-api-key"
OPENAI_MODEL="gpt-5"

# Google Gemini (free tier — what the public portfolio demo runs on)
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-api-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
```

Since there's no public signup and demo visitors share one seeded login, `/ai/*` generation endpoints are also capped by `AI_DAILY_LIMIT_PER_IP` (default 3/day, protects against one visitor) and `AI_DAILY_LIMIT_GLOBAL` (default 150/day, protects the shared free-tier quota from the whole demo audience combined) — see `app/api/routes/ai.py`.

## Health Check

```bash
curl http://127.0.0.1:8000/health
```

## Current Endpoints

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
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
- `POST /assessments`
- `GET /assessments`
- `GET /assessments/{assessment_id}`
- `PATCH /assessments/{assessment_id}`
- `DELETE /assessments/{assessment_id}`
- `GET /assessments/{assessment_id}/records`
- `PUT /assessments/{assessment_id}/records`
- `PUT /assessments/{assessment_id}/records/{student_id}`
- `POST /grades` (legacy compatibility)
- `GET /grades` (legacy compatibility)
- `GET /grades/{grade_id}` (legacy compatibility)
- `PATCH /grades/{grade_id}` (legacy compatibility)
- `DELETE /grades/{grade_id}` (legacy compatibility)
- `POST /attendance-sessions`
- `GET /attendance-sessions`
- `GET /attendance-sessions/{session_id}/records`
- `PUT /attendance-sessions/{session_id}/records`
- `POST /attendance-records` (legacy compatibility)
- `GET /attendance-records` (legacy compatibility)
- `GET /attendance-records/{attendance_id}` (legacy compatibility)
- `PATCH /attendance-records/{attendance_id}` (legacy compatibility)
- `DELETE /attendance-records/{attendance_id}` (legacy compatibility)
- `POST /schedule-entries`
- `GET /schedule-entries`
- `PATCH /schedule-entries/{entry_id}`
- `DELETE /schedule-entries/{entry_id}`
- `POST /homeworks`
- `GET /homeworks`
- `PATCH /homeworks/{homework_id}`
- `DELETE /homeworks/{homework_id}`
- `GET /homeworks/{homework_id}/submissions`
- `PUT /homeworks/{homework_id}/submissions/{student_id}`
- `GET /ai/outputs`
- `PATCH /ai/outputs/{output_id}`
- `POST /ai/report-comments`
- `POST /ai/parent-messages`
- `POST /ai/topic-analyses`
- `POST /ai/weekly-summaries`
- `POST /ai/lesson-plans`

## Current Models

- Teacher
- Classroom
- Student
- Lesson
- Assessment
- AssessmentRecord
- AttendanceSession
- AttendanceRecord
- ScheduleEntry
- AIOutput

`/grades`, `/homeworks` and `/attendance-records` are kept for compatibility with existing UI/API flows. New bulk-entry screens use `/assessments` and `/attendance-sessions`; homework records are stored as `Assessment(assessment_type="odev")`.
