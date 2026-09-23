"""Remove the unused interested status and its date fields.

Revision ID: f8df33f0c1e7
Revises: 9e68c17db8ec
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f8df33f0c1e7"
down_revision: str | Sequence[str] | None = "9e68c17db8ec"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Do not discard a legacy value if one was ever written outside the API.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM engagements
                WHERE status = 'interested'::reading_status
                   OR interested_on IS NOT NULL
                   OR interested_on_precision::text <> 'day'
            ) THEN
                RAISE EXCEPTION
                    'Cannot remove interested: existing engagement data uses it';
            END IF;
        END $$
        """
    )

    op.drop_column("engagements", "interested_on")
    op.drop_column("engagements", "interested_on_precision")
    op.execute("ALTER TYPE reading_status RENAME TO reading_status_with_interested")
    op.execute(
        "CREATE TYPE reading_status AS ENUM "
        "('tbr', 'reading', 'finished', 'paused', 'dnf')"
    )
    op.execute(
        """
        ALTER TABLE engagements
        ALTER COLUMN status TYPE reading_status
        USING status::text::reading_status
        """
    )
    op.execute("DROP TYPE reading_status_with_interested")


def downgrade() -> None:
    op.execute("ALTER TYPE reading_status RENAME TO reading_status_without_interested")
    op.execute(
        "CREATE TYPE reading_status AS ENUM "
        "('interested', 'tbr', 'reading', 'finished', 'paused', 'dnf')"
    )
    op.execute(
        """
        ALTER TABLE engagements
        ALTER COLUMN status TYPE reading_status
        USING status::text::reading_status
        """
    )
    op.execute("DROP TYPE reading_status_without_interested")

    op.add_column("engagements", sa.Column("interested_on", sa.Date(), nullable=True))
    op.add_column(
        "engagements",
        sa.Column(
            "interested_on_precision",
            postgresql.ENUM(
                "day", "month", "year", name="date_precision", create_type=False
            ),
            nullable=False,
            server_default=sa.text("'day'"),
        ),
    )
    op.alter_column("engagements", "interested_on_precision", server_default=None)
