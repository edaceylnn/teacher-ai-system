"""add student contact fields

Revision ID: 6b58f1c0f8d1
Revises: 00eb989878a7
Create Date: 2026-08-06 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6b58f1c0f8d1"
down_revision: Union[str, Sequence[str], None] = "00eb989878a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("students", sa.Column("parent_full_name", sa.String(length=120), nullable=True))
    op.add_column("students", sa.Column("parent_phone", sa.String(length=40), nullable=True))
    op.add_column("students", sa.Column("parent_email", sa.String(length=255), nullable=True))
    op.add_column("students", sa.Column("home_address", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "home_address")
    op.drop_column("students", "parent_email")
    op.drop_column("students", "parent_phone")
    op.drop_column("students", "parent_full_name")
