"""remove legacy edition format

Revision ID: c91e2a84f630
Revises: a8f3c2d91e47
Create Date: 2026-08-30 23:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c91e2a84f630"
down_revision: str | Sequence[str] | None = "a8f3c2d91e47"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DROP TRIGGER sync_edition_format_columns ON editions;
        DROP FUNCTION sync_edition_format_columns();
        """
    )
    op.drop_index("ix_editions_book_format_generic", table_name="editions")
    op.drop_column("editions", "edition_format")
    op.execute(
        """
        ALTER INDEX ix_editions_book_format_canonical_generic
        RENAME TO ix_editions_book_format_generic
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER INDEX ix_editions_book_format_generic
        RENAME TO ix_editions_book_format_canonical_generic
        """
    )
    op.add_column(
        "editions",
        sa.Column(
            "edition_format",
            postgresql.ENUM(
                "print",
                "digital",
                "audio",
                name="edition_format",
                create_type=False,
            ),
            nullable=True,
        ),
    )
    op.execute("UPDATE editions SET edition_format = format")
    op.alter_column("editions", "edition_format", nullable=False)
    op.create_index(
        "ix_editions_book_format_generic",
        "editions",
        ["book_id", "edition_format"],
        unique=True,
        postgresql_where=sa.text("isbn IS NULL"),
    )
    op.execute(
        """
        CREATE FUNCTION sync_edition_format_columns()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                IF NEW.format IS NOT NULL
                    AND NEW.edition_format IS NOT NULL
                    AND NEW.format IS DISTINCT FROM NEW.edition_format THEN
                        RAISE EXCEPTION 'Inconsistent edition format values.';
                END IF;
                NEW.format := COALESCE(NEW.format, NEW.edition_format);
                NEW.edition_format := COALESCE(NEW.edition_format, NEW.format);
            ELSIF NEW.format IS DISTINCT FROM OLD.format
                AND NEW.edition_format IS DISTINCT FROM OLD.edition_format THEN
                    IF NEW.format IS DISTINCT FROM NEW.edition_format THEN
                        RAISE EXCEPTION 'Inconsistent edition format values.';
                    END IF;
            ELSIF NEW.format IS DISTINCT FROM OLD.format THEN
                NEW.edition_format := NEW.format;
            ELSIF NEW.edition_format IS DISTINCT FROM OLD.edition_format THEN
                NEW.format := NEW.edition_format;
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER sync_edition_format_columns
        BEFORE INSERT OR UPDATE OF format, edition_format ON editions
        FOR EACH ROW
        EXECUTE FUNCTION sync_edition_format_columns()
        """
    )
