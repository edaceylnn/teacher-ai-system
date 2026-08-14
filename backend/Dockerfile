FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY . .
RUN python -m pip install --no-cache-dir -e .
RUN chmod +x docker-entrypoint.sh

RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" || exit 1

# WEB_CONCURRENCY controls the uvicorn worker count. Keep it at 1 unless the
# rate limiter (app/core/rate_limit.py) is backed by a shared store — it's
# per-process, so N workers means the effective rate limit is N times higher.
# app.core.security.ensure_single_worker_in_production() enforces this too.
ENV WEB_CONCURRENCY=1
# Runs `alembic upgrade head` before starting uvicorn, so the schema is
# always current on container start — no separate manual migration step.
ENTRYPOINT ["./docker-entrypoint.sh"]
