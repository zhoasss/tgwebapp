"""Add booking_slug and avatar_url to users

Revision ID: 002_add_booking_fields
Revises: 001_initial
Create Date: 2025-11-28 13:24:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_booking_fields'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add avatar_url column
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    
    # Add booking_slug column with unique constraint
    op.add_column('users', sa.Column('booking_slug', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_users_booking_slug'), 'users', ['booking_slug'], unique=True)


def downgrade() -> None:
    # Remove booking_slug
    op.drop_index(op.f('ix_users_booking_slug'), table_name='users')
    op.drop_column('users', 'booking_slug')
    
    # Remove avatar_url
    op.drop_column('users', 'avatar_url')
