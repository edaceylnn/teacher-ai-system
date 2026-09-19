.PHONY: backend-test frontend-check test seed reset-demo

backend-test:
	cd backend && .venv/bin/python -m pytest

frontend-check:
	cd frontend && npm run check

test: backend-test frontend-check

seed:
	cd backend && .venv/bin/python -m app.db.seed

# Wipes and reseeds the demo dataset — for a public demo deployment, run this
# on a schedule (cron) so visitor edits/deletes/vandalism self-heal instead
# of leaving the demo broken. See README.md's Production Checklist.
reset-demo:
	cd backend && .venv/bin/python -m app.db.seed --reset
