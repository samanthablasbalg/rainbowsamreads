"""add publisher to editions and description to books

Revision ID: bc6951bda673
Revises: 3a55cabfc585
Create Date: 2026-08-17 00:54:27.198245

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "bc6951bda673"
down_revision: Union[str, Sequence[str], None] = "3a55cabfc585"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Publisher is an edition-level fact -- this hardcover is the one Tor printed --
    # so it sits beside the ISBN. The description is about the work, so it joins the
    # other book-level defaults; an edition that needs its own can grow one later.
    op.add_column("editions", sa.Column("publisher", sa.String(), nullable=True))
    op.add_column("books", sa.Column("description", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("books", "description")
    op.drop_column("editions", "publisher")
