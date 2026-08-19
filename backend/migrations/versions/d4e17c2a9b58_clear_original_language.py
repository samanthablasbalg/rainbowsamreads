"""clear original_language

Revision ID: d4e17c2a9b58
Revises: bc6951bda673
Create Date: 2026-08-19 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d4e17c2a9b58"
down_revision: Union[str, Sequence[str], None] = "bc6951bda673"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Every existing value came from `volumeInfo.language`, which is the *edition's*
    # language, not the work's. It answers the wrong question -- a translated book reads
    # as English -- so the column is emptied in lockstep with the importer that stopped
    # writing it. Nothing is recoverable here, which is the point: the data was wrong.
    #
    # Its own revision because it is the one irreversible step in the pair: the schema
    # change either side of it can be rolled back, and this cannot.
    op.execute("UPDATE books SET original_language = NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # The cleared languages are not restored -- they were the wrong fact to begin with.
    pass
