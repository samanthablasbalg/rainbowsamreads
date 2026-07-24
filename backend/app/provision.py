"""Provision the restricted ``app_user`` role (ADR-0023).

Runs as the *owner* before migrations, on every start, in every environment::

    python -m app.provision && alembic upgrade head && uvicorn app.main:app

Deliberately not an Alembic migration. Alembic records what a database has
already applied and skips it forever after, so a password set by a migration
could never be changed again without hand-editing the database. Role identity
and password are desired state, not schema history: they are reconciled on
every boot, which is what makes "change the variable and redeploy" sufficient.

The *grants* do live in a migration — they are schema-shaped, they change as
tables are added, and applying them once at a known point in history is right.
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit

import psycopg2
from dotenv import load_dotenv
from psycopg2 import sql

load_dotenv()

APP_ROLE = "app_user"

# Must agree with compose.yaml's POSTGRES_* settings and its
# `${POSTGRES_PORT:-5432}` mapping.
DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/reading_tracker"

# Named to be recognisable on sight in a connection string: seeing this value
# anywhere that is not a disposable local database means something is wrong.
DEFAULT_APP_DB_PASSWORD = "local-dev-only"

# Hosts whose databases are disposable, so a default password is harmless.
# "localhost" also covers CI, where the service container is reached that way
# and the database is destroyed minutes later. "db" is the compose service name,
# for when the app itself runs in a container.
LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "db"})


def owner_database_url() -> str:
    """The owner connection: migrations, seeding, and this module."""
    return os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL


def _is_local(database_url: str) -> bool:
    return (urlsplit(database_url).hostname or "") in LOCAL_HOSTS


def app_db_password(database_url: str) -> str:
    """The password ``app_user`` connects with.

    Defaulted against a local database so a fresh clone needs no .env at all;
    required anywhere else, so a deployed environment can never silently come
    up on a publicly known password.
    """
    password = os.getenv("APP_DB_PASSWORD")
    if password:
        return password
    if not _is_local(database_url):
        raise RuntimeError(
            "APP_DB_PASSWORD must be set when DATABASE_URL points at a "
            f"non-local host (got {urlsplit(database_url).hostname!r}). "
            "It is only defaulted for disposable local databases."
        )
    return DEFAULT_APP_DB_PASSWORD


def provision(database_url: str | None = None) -> None:
    """Ensure ``app_user`` exists and its password matches the environment."""
    database_url = database_url or owner_database_url()
    password = app_db_password(database_url)
    role = sql.Identifier(APP_ROLE)

    # Not `with psycopg2.connect(...)`: psycopg2's connection context manager
    # commits the transaction but does *not* close the connection.
    connection = psycopg2.connect(database_url)
    try:
        # CREATE ROLE cannot run inside a transaction block that later rolls
        # back cleanly here, and autocommit also means a caught duplicate-role
        # error leaves the connection usable rather than aborted.
        connection.autocommit = True
        with connection.cursor() as cursor:
            try:
                cursor.execute(sql.SQL("CREATE ROLE {role} LOGIN").format(role=role))
            except psycopg2.errors.DuplicateObject:
                # Postgres has no CREATE ROLE IF NOT EXISTS, and checking
                # pg_roles first would race two containers booting together
                # during a rolling deploy.
                pass

            # Unconditional: this is the line that makes rotating the password
            # a matter of changing one variable and redeploying. Concurrent
            # boots write the same value, so they cannot fight.
            cursor.execute(
                sql.SQL("ALTER ROLE {role} PASSWORD %s").format(role=role),
                (password,),
            )
    finally:
        connection.close()


def main() -> None:
    database_url = owner_database_url()
    provision(database_url)
    print(f"Provisioned role {APP_ROLE} on {urlsplit(database_url).hostname}")


if __name__ == "__main__":
    main()
