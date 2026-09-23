from __future__ import annotations

import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, text
from sqlalchemy.exc import DBAPIError

from app.models.user import User
from tests.conftest import ALEMBIC_INI, owner_engine
from tests.migration_helpers import _insert_engagement

PREVIOUS_REVISION = "9e68c17db8ec"
TARGET_REVISION = "f8df33f0c1e7"


def _status_labels(connection: Connection) -> list[str]:
    return list(
        connection.execute(
            text(
                """
                SELECT enumlabel
                FROM pg_enum
                WHERE enumtypid = 'reading_status'::regtype
                ORDER BY enumsortorder
                """
            )
        ).scalars()
    )


def test_remove_interested_status_preserves_existing_engagement(
    seed_user: User,
) -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, PREVIOUS_REVISION)
    try:
        with owner_engine.begin() as connection:
            engagement_id = _insert_engagement(connection, seed_user.id)

        command.upgrade(config, TARGET_REVISION)

        with owner_engine.connect() as connection:
            status = connection.execute(
                text("SELECT status::text FROM engagements WHERE id = :id"),
                {"id": engagement_id},
            ).scalar_one()
            assert status == "reading"
            assert _status_labels(connection) == [
                "tbr",
                "reading",
                "finished",
                "paused",
                "dnf",
            ]
            columns = set(
                connection.execute(
                    text(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'engagements'
                        """
                    )
                ).scalars()
            )
            assert "interested_on" not in columns
            assert "interested_on_precision" not in columns
    finally:
        command.upgrade(config, "head")


@pytest.mark.parametrize(
    "legacy_update",
    [
        "UPDATE engagements SET status = 'interested' WHERE id = :id",
        "UPDATE engagements SET interested_on = DATE '2025-01-01' WHERE id = :id",
    ],
    ids=["interested-status", "interested-date"],
)
def test_remove_interested_status_rejects_legacy_data(
    seed_user: User, legacy_update: str
) -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, PREVIOUS_REVISION)
    engagement_id: uuid.UUID | None = None
    try:
        with owner_engine.begin() as connection:
            engagement_id = _insert_engagement(connection, seed_user.id)
            connection.execute(text(legacy_update), {"id": engagement_id})

        with pytest.raises(DBAPIError, match="Cannot remove interested"):
            command.upgrade(config, TARGET_REVISION)

        with owner_engine.connect() as connection:
            assert (
                connection.execute(
                    text("SELECT count(*) FROM engagements WHERE id = :id"),
                    {"id": engagement_id},
                ).scalar_one()
                == 1
            )
            assert "interested" in _status_labels(connection)
    finally:
        if engagement_id is not None:
            with owner_engine.begin() as connection:
                connection.execute(
                    text("DELETE FROM engagements WHERE id = :id"),
                    {"id": engagement_id},
                )
        command.upgrade(config, "head")
