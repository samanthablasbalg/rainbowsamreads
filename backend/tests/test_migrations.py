from __future__ import annotations

import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, text
from sqlalchemy.exc import DBAPIError

from tests.conftest import ALEMBIC_INI, owner_engine

BEFORE_EDITION_FORMAT = "5bd2dac61e85"


def _insert_book(connection: Connection) -> uuid.UUID:
    book_id = uuid.uuid4()
    connection.execute(
        text(
            """
            INSERT INTO books (
                id,
                title,
                genres,
                publication_date_precision,
                created_at,
                updated_at
            )
            VALUES (:book_id, 'Piranesi', '{}', 'day', now(), now())
            """
        ),
        {"book_id": book_id},
    )
    return book_id


def test_edition_format_migration_backfills_existing_editions() -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, BEFORE_EDITION_FORMAT)
    try:
        with owner_engine.begin() as connection:
            book_id = _insert_book(connection)
            connection.execute(
                text(
                    """
                    INSERT INTO editions (
                        id,
                        book_id,
                        edition_format,
                        created_at,
                        updated_at
                    )
                    VALUES
                        (:print_id, :book_id, 'print', now(), now()),
                        (:audio_id, :book_id, 'audio', now(), now())
                    """
                ),
                {
                    "audio_id": uuid.uuid4(),
                    "book_id": book_id,
                    "print_id": uuid.uuid4(),
                },
            )

        command.upgrade(config, "head")

        with owner_engine.connect() as connection:
            formats = connection.execute(
                text(
                    """
                    SELECT edition_format::text, format::text
                    FROM editions
                    ORDER BY edition_format::text
                    """
                )
            ).all()

            assert [tuple(row) for row in formats] == [
                ("audio", "audio"),
                ("print", "print"),
            ]
    finally:
        command.upgrade(config, "head")


def test_edition_format_migration_syncs_legacy_inserts() -> None:
    edition_id = uuid.uuid4()

    with owner_engine.begin() as connection:
        book_id = _insert_book(connection)
        connection.execute(
            text(
                """
                INSERT INTO editions (
                    id,
                    book_id,
                    edition_format,
                    created_at,
                    updated_at
                )
                VALUES (:edition_id, :book_id, 'digital', now(), now())
                """
            ),
            {"book_id": book_id, "edition_id": edition_id},
        )

        canonical_format = connection.execute(
            text("SELECT format FROM editions WHERE id = :edition_id"),
            {"edition_id": edition_id},
        ).scalar_one()

        assert canonical_format == "digital"

        connection.execute(
            text("UPDATE editions SET edition_format = 'print' WHERE id = :edition_id"),
            {"edition_id": edition_id},
        )
        updated_canonical_format = connection.execute(
            text("SELECT format FROM editions WHERE id = :edition_id"),
            {"edition_id": edition_id},
        ).scalar_one()

        assert updated_canonical_format == "print"


def test_edition_format_migration_syncs_canonical_writes() -> None:
    edition_id = uuid.uuid4()

    with owner_engine.begin() as connection:
        book_id = _insert_book(connection)
        connection.execute(
            text(
                """
                INSERT INTO editions (
                    id,
                    book_id,
                    format,
                    created_at,
                    updated_at
                )
                VALUES (:edition_id, :book_id, 'audio', now(), now())
                """
            ),
            {"book_id": book_id, "edition_id": edition_id},
        )

        legacy_format = connection.execute(
            text("SELECT edition_format FROM editions WHERE id = :edition_id"),
            {"edition_id": edition_id},
        ).scalar_one()

        assert legacy_format == "audio"

        connection.execute(
            text("UPDATE editions SET format = 'digital' WHERE id = :edition_id"),
            {"edition_id": edition_id},
        )
        updated_legacy_format = connection.execute(
            text("SELECT edition_format FROM editions WHERE id = :edition_id"),
            {"edition_id": edition_id},
        ).scalar_one()

        assert updated_legacy_format == "digital"


def test_edition_format_migration_rejects_conflicting_writes() -> None:
    with owner_engine.begin() as connection:
        book_id = _insert_book(connection)

    with pytest.raises(DBAPIError, match="Inconsistent edition format values"):
        with owner_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO editions (
                        id,
                        book_id,
                        edition_format,
                        format,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :edition_id,
                        :book_id,
                        'print',
                        'audio',
                        now(),
                        now()
                    )
                    """
                ),
                {"book_id": book_id, "edition_id": uuid.uuid4()},
            )


def test_edition_format_migration_indexes_the_canonical_format() -> None:
    with owner_engine.connect() as connection:
        index_definition = connection.execute(
            text(
                """
                SELECT indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                    AND indexname = 'ix_editions_book_format_canonical_generic'
                """
            )
        ).scalar_one()

        assert "(book_id, format)" in index_definition
        assert "WHERE (isbn IS NULL)" in index_definition


def test_edition_format_migration_downgrade_preserves_canonical_writes() -> None:
    config = Config(str(ALEMBIC_INI))
    edition_id = uuid.uuid4()

    with owner_engine.begin() as connection:
        book_id = _insert_book(connection)
        connection.execute(
            text(
                """
                INSERT INTO editions (
                    id,
                    book_id,
                    format,
                    created_at,
                    updated_at
                )
                VALUES (:edition_id, :book_id, 'audio', now(), now())
                """
            ),
            {"book_id": book_id, "edition_id": edition_id},
        )

    command.downgrade(config, BEFORE_EDITION_FORMAT)
    try:
        with owner_engine.connect() as connection:
            legacy_format = connection.execute(
                text("SELECT edition_format FROM editions WHERE id = :edition_id"),
                {"edition_id": edition_id},
            ).scalar_one()
            canonical_column_count = connection.execute(
                text(
                    """
                    SELECT count(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                        AND table_name = 'editions'
                        AND column_name = 'format'
                    """
                )
            ).scalar_one()

            assert legacy_format == "audio"
            assert canonical_column_count == 0
    finally:
        command.upgrade(config, "head")
