"""How this application addresses its database, and as which role.

Two roles connect to the same database (ADR-0023): an *owner* that owns the
schema and runs migrations, and the restricted *app_user* the running app
connects as, so row-level security applies to it.

Only the owner URL is ever configured. The app URL is derived from it by
swapping the username and password, so a new environment needs nothing beyond
the connection string its database provider already hands you — on Railway,
`${{Postgres.DATABASE_URL}}` plus a generated `APP_DB_PASSWORD`.
"""

from __future__ import annotations

import os
from urllib.parse import quote, urlsplit, urlunsplit

APP_ROLE = "app_user"

# Must agree with compose.yaml's POSTGRES_* settings and its
# `${POSTGRES_PORT:-5432}` mapping.
DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/reading_tracker"
DEFAULT_TEST_DATABASE_URL = (
    "postgresql://postgres:postgres@localhost:5432/reading_tracker_test"
)

# Named to be recognisable on sight in a connection string: seeing this value
# anywhere that is not a disposable local database means something is wrong.
DEFAULT_APP_DB_PASSWORD = "local-dev-only"

# Hosts whose databases are disposable, so a default password is harmless.
# "localhost" also covers CI, where the service container is reached that way
# and the database is destroyed minutes later. "db" is the compose service name,
# for when the app itself runs in a container.
LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1", "db"})


def owner_database_url() -> str:
    """The owner connection: migrations, seeding, and role provisioning."""
    return os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL


def test_database_url() -> str:
    """The owner connection to the pytest database (ADR-0014)."""
    return os.getenv("TEST_DATABASE_URL") or DEFAULT_TEST_DATABASE_URL


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


def app_database_url(owner_url: str | None = None) -> str:
    """The ``app_user`` connection, derived from an owner connection.

    Host, port, database and query parameters carry over untouched; only the
    credentials change.
    """
    owner_url = owner_url or owner_database_url()
    parts = urlsplit(owner_url)

    # Percent-encoded because a password is a URL component: an unescaped
    # "/", "@" or "+" would be parsed as URL structure and produce a baffling
    # wrong-host or missing-database error rather than an auth failure.
    # Railway's ${{secret()}} accepts a custom alphabet, so this is reachable.
    credentials = f"{APP_ROLE}:{quote(app_db_password(owner_url), safe='')}"

    host = parts.hostname or ""
    if ":" in host:  # IPv6 literals must stay bracketed
        host = f"[{host}]"
    authority = f"{credentials}@{host}"
    if parts.port:
        authority += f":{parts.port}"

    return urlunsplit((parts.scheme, authority, parts.path, parts.query, ""))


def configured_app_database_url(owner_url: str | None = None) -> str:
    """``APP_DATABASE_URL`` if explicitly set, otherwise the derived URL.

    The override exists so `e2e/playwright.config.ts` can keep pointing the e2e
    backend at the owner connection. Without it the e2e suite would switch to
    connecting as `app_user`, turning RLS on underneath it — which is #181's
    job, with its own acceptance criteria, not a side effect of this module.
    Remove the override when #181 lands; it is not a supported way to configure
    a deployed environment.
    """
    return os.getenv("APP_DATABASE_URL") or app_database_url(owner_url)
