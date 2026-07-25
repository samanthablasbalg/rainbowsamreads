# Development guide

How to run the whole stack locally. The one non-obvious part is the database: the app uses **two
Postgres roles** so that row-level security actually constrains it (see
[ADR-0023](decisions/0023-per-user-data-isolation-via-rls.md)) — an owner role that owns the schema
and runs migrations, and a restricted `app_user` role the running app connects as.

## Prerequisites

- **Python 3.14**
- **Docker** (for the database)
- **Node.js** (for the Angular 22 frontend)

You don't need Postgres installed. If you already run it natively, stop it before starting the
container — both want port 5432.

---

## Database

```bash
docker compose up db -d
```

That's the whole setup. The container creates the three databases (dev, test, and
[e2e](decisions/0018-e2e-testing-database-strategy.md)) on first start and keeps them in a named
volume, so they survive `docker compose down`. To start over, `docker compose down -v` throws the
volume away and the next start rebuilds all three, empty.

Set `POSTGRES_PORT` if 5432 is taken.

---

## Backend

From `backend/`:

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

> The pre-commit hook looks for the virtualenv at `backend/venv`, so that's the path to use.

**1. Run migrations** (as the owner — this builds the schema _and_ installs the RLS policies):

```bash
python -m app.provision   # only on a brand-new database
alembic upgrade head
```

`app.provision` creates the restricted `app_user` role and sets its password. It's idempotent, and
the container start command runs it on every boot, so you only need it by hand against a database
nothing has booted against yet — a fresh volume, or right after `docker compose down -v`.

**2. Create `backend/.env`** — copy `backend/.env.example` and fill in your Google OAuth client (see
below). Nothing database-related goes in it.

**3. Run the app:**

```bash
uvicorn app.main:app --reload   # http://localhost:8000
```

### Environment variables (`backend/.env`)

Everything about reaching the database is derived rather than configured. `DATABASE_URL` defaults to
the compose database, and the `app_user` connection is built from it by swapping the credentials —
so a fresh clone runs migrations and tests with no `.env` at all. What's left is what nobody can
guess for you.

Copy `backend/.env.example` as a starting point.

| Variable               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `SESSION_SECRET`       | Signs the session cookie.                                                  |
| `GOOGLE_CLIENT_ID`     | Google OAuth client.                                                       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret.                                                |
| `ALLOWED_EMAILS`       | Allowlist of emails permitted to log in (the app is invite-only).          |
| `GOOGLE_BOOKS_API_KEY` | Book search. Unkeyed requests share one global quota, so they always fail. |
| `ALLOW_TEST_LOGIN`     | Enables `POST /auth/test-login`, which `seed_dev.py` needs. Never in prod. |

Optional, and mostly for deployment:

| Variable                | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | **Owner** connection. Defaults to the compose dev database.                          |
| `TEST_DATABASE_URL`     | **Owner** connection for pytest. Defaults to the compose test database.              |
| `APP_DB_PASSWORD`       | `app_user`'s password. Defaulted for local databases; **required** anywhere else.    |
| `POSTGRES_PORT`         | Host port the container binds (default `5432`). Read by `compose.yaml`, not the app. |
| `GOOGLE_REDIRECT_URI`   | Override the OAuth redirect URI (otherwise derived from the request).                |
| `FRONTEND_URL`          | Where to redirect after login (default `http://localhost:4200`).                     |
| `SESSION_COOKIE_SECURE` | Set to `true` for https-only cookies (production).                                   |

`APP_DATABASE_URL` and `APP_TEST_DATABASE_URL` are still honoured if set, but they exist only so the
e2e suite can point its backend at the owner connection until #181 lands. Don't set them.

### Deploying somewhere new

Point `DATABASE_URL` at the database and set `APP_DB_PASSWORD` to something random. There is no
setup script to run: the container's start command provisions the role, migrates, and starts the
app, in that order, on every boot. Rotating the password is a matter of changing the variable and
redeploying.

---

## Frontend

From `frontend/`:

```bash
npm install
npm start          # http://localhost:4200
```

`npm start` runs `ng serve` with `proxy.conf.json`, which forwards `/api` to the backend at
`http://localhost:8000` — so run the backend alongside it.

---

## Google OAuth setup

Auth is Google OAuth with an email allowlist. To run it locally you'll need your own OAuth client:

1. In the Google Cloud console, create an **OAuth 2.0 Client ID** (web application).
2. Add an authorized redirect URI that matches where the backend serves the callback (locally, the
   value `GOOGLE_REDIRECT_URI` resolves to, e.g. `http://localhost:8000/api/auth/callback`).
3. Put the client ID and secret in `backend/.env`, and add your Google account's email to
   `ALLOWED_EMAILS` — only allowlisted emails can complete login.

---

## Seeding development data

`scripts/seed_dev.py` populates a dev database by calling the running backend's API:

```bash
python scripts/seed_dev.py   # backend must be running; override its URL with BASE_URL
```

> **Known gotcha (verify when pulled):** the seed script doesn't currently authenticate against the
> auth-gated backend (issue #147), so it may need adjustment before it works end-to-end against the
> login flow.

---

## Tests

- **Backend** — from `backend/`:

  ```bash
  pytest
  ```

  Needs the database container running, and nothing else configured. The suite provisions the role,
  resets the schema, runs migrations, and truncates between tests against a
  [dedicated test database](decisions/0014-dedicated-test-database.md). It connects as `app_user`,
  so the RLS policies are actually exercised.

- **Frontend** — from `frontend/`:

  ```bash
  npm test
  ```

  This runs `ng test --watch=false` through Angular's build (which sets up the Vitest environment).
  Don't run `vitest` directly — it bypasses that setup.

- **End-to-end** — from `e2e/`:

  ```bash
  npm install
  npx playwright install   # first time: browser binaries
  npm test
  ```

  Playwright against a
  [purpose-built e2e database strategy](decisions/0018-e2e-testing-database-strategy.md). The e2e
  run uses a test-auth bypass (`ALLOW_TEST_LOGIN=true`) so it doesn't need real Google login; that
  flag must never be set in production.

- **Static checks** — Ruff, mypy (strict), ESLint, and Prettier run via pre-commit
  (`.pre-commit-config.yaml`); install the hooks with `pre-commit install`.

---

## How it fits together locally

```
frontend (ng serve :4200)  ──/api proxy──▶  backend (uvicorn :8000)  ──app_user──▶  PostgreSQL
```

For the bigger picture — the request path, the RLS boundary, the data model — see the
[architecture overview](architecture.md).
