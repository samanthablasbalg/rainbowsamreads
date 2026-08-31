"""consolidate progress log ranges

Revision ID: 6a1d8e4c9f20
Revises: f7c19d3a6b42
Create Date: 2026-08-31 02:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "6a1d8e4c9f20"
down_revision: str | Sequence[str] | None = "f7c19d3a6b42"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _create_sync_function_and_trigger() -> None:
    op.execute(
        """
        CREATE FUNCTION sync_progress_log_range_columns()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            legacy_start integer;
            legacy_end integer;
            canonical_changed boolean;
            legacy_changed boolean;
        BEGIN
            IF NEW.unit = 'pages' THEN
                IF NEW.minute_start IS NOT NULL OR NEW.minute_end IS NOT NULL THEN
                    RAISE EXCEPTION 'Page logs cannot have minute range values.';
                END IF;
                legacy_start := NEW.page_start;
                legacy_end := NEW.page_end;
            ELSIF NEW.unit = 'minutes' THEN
                IF NEW.page_start IS NOT NULL OR NEW.page_end IS NOT NULL THEN
                    RAISE EXCEPTION 'Minute logs cannot have page range values.';
                END IF;
                legacy_start := NEW.minute_start;
                legacy_end := NEW.minute_end;
            ELSE
                RAISE EXCEPTION 'Unsupported progress log unit.';
            END IF;

            IF (NEW.start IS NULL) <> (NEW."end" IS NULL) THEN
                RAISE EXCEPTION 'Canonical progress log range is incomplete.';
            END IF;
            IF (legacy_start IS NULL) <> (legacy_end IS NULL) THEN
                RAISE EXCEPTION 'Legacy progress log range is incomplete.';
            END IF;

            IF TG_OP = 'INSERT' THEN
                IF NEW.start IS NULL AND legacy_start IS NULL THEN
                    RAISE EXCEPTION 'Progress log range is missing.';
                END IF;
                IF NEW.start IS NOT NULL AND legacy_start IS NOT NULL
                    AND (NEW.start, NEW."end") IS DISTINCT FROM
                        (legacy_start, legacy_end) THEN
                    RAISE EXCEPTION 'Inconsistent progress log range values.';
                END IF;
                NEW.start := COALESCE(NEW.start, legacy_start);
                NEW."end" := COALESCE(NEW."end", legacy_end);
            ELSE
                canonical_changed := (NEW.start, NEW."end") IS DISTINCT FROM
                    (OLD.start, OLD."end");
                legacy_changed :=
                    (NEW.unit, NEW.page_start, NEW.page_end,
                        NEW.minute_start, NEW.minute_end) IS DISTINCT FROM
                    (OLD.unit, OLD.page_start, OLD.page_end,
                        OLD.minute_start, OLD.minute_end);
                IF canonical_changed AND legacy_changed THEN
                    IF (NEW.start, NEW."end") IS DISTINCT FROM
                        (legacy_start, legacy_end) THEN
                        RAISE EXCEPTION 'Inconsistent progress log range values.';
                    END IF;
                ELSIF legacy_changed THEN
                    IF legacy_start IS NULL THEN
                        RAISE EXCEPTION 'Legacy progress log range is missing.';
                    END IF;
                    NEW.start := legacy_start;
                    NEW."end" := legacy_end;
                END IF;
            END IF;

            IF NEW.start < 0 OR NEW."end" <= 0 OR NEW."end" < NEW.start THEN
                RAISE EXCEPTION 'Invalid progress log range.';
            END IF;
            IF NEW.unit = 'pages' THEN
                NEW.page_start := NEW.start;
                NEW.page_end := NEW."end";
            ELSE
                NEW.minute_start := NEW.start;
                NEW.minute_end := NEW."end";
            END IF;
            RETURN NEW;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER sync_progress_log_range_columns
        BEFORE INSERT OR UPDATE OF unit, start, "end", page_start, page_end,
            minute_start, minute_end
        ON progress_logs
        FOR EACH ROW
        EXECUTE FUNCTION sync_progress_log_range_columns()
        """
    )


def upgrade() -> None:
    op.add_column("progress_logs", sa.Column("start", sa.Integer(), nullable=True))
    op.add_column("progress_logs", sa.Column("end", sa.Integer(), nullable=True))

    connection = op.get_bind()
    invalid_rows = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM progress_logs
            WHERE CASE unit
                WHEN 'pages' THEN
                    page_start IS NULL OR page_end IS NULL
                    OR minute_start IS NOT NULL OR minute_end IS NOT NULL
                    OR page_start < 0 OR page_end <= 0 OR page_end < page_start
                WHEN 'minutes' THEN
                    minute_start IS NULL OR minute_end IS NULL
                    OR page_start IS NOT NULL OR page_end IS NOT NULL
                    OR minute_start < 0 OR minute_end <= 0
                    OR minute_end < minute_start
                ELSE true
            END
            """
        )
    ).scalar_one()
    if invalid_rows:
        raise RuntimeError(
            f"Cannot consolidate {invalid_rows} invalid progress log range(s)."
        )

    op.execute(
        """
        UPDATE progress_logs
        SET start = CASE unit WHEN 'pages' THEN page_start ELSE minute_start END,
            "end" = CASE unit WHEN 'pages' THEN page_end ELSE minute_end END
        """
    )
    op.alter_column("progress_logs", "start", nullable=False)
    op.alter_column("progress_logs", "end", nullable=False)
    op.create_check_constraint(
        "ck_progress_logs_valid_range",
        "progress_logs",
        'start >= 0 AND "end" > 0 AND "end" >= start',
    )
    _create_sync_function_and_trigger()


def downgrade() -> None:
    op.execute(
        """
        DROP TRIGGER sync_progress_log_range_columns ON progress_logs;
        DROP FUNCTION sync_progress_log_range_columns();
        """
    )
    op.drop_constraint(
        "ck_progress_logs_valid_range", "progress_logs", type_="check"
    )
    op.drop_column("progress_logs", "end")
    op.drop_column("progress_logs", "start")
