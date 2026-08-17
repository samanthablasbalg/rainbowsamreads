"""add publisher and description to editions

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
    op.add_column("editions", sa.Column("publisher", sa.String(), nullable=True))
    op.add_column("editions", sa.Column("description", sa.String(), nullable=True))

    # Every existing value came from `volumeInfo.language`, which is the *edition's*
    # language, not the work's. It answers the wrong question -- a translated book reads
    # as English -- so the column is emptied in lockstep with the importer that stopped
    # writing it. Nothing is recoverable here, which is the point: the data was wrong.
    op.execute("UPDATE books SET original_language = NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # The cleared languages are not restored -- they were the wrong fact to begin with.
    op.drop_column("editions", "description")
    op.drop_column("editions", "publisher")
