"""remove legacy edition lengths

Revision ID: f7c19d3a6b42
Revises: e4b2f10c7d59
Create Date: 2026-08-31 01:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7c19d3a6b42"
down_revision: str | Sequence[str] | None = "e4b2f10c7d59"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DROP TRIGGER sync_edition_length_columns ON editions;
        DROP FUNCTION sync_edition_length_columns();
        """
    )
    op.drop_column("editions", "page_count")
    op.drop_column("editions", "audio_minutes")


def downgrade() -> None:
    op.add_column(
        "editions", sa.Column("page_count", sa.Integer(), nullable=True)
    )
    op.add_column(
        "editions", sa.Column("audio_minutes", sa.Integer(), nullable=True)
    )
    op.execute(
        """
        UPDATE editions
        SET page_count = CASE WHEN format <> 'audio' THEN length END,
            audio_minutes = CASE WHEN format = 'audio' THEN length END
        """
    )
    op.execute(
        """
        CREATE FUNCTION sync_edition_length_columns()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            legacy_length integer;
            old_legacy_length integer;
            new_legacy_length integer;
            length_changed boolean;
            legacy_changed boolean;
        BEGIN
            IF NEW.format = 'audio' AND NEW.page_count IS NOT NULL THEN
                RAISE EXCEPTION 'Audio editions cannot have a page count.';
            END IF;
            IF NEW.format <> 'audio' AND NEW.audio_minutes IS NOT NULL THEN
                RAISE EXCEPTION 'Page-measured editions cannot have audio minutes.';
            END IF;

            IF TG_OP = 'INSERT' THEN
                legacy_length := CASE
                    WHEN NEW.format = 'audio' THEN NEW.audio_minutes
                    ELSE NEW.page_count
                END;
                IF NEW.length IS NOT NULL
                    AND legacy_length IS NOT NULL
                    AND NEW.length <> legacy_length THEN
                        RAISE EXCEPTION 'Inconsistent edition length values.';
                END IF;
                NEW.length := COALESCE(NEW.length, legacy_length);
                IF NEW.format = 'audio' THEN
                    NEW.audio_minutes := NEW.length;
                ELSE
                    NEW.page_count := NEW.length;
                END IF;
            ELSE
                old_legacy_length := CASE
                    WHEN OLD.format = 'audio' THEN OLD.audio_minutes
                    ELSE OLD.page_count
                END;
                new_legacy_length := CASE
                    WHEN NEW.format = 'audio' THEN NEW.audio_minutes
                    ELSE NEW.page_count
                END;
                length_changed := NEW.length IS DISTINCT FROM OLD.length;
                legacy_changed :=
                    new_legacy_length IS DISTINCT FROM old_legacy_length;

                IF length_changed AND legacy_changed THEN
                    IF NEW.length IS DISTINCT FROM new_legacy_length THEN
                        RAISE EXCEPTION 'Inconsistent edition length values.';
                    END IF;
                ELSIF length_changed THEN
                    IF NEW.format = 'audio' THEN
                        NEW.audio_minutes := NEW.length;
                    ELSE
                        NEW.page_count := NEW.length;
                    END IF;
                ELSIF legacy_changed THEN
                    NEW.length := new_legacy_length;
                END IF;
            END IF;

            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER sync_edition_length_columns
        BEFORE INSERT OR UPDATE OF format, length, page_count, audio_minutes
        ON editions
        FOR EACH ROW
        EXECUTE FUNCTION sync_edition_length_columns()
        """
    )
