from collections.abc import Generator

import pytest
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models import Teacher


@pytest.fixture(autouse=True)
def strong_test_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "secret_key", "test-secret-key-with-at-least-32-chars")


def override_current_teacher(db: Session = Depends(get_db)) -> Teacher:
    teacher = db.scalar(select(Teacher).order_by(Teacher.id))
    if teacher is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return teacher


@pytest.fixture(autouse=True)
def authenticated_routes() -> Generator[None, None, None]:
    app.dependency_overrides[get_current_teacher] = override_current_teacher
    yield
    app.dependency_overrides.pop(get_current_teacher, None)
