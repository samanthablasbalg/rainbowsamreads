from __future__ import annotations

import datetime
import uuid
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, text
from sqlalchemy.exc import DBAPIError

from app.models.user import User
from tests.conftest import ALEMBIC_INI, owner_engine

BEFORE_EDITION_FORMAT = "5bd2dac61e85"
EDITION_FORMAT_EXPANDED = "a8f3c2d91e47"
BEFORE_EDITION_LENGTH = "c91e2a84f630"
EDITION_LENGTH_EXPANDED = "e4b2f10c7d59"
BEFORE_PROGRESS_RANGE = "f7c19d3a6b42"
PROGRESS_RANGE_EXPANDED = "6a1d8e4c9f20"


@pytest.fixture
def expanded_edition_format_schema(seed_user: object) -> Generator[None]:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, EDITION_FORMAT_EXPANDED)
    try:
        yield
    finally:
        command.upgrade(config, "head")


@pytest.fixture
def expanded_edition_length_schema(seed_user: object) -> Generator[None]:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, EDITION_LENGTH_EXPANDED)
    try:
        yield
    finally:
        command.upgrade(config, "head")


@pytest.fixture
def expanded_progress_range_schema(seed_user: object) -> Generator[None]:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, PROGRESS_RANGE_EXPANDED)
    try:
        yield
    finally:
        command.upgrade(config, "head")


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


def _insert_engagement(connection: Connection, user_id: uuid.UUID) -> uuid.UUID:
    engagement_id = uuid.uuid4()
    connection.execute(
        text(
            """
            INSERT INTO engagements (
                id,
                book_id,
                user_id,
                status,
                interested_on_precision,
                tbr_added_on_precision,
                acquired_on_precision,
                started_on_precision,
                finished_on_precision,
                abandoned_on_precision,
                created_at,
                updated_at
            )
            VALUES (
                :engagement_id,
                :book_id,
                :user_id,
                'reading',
                'day',
                'day',
                'day',
                'day',
                'day',
                'day',
                now(),
                now()
            )
            """
        ),
        {
            "book_id": _insert_book(connection),
            "engagement_id": engagement_id,
            "user_id": user_id,
        },
    )
    return engagement_id


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

        command.upgrade(config, EDITION_FORMAT_EXPANDED)

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


def test_edition_format_migration_syncs_legacy_inserts(
    expanded_edition_format_schema: None,
) -> None:
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


def test_edition_format_migration_syncs_canonical_writes(
    expanded_edition_format_schema: None,
) -> None:
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


def test_edition_format_migration_rejects_conflicting_writes(
    expanded_edition_format_schema: None,
) -> None:
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


def test_edition_format_contract_removes_legacy_schema() -> None:
    with owner_engine.connect() as connection:
        legacy_column_count = connection.execute(
            text(
                """
                SELECT count(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                    AND table_name = 'editions'
                    AND column_name = 'edition_format'
                """
            )
        ).scalar_one()
        sync_function_count = connection.execute(
            text(
                """
                SELECT count(*)
                FROM pg_proc
                WHERE proname = 'sync_edition_format_columns'
                """
            )
        ).scalar_one()
        index_definition = connection.execute(
            text(
                """
                SELECT indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                    AND indexname = 'ix_editions_book_format_generic'
                """
            )
        ).scalar_one()

        assert legacy_column_count == 0
        assert sync_function_count == 0
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


def test_edition_length_migration_backfills_existing_editions() -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, BEFORE_EDITION_LENGTH)
    try:
        with owner_engine.begin() as connection:
            book_id = _insert_book(connection)
            connection.execute(
                text(
                    """
                    INSERT INTO editions (
                        id,
                        book_id,
                        format,
                        page_count,
                        audio_minutes,
                        created_at,
                        updated_at
                    )
                    VALUES
                        (:print_id, :book_id, 'print', 272, NULL, now(), now()),
                        (:audio_id, :book_id, 'audio', NULL, 480, now(), now())
                    """
                ),
                {
                    "audio_id": uuid.uuid4(),
                    "book_id": book_id,
                    "print_id": uuid.uuid4(),
                },
            )

        command.upgrade(config, EDITION_LENGTH_EXPANDED)

        with owner_engine.connect() as connection:
            lengths = connection.execute(
                text("SELECT format::text, length FROM editions ORDER BY format::text")
            ).all()
            assert [tuple(row) for row in lengths] == [
                ("audio", 480),
                ("print", 272),
            ]
    finally:
        command.upgrade(config, "head")


def test_edition_length_migration_rejects_ambiguous_existing_data() -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, BEFORE_EDITION_LENGTH)
    edition_id = uuid.uuid4()
    try:
        with owner_engine.begin() as connection:
            book_id = _insert_book(connection)
            connection.execute(
                text(
                    """
                    INSERT INTO editions (
                        id,
                        book_id,
                        format,
                        page_count,
                        created_at,
                        updated_at
                    )
                    VALUES (:edition_id, :book_id, 'audio', 272, now(), now())
                    """
                ),
                {"book_id": book_id, "edition_id": edition_id},
            )

        with pytest.raises(RuntimeError, match="invalid edition lengths"):
            command.upgrade(config, EDITION_LENGTH_EXPANDED)
    finally:
        with owner_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM editions WHERE id = :edition_id"),
                {"edition_id": edition_id},
            )
        command.upgrade(config, "head")


def test_edition_length_migration_syncs_legacy_and_canonical_writes(
    expanded_edition_length_schema: None,
) -> None:
    with owner_engine.begin() as connection:
        book_id = _insert_book(connection)
        legacy_id = uuid.uuid4()
        canonical_id = uuid.uuid4()
        connection.execute(
            text(
                """
                INSERT INTO editions (
                    id,
                    book_id,
                    format,
                    page_count,
                    created_at,
                    updated_at
                )
                VALUES (:edition_id, :book_id, 'print', 272, now(), now())
                """
            ),
            {"book_id": book_id, "edition_id": legacy_id},
        )
        connection.execute(
            text(
                """
                INSERT INTO editions (
                    id,
                    book_id,
                    format,
                    length,
                    created_at,
                    updated_at
                )
                VALUES (:edition_id, :book_id, 'audio', 480, now(), now())
                """
            ),
            {"book_id": book_id, "edition_id": canonical_id},
        )

        legacy_row = connection.execute(
            text("SELECT page_count, length FROM editions WHERE id = :edition_id"),
            {"edition_id": legacy_id},
        ).one()
        canonical_row = connection.execute(
            text("SELECT audio_minutes, length FROM editions WHERE id = :edition_id"),
            {"edition_id": canonical_id},
        ).one()

        assert tuple(legacy_row) == (272, 272)
        assert tuple(canonical_row) == (480, 480)


def test_edition_length_contract_removes_legacy_schema() -> None:
    with owner_engine.connect() as connection:
        legacy_columns = connection.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                    AND table_name = 'editions'
                    AND column_name IN ('page_count', 'audio_minutes')
                """
            )
        ).scalars()
        sync_function_count = connection.execute(
            text(
                """
                SELECT count(*)
                FROM pg_proc
                WHERE proname = 'sync_edition_length_columns'
                """
            )
        ).scalar_one()
        constraint_count = connection.execute(
            text(
                """
                SELECT count(*)
                FROM pg_constraint
                WHERE conname = 'ck_editions_length_positive'
                """
            )
        ).scalar_one()

        assert list(legacy_columns) == []
        assert sync_function_count == 0
        assert constraint_count == 1


def test_edition_length_migration_downgrade_preserves_canonical_writes() -> None:
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
                    length,
                    created_at,
                    updated_at
                )
                VALUES (:edition_id, :book_id, 'print', 272, now(), now())
                """
            ),
            {"book_id": book_id, "edition_id": edition_id},
        )

    command.downgrade(config, BEFORE_EDITION_LENGTH)
    try:
        with owner_engine.connect() as connection:
            page_count = connection.execute(
                text("SELECT page_count FROM editions WHERE id = :edition_id"),
                {"edition_id": edition_id},
            ).scalar_one()
            assert page_count == 272
    finally:
        command.upgrade(config, "head")


def test_progress_range_migration_preserves_existing_history(
    seed_user: User,
) -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, BEFORE_PROGRESS_RANGE)
    page_id = uuid.uuid4()
    minute_id = uuid.uuid4()
    try:
        with owner_engine.begin() as connection:
            engagement_id = _insert_engagement(connection, seed_user.id)
            connection.execute(
                text(
                    """
                    INSERT INTO progress_logs (
                        id,
                        engagement_id,
                        user_id,
                        logged_on,
                        unit,
                        page_start,
                        page_end,
                        minute_start,
                        minute_end,
                        new_ground,
                        note,
                        created_at,
                        updated_at
                    )
                    VALUES
                        (
                            :page_id, :engagement_id, :user_id, '2026-08-01',
                            'pages', 10, 42, NULL, NULL, true, 'page note',
                            '2026-08-01 12:00:00+00',
                            '2026-08-02 12:00:00+00'
                        ),
                        (
                            :minute_id, :engagement_id, :user_id, '2026-08-03',
                            'minutes', NULL, NULL, 30, 75, false, 'audio note',
                            '2026-08-03 12:00:00+00',
                            '2026-08-04 12:00:00+00'
                        )
                    """
                ),
                {
                    "engagement_id": engagement_id,
                    "minute_id": minute_id,
                    "page_id": page_id,
                    "user_id": seed_user.id,
                },
            )

        command.upgrade(config, PROGRESS_RANGE_EXPANDED)

        with owner_engine.connect() as connection:
            rows = connection.execute(
                text(
                    """
                    SELECT
                        id,
                        engagement_id,
                        user_id,
                        logged_on,
                        unit::text,
                        start,
                        "end",
                        new_ground,
                        note,
                        created_at,
                        updated_at
                    FROM progress_logs
                    ORDER BY logged_on
                    """
                )
            ).mappings()

            assert [dict(row) for row in rows] == [
                {
                    "id": page_id,
                    "engagement_id": engagement_id,
                    "user_id": seed_user.id,
                    "logged_on": datetime.date(2026, 8, 1),
                    "unit": "pages",
                    "start": 10,
                    "end": 42,
                    "new_ground": True,
                    "note": "page note",
                    "created_at": datetime.datetime(
                        2026, 8, 1, 12, tzinfo=datetime.UTC
                    ),
                    "updated_at": datetime.datetime(
                        2026, 8, 2, 12, tzinfo=datetime.UTC
                    ),
                },
                {
                    "id": minute_id,
                    "engagement_id": engagement_id,
                    "user_id": seed_user.id,
                    "logged_on": datetime.date(2026, 8, 3),
                    "unit": "minutes",
                    "start": 30,
                    "end": 75,
                    "new_ground": False,
                    "note": "audio note",
                    "created_at": datetime.datetime(
                        2026, 8, 3, 12, tzinfo=datetime.UTC
                    ),
                    "updated_at": datetime.datetime(
                        2026, 8, 4, 12, tzinfo=datetime.UTC
                    ),
                },
            ]
    finally:
        command.upgrade(config, "head")


@pytest.mark.parametrize(
    ("unit", "page_start", "page_end", "minute_start", "minute_end"),
    [
        ("pages", None, 42, None, None),
        ("pages", 10, 42, 10, 42),
        ("minutes", None, None, 30, None),
        ("minutes", 10, 42, 30, 75),
    ],
)
def test_progress_range_migration_rejects_invalid_legacy_rows(
    seed_user: User,
    unit: str,
    page_start: int | None,
    page_end: int | None,
    minute_start: int | None,
    minute_end: int | None,
) -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, BEFORE_PROGRESS_RANGE)
    log_id = uuid.uuid4()
    try:
        with owner_engine.begin() as connection:
            engagement_id = _insert_engagement(connection, seed_user.id)
            connection.execute(
                text(
                    """
                    INSERT INTO progress_logs (
                        id, engagement_id, user_id, logged_on, unit,
                        page_start, page_end, minute_start, minute_end,
                        new_ground, created_at, updated_at
                    )
                    VALUES (
                        :log_id, :engagement_id, :user_id, '2026-08-01', :unit,
                        :page_start, :page_end, :minute_start, :minute_end,
                        true, now(), now()
                    )
                    """
                ),
                {
                    "engagement_id": engagement_id,
                    "log_id": log_id,
                    "minute_end": minute_end,
                    "minute_start": minute_start,
                    "page_end": page_end,
                    "page_start": page_start,
                    "unit": unit,
                    "user_id": seed_user.id,
                },
            )

        with pytest.raises(RuntimeError, match="invalid progress log range"):
            command.upgrade(config, PROGRESS_RANGE_EXPANDED)

        with owner_engine.connect() as connection:
            assert (
                connection.execute(
                    text("SELECT count(*) FROM progress_logs WHERE id = :log_id"),
                    {"log_id": log_id},
                ).scalar_one()
                == 1
            )
            assert (
                connection.execute(
                    text(
                        """
                    SELECT count(*)
                    FROM information_schema.columns
                    WHERE table_name = 'progress_logs'
                        AND column_name IN ('start', 'end')
                    """
                    )
                ).scalar_one()
                == 0
            )
    finally:
        with owner_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM progress_logs WHERE id = :log_id"),
                {"log_id": log_id},
            )
        command.upgrade(config, "head")


def test_progress_range_migration_syncs_old_and_new_writes(
    expanded_progress_range_schema: None, seed_user: User
) -> None:
    with owner_engine.begin() as connection:
        engagement_id = _insert_engagement(connection, seed_user.id)
        legacy_id = uuid.uuid4()
        canonical_id = uuid.uuid4()
        connection.execute(
            text(
                """
                INSERT INTO progress_logs (
                    id, engagement_id, user_id, logged_on, unit,
                    page_start, page_end, new_ground, created_at, updated_at
                )
                VALUES (
                    :log_id, :engagement_id, :user_id, '2026-08-01', 'pages',
                    10, 42, true, now(), now()
                )
                """
            ),
            {
                "engagement_id": engagement_id,
                "log_id": legacy_id,
                "user_id": seed_user.id,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO progress_logs (
                    id, engagement_id, user_id, logged_on, unit,
                    start, "end", new_ground, created_at, updated_at
                )
                VALUES (
                    :log_id, :engagement_id, :user_id, '2026-08-02', 'minutes',
                    30, 75, true, now(), now()
                )
                """
            ),
            {
                "engagement_id": engagement_id,
                "log_id": canonical_id,
                "user_id": seed_user.id,
            },
        )
        connection.execute(
            text("UPDATE progress_logs SET page_end = 50 WHERE id = :log_id"),
            {"log_id": legacy_id},
        )
        connection.execute(
            text('UPDATE progress_logs SET "end" = 90 WHERE id = :log_id'),
            {"log_id": canonical_id},
        )
        rows = connection.execute(
            text(
                """
                SELECT unit::text, start, "end", page_start, page_end,
                    minute_start, minute_end
                FROM progress_logs
                WHERE id IN (:legacy_id, :canonical_id)
                ORDER BY logged_on
                """
            ),
            {"canonical_id": canonical_id, "legacy_id": legacy_id},
        ).all()

        assert [tuple(row) for row in rows] == [
            ("pages", 10, 50, 10, 50, None, None),
            ("minutes", 30, 90, None, None, 30, 90),
        ]


def test_progress_range_migration_rejects_conflicting_transition_write(
    expanded_progress_range_schema: None, seed_user: User
) -> None:
    with owner_engine.begin() as connection:
        engagement_id = _insert_engagement(connection, seed_user.id)

    with pytest.raises(DBAPIError, match="Inconsistent progress log range"):
        with owner_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO progress_logs (
                        id, engagement_id, user_id, logged_on, unit,
                        start, "end", page_start, page_end,
                        new_ground, created_at, updated_at
                    )
                    VALUES (
                        :log_id, :engagement_id, :user_id, '2026-08-01',
                        'pages', 10, 50, 10, 42, true, now(), now()
                    )
                    """
                ),
                {
                    "engagement_id": engagement_id,
                    "log_id": uuid.uuid4(),
                    "user_id": seed_user.id,
                },
            )


def test_progress_range_contract_removes_legacy_schema() -> None:
    with owner_engine.connect() as connection:
        columns = connection.execute(
            text(
                """
                SELECT column_name, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                    AND table_name = 'progress_logs'
                    AND column_name IN (
                        'start', 'end', 'page_start', 'page_end',
                        'minute_start', 'minute_end'
                    )
                ORDER BY column_name
                """
            )
        ).all()
        sync_function_count = connection.execute(
            text(
                """
                SELECT count(*)
                FROM pg_proc
                WHERE proname = 'sync_progress_log_range_columns'
                """
            )
        ).scalar_one()
        constraint_count = connection.execute(
            text(
                """
                SELECT count(*)
                FROM pg_constraint
                WHERE conname = 'ck_progress_logs_valid_range'
                """
            )
        ).scalar_one()

        assert [tuple(row) for row in columns] == [
            ("end", "NO"),
            ("start", "NO"),
        ]
        assert sync_function_count == 0
        assert constraint_count == 1


def test_progress_range_migration_downgrade_preserves_canonical_writes(
    seed_user: User,
) -> None:
    config = Config(str(ALEMBIC_INI))
    log_id = uuid.uuid4()
    with owner_engine.begin() as connection:
        engagement_id = _insert_engagement(connection, seed_user.id)
        connection.execute(
            text(
                """
                INSERT INTO progress_logs (
                    id, engagement_id, user_id, logged_on, unit, start, "end",
                    new_ground, note, created_at, updated_at
                )
                VALUES (
                    :log_id, :engagement_id, :user_id, '2026-08-01', 'minutes',
                    30, 75, false, 'preserve me', now(), now()
                )
                """
            ),
            {
                "engagement_id": engagement_id,
                "log_id": log_id,
                "user_id": seed_user.id,
            },
        )

    command.downgrade(config, BEFORE_PROGRESS_RANGE)
    try:
        with owner_engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT unit::text, page_start, page_end,
                        minute_start, minute_end, new_ground, note
                    FROM progress_logs
                    WHERE id = :log_id
                    """
                ),
                {"log_id": log_id},
            ).one()
            canonical_columns = connection.execute(
                text(
                    """
                    SELECT count(*)
                    FROM information_schema.columns
                    WHERE table_name = 'progress_logs'
                        AND column_name IN ('start', 'end')
                    """
                )
            ).scalar_one()

            assert tuple(row) == (
                "minutes",
                None,
                None,
                30,
                75,
                False,
                "preserve me",
            )
            assert canonical_columns == 0
    finally:
        command.upgrade(config, "head")
