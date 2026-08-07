.PHONY: backend-test frontend-check test seed

backend-test:
	cd backend && .venv/bin/python -m pytest

frontend-check:
	cd frontend && npm run check

test: backend-test frontend-check

seed:
	cd backend && .venv/bin/python -m app.db.seed
