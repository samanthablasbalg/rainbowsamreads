"""add canonical edition format

Revision ID: a8f3c2d91e47
Revises: 5bd2dac61e85
Create Date: 2026-08-30 20:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a8f3c2d91e47"
down_revision: str | Sequence[str] | None = "5bd2dac61e85"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "editions",
        sa.Column(
            "format",
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
    op.execute("UPDATE editions SET format = edition_format")
    op.alter_column("editions", "format", nullable=False)
    op.create_index(
        "ix_editions_book_format_canonical_generic",
        "editions",
        ["book_id", "format"],
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


def downgrade() -> None:
    op.execute(
        """
        DROP TRIGGER sync_edition_format_columns ON editions;
        DROP FUNCTION sync_edition_format_columns();
        """
    )
    op.drop_index(
        "ix_editions_book_format_canonical_generic",
        table_name="editions",
    )
    op.drop_column("editions", "format")
