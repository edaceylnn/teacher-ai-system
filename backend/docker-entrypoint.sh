#!/bin/sh
set -eu

alembic upgrade head

# --forwarded-allow-ips: trust X-Forwarded-For/-Proto only from this address,
# rewriting request.client.host to the real visitor IP — every per-IP rate
# limiter and the audit log's client_ip depend on this being right once a
# reverse proxy sits in front (see warn_if_forwarded_allow_ips_are_default in
# app/core/security.py and the Production Checklist in README.md).
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WEB_CONCURRENCY:-1}" \
    --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-127.0.0.1}"
