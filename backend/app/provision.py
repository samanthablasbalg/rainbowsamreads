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

from urllib.parse import urlsplit

import psycopg2
from dotenv import load_dotenv
from psycopg2 import sql

from app.db_url import APP_ROLE, app_db_password, owner_database_url

load_dotenv()


def provision(database_url: str | None = None) -> None:
    """Ensure ``app_user`` exists and its password matches the environment."""
    database_url = database_url or owner_database_url()
    password = app_db_password(database_url)
    role = sql.Identifier(APP_ROLE)

    # Not `with psycopg2.connect(...)`: psycopg2's connection context manager
    # commits the transaction but does *not* close the connection.
    connection = psycopg2.connect(database_url)
    try:
        # Autocommit means a caught duplicate-role error leaves the connection
        # usable rather than aborted.
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
