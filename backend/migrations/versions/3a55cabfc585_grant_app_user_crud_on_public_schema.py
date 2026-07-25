"""grant app_user crud on public schema

Revision ID: 3a55cabfc585
Revises: 1090f97b69af
Create Date: 2026-07-24 17:55:06.635705

Grants the restricted role from ADR-0023 the privileges it needs, so the app
can connect as something that is neither the owner nor a superuser and RLS
therefore applies to it.

The role itself is created by `app.provision`, which runs before migrations —
role identity and password are reconciled on every boot, while these grants are
schema-shaped and belong in history. Running this against a database where the
role does not exist fails with `role "app_user" does not exist`; the fix is to
run `python -m app.provision` first.

Granting CRUD does not weaken RLS. Privileges decide whether the role may
*attempt* a read or write on a table at all; the policies then decide *which
rows* it sees. The role needs both.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3a55cabfc585'
down_revision: Union[str, Sequence[str], None] = '1090f97b69af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_ROLE = "app_user"
PRIVILEGES = "SELECT, INSERT, UPDATE, DELETE"


def upgrade() -> None:
    """Upgrade schema."""
    # Schema access is a separate gate from table access: without USAGE the
    # role cannot reach the tables however they are granted.
    #
    # Redundant on a stock Postgres, where schema public already grants USAGE
    # to PUBLIC (the pseudo-role meaning everyone). Kept deliberately: it makes
    # the requirement explicit rather than inherited, and it still holds on a
    # database where USAGE has been revoked from PUBLIC. Postgres 15 already
    # tightened these defaults once by revoking CREATE from PUBLIC.
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}")

    # A snapshot. Postgres expands ALL TABLES to those existing right now and
    # grants on each individually; tables added later are not covered.
    op.execute(f"GRANT {PRIVILEGES} ON ALL TABLES IN SCHEMA public TO {APP_ROLE}")

    # The standing rule that covers everything added later, so no future
    # migration has to remember to grant. Note this attaches to the role
    # running it (omitting FOR ROLE means the current one) — it reads "tables
    # created *by this role* get these grants". Migrations always run as the
    # owner, which is `postgres` both locally and on Railway, so it holds; if
    # the owner ever changed, its new tables would silently get nothing.
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"GRANT {PRIVILEGES} ON TABLES TO {APP_ROLE}"
    )

    # No sequence grants: every primary key is a UUID generated in Python, so
    # the schema has no sequences. Adding a serial/identity column later would
    # need GRANT USAGE ON SEQUENCE — the symptom is a permission error on
    # INSERT only.


def downgrade() -> None:
    """Downgrade schema."""
    # Deliberately does not drop the role. It is cluster-scoped while this
    # migration is per-database, so dropping it while downgrading one database
    # would yank it out from under the others. Revoking within the database is
    # the correctly-scoped inverse.
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"REVOKE {PRIVILEGES} ON TABLES FROM {APP_ROLE}"
    )
    op.execute(f"REVOKE {PRIVILEGES} ON ALL TABLES IN SCHEMA public FROM {APP_ROLE}")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {APP_ROLE}")
