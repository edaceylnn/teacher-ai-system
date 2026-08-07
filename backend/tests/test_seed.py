from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.seed import seed_demo_data
from app.models import Attendance, Classroom, Grade, Homework, Lesson, ScheduleEntry, Student, Teacher


def test_seed_demo_data_creates_complete_idempotent_demo_dataset() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        seed_demo_data(session)
        seed_demo_data(session)

        assert session.scalar(select(func.count()).select_from(Teacher)) == 1
        assert session.scalar(select(func.count()).select_from(Classroom)) == 1
        assert session.scalar(select(func.count()).select_from(Student)) == 3
        assert session.scalar(select(func.count()).select_from(Lesson)) == 2
        assert session.scalar(select(func.count()).select_from(Grade)) == 6
        assert session.scalar(select(func.count()).select_from(Attendance)) == 6
        assert session.scalar(select(func.count()).select_from(ScheduleEntry)) == 3
        assert session.scalar(select(func.count()).select_from(Homework)) == 2
