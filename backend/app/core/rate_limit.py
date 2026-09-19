import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Fixed-window limiter keyed by client IP. Per-process only — fine for a
    single-instance deployment, but does not coordinate across workers/replicas."""

    def __init__(self, max_requests: int, window_seconds: int, detail_message: str | None = None) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.detail_message = detail_message or "Çok fazla deneme yaptınız. Lütfen biraz sonra tekrar deneyin."
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            hits = self._hits[client_ip]
            while hits and now - hits[0] > self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_requests:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=self.detail_message)
            hits.append(now)

    def release(self, request: Request) -> None:
        """Undo the most recent hit recorded for this client. Call this when
        the work a hit was gating turned out not to actually happen (a cache
        hit) or failed (an upstream error) — so a client isn't charged quota
        for something that cost nothing."""
        client_ip = request.client.host if request.client else "unknown"
        with self._lock:
            hits = self._hits[client_ip]
            if hits:
                hits.pop()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class GlobalWindowRateLimiter:
    """Fixed-window limiter shared across every client (not keyed by IP).
    Use it to cap total traffic to a costly or quota-limited downstream
    dependency (e.g. a free-tier AI provider's shared daily quota) regardless
    of who is asking — a per-IP limiter alone can't protect a quota that all
    callers draw from together."""

    def __init__(self, max_requests: int, window_seconds: int, detail_message: str | None = None) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.detail_message = detail_message or "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin."
        self._hits: deque[float] = deque()
        self._lock = threading.Lock()

    def __call__(self, request: Request) -> None:
        now = time.monotonic()
        with self._lock:
            while self._hits and now - self._hits[0] > self.window_seconds:
                self._hits.popleft()
            if len(self._hits) >= self.max_requests:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=self.detail_message)
            self._hits.append(now)

    def release(self, request: Request) -> None:
        """See InMemoryRateLimiter.release — same intent, no per-IP keying."""
        with self._lock:
            if self._hits:
                self._hits.pop()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
