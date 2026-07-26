# 0027. Database provisioning split by lifetime; connection URLs derived

- Status: Accepted
- Date: 2026-07-24

## Context

[[0023-per-user-data-isolation-via-rls]] requires the application to connect as a restricted
`app_user` role rather than as the schema owner, because Postgres skips row-level security for table
owners and superusers. That produced a role which had to exist, hold a password, and hold CRUD
privileges on every database — in every environment.

The original answer was `backend/scripts/setup_db_role.py`, run by hand. That cost was paid three
times over:

- **A new machine** needed Postgres installed and configured, three databases created, and the
  script run, before anything worked.
- **A new deployed environment** needed the script pointed at a remote database, then
  `APP_DATABASE_URL` assembled by hand from the owner connection string with the credentials
  swapped, and pasted into the application's variables. This was the sharpest pain: entirely manual,
  easy to get subtly wrong, and repeated per environment.
- **The three environments diverged.** CI opted out of password authentication entirely
  (`POSTGRES_HOST_AUTH_METHOD: trust`) and maintained its own Postgres service definition; local
  used whatever a Homebrew install defaulted to; only deployment used passwords. Each place set up
  the same database three different ways, so a green CI run said less than it appeared to.

The forcing question was where role provisioning belongs such that **one mechanism runs
everywhere**. Two candidate homes presented themselves, and the choice between them looked
arbitrary:

- An **Alembic migration**, alongside the RLS policies it supports.
- The container's **start-up path**, before migrations.

A third — SQL in `/docker-entrypoint-initdb.d` — is disqualified by inspection rather than
judgement: those scripts are a feature of the official Postgres image's entrypoint, and a managed
database provider hands you a running instance whose entrypoint you never control. Anything placed
there is structurally local-only.

## Decision

**Split provisioning by how long each piece of state should live, not by what language expresses
it.**

1. **Role identity and password are desired state, reconciled on every boot.** `app/provision.py`
   creates `app_user` if absent and unconditionally sets its password from `APP_DB_PASSWORD`. It
   runs first in the container start command (`provision → alembic upgrade head → uvicorn`) and is
   called directly by `conftest.py`, which is the one consumer that never boots through a container.

   The decisive property is that **Alembic applies a migration once per database and skips it
   forever after**. A password set by a migration could never be changed again without hand-editing
   the database — recreating, at rotation time, exactly the manual step this decision removes.
   Reconciling every boot makes "change the variable and redeploy" sufficient.

2. **Grants are schema history, applied once by a migration.** They change as tables are added and
   are correctly ordered against the DDL they depend on. `ALTER DEFAULT PRIVILEGES` carries them
   forward, so tables created by future migrations inherit CRUD without anyone remembering to grant
   it, and no second grants migration is ever needed.

3. **Database creation is genuinely local-only**, because a provider hands you one ready-made. It,
   and only it, lives in init SQL.

4. **Connection URLs are derived, not configured.** `APP_DATABASE_URL` and `APP_TEST_DATABASE_URL`
   are no longer set anywhere; `app/db_url.py` builds them from `DATABASE_URL` by swapping the
   username and password. A new environment supplies only the connection string its provider already
   gives it, plus `APP_DB_PASSWORD`. There is one input, so the owner and app connections cannot
   drift apart.

5. **Defaults are scoped to disposable databases.** Owner URLs default to the compose database, and
   `APP_DB_PASSWORD` is defaulted **only** when `DATABASE_URL` names a local host — `localhost`,
   `::1`, or the compose service. That covers a laptop and a CI runner, both of which destroy their
   database routinely. Anywhere else the password must be set explicitly or start-up fails, so a
   deployment cannot silently come up on a publicly known password.

Consequently CI runs the same `compose.yaml` as local development rather than a parallel service
definition, and the manual setup script is deleted.

## Consequences

**Makes easy:**

- A clean checkout runs `docker compose up db`, migrations, and the full test suite with no `.env`
  file at all. Only irreducibly personal configuration — the OAuth client, the allowlist — has to be
  supplied.
- A new deployed environment needs no hand-setup: the start command provisions the role, migrates,
  and starts the app, in that order, on every boot.
- **Rotating the database password is changing one variable and redeploying.** This was previously
  impossible without connecting to the database by hand, and is the single property that decided
  where the role lives.
- Local, CI, and deployed environments converge on one container definition and one authentication
  method. CI stops opting out of password auth — by deleting a line, not adding one.
- Concurrent boots during a rolling deploy cannot fight: role creation catches `DuplicateObject`
  rather than checking `pg_roles` first, and because the password comes from an environment variable
  rather than being generated per boot, every replica writes the same value.

**What we accept:**

- **Two places answer "how does `app_user` get set up?"** — the role in `app/provision.py`, the
  grants in a migration. This is the direct cost of the split and the thing most likely to look
  arbitrary later; each cross-references the other.
- Provisioning lives in the start command, so anything starting the app another way skips it. Mostly
  benign, because a Postgres role is cluster-scoped and persists once created — it only matters when
  the password has changed. The two paths that bypass it (`pytest`, and Playwright's `webServer`)
  call `provision` explicitly.
- The application container needs owner credentials at boot, not just restricted ones. Not a new
  exposure: the start command already ran `alembic upgrade head`, which requires them for the same
  reason.
- A missing `APP_DB_PASSWORD` in a deployed environment fails the boot rather than degrading. This
  is the intended direction to fail, but it is downtime if it reaches production untested.
- One `if` decides whether a host is disposable. It is a small rule with real security weight, and
  it is only as good as `LOCAL_HOSTS` being right.

## Alternatives considered

- **Everything in one Alembic migration** — role, password, and grants together. The obvious
  arrangement, and rejected on one specific ground: Alembic never re-applies a migration, so the
  password would be set once per database and never again. Rotation would mean hand-editing the
  database or writing a fresh migration each time, which is the manual Railway step this exists to
  delete. Everything else about it was fine, and the flaw is invisible until the first rotation —
  local and CI databases are recreated so often that they would never expose it.
- **Generating a random password at boot** and passing it to the app in-process. Needs no variable
  at all, which is attractive. Rejected because it only works for consumers that boot through a
  container entrypoint: `pytest` opens its own engine and would have to be re-plumbed, and replicas
  in a rolling deploy would each rotate the password out from under the others.
- **Init SQL in `/docker-entrypoint-initdb.d`** — cannot run on a managed database, so it could
  never be the shared mechanism. It also only fires when the data directory is empty, which suits
  one-time database creation and nothing that must be reconcilable.
- **A one-shot script, kept but automated per environment.** This is the status quo with better
  ergonomics; it leaves a separate thing to remember to run, and provides nothing that running it on
  every boot does not.
- **Keeping `APP_DATABASE_URL` configured explicitly.** Rejected as the general mechanism, because
  two independently-set URLs can disagree and a stale one silently defeats rotation. It survives as
  a temporary override so the e2e suite can keep pointing its backend at the owner connection; that
  goes when e2e moves to `app_user`.

## Revisit when

- **Migrations stop running as the same role that owns the tables.** `ALTER DEFAULT PRIVILEGES`
  attaches to the granting role and reads "tables created _by this role_". A different owner's new
  tables would silently receive no grants, and the symptom is a permission error on a table added
  months later.
- **The schema gains a sequence** — a `serial` or identity column. None exist today (every primary
  key is a UUID generated in Python), so the grants migration deliberately omits sequence
  privileges. The symptom would be a permission error on `INSERT` only.
- **More than one application connects to the same database**, or one needs a different privilege
  set. A single `app_user` reconciled from a single variable stops being sufficient.
- **A managed provider stops giving the deploying role `CREATEROLE`.** Provisioning at boot assumes
  the owner connection can create and alter roles.
