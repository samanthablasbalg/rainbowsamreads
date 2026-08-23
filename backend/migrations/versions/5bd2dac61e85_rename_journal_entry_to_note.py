"""rename journal_entry to note

Revision ID: 5bd2dac61e85
Revises: d4e17c2a9b58
Create Date: 2026-08-21 19:52:57.618661

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5bd2dac61e85"
down_revision: Union[str, Sequence[str], None] = "d4e17c2a9b58"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("progress_logs", "journal_entry", new_column_name="note")


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("progress_logs", "note", new_column_name="journal_entry")
