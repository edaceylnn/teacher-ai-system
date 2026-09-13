"""add grade category

Revision ID: 14fd766a4e78
Revises: fe056a628d6f
Create Date: 2026-08-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14fd766a4e78'
down_revision: Union[str, Sequence[str], None] = 'fe056a628d6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    grade_category = sa.Enum(
        "sinav", "ders_ici_performans", "performans_odevi", "odev",
        name="grade_category",
    )
    grade_category.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "grades",
        sa.Column("category", grade_category, nullable=False, server_default="sinav"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("grades", "category")
    sa.Enum(name="grade_category").drop(op.get_bind(), checkfirst=True)
