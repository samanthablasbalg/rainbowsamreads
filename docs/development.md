# Development guide

Development runs in containers. Docker supplies PostgreSQL, the application services, browser
binaries, Python, Node, and the repository's checks; no host Python, Node, or Postgres installation
is required.

## Quick start

1. Install Docker Desktop.
2. Copy `backend/.env.example` to `backend/.env` and fill in the Google credentials described under
   [configuration](#configuration).
3. From the repository root, start the stack:

   ```bash
   docker compose up
   ```

4. Open [http://localhost:8080](http://localhost:8080).
5. Enter the development container in another terminal:

   ```bash
   docker compose exec workspace zsh
   ```

The first start builds the development image, creates the development and test databases, installs
the frontend packages, and installs the e2e packages used by the browser service. Later starts reuse
those volumes. Migrations apply automatically before the API begins serving requests.

Useful local addresses:

| Service    | Address                      | Notes                                                                                |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| App        | `http://localhost:8080`      | Caddy serves the frontend and proxies `/api/*`, matching production's single origin. |
| API docs   | `http://localhost:8000/docs` | FastAPI's generated Swagger UI.                                                      |
| PostgreSQL | `localhost:5432`             | Published for host-side database tools.                                              |
| Storybook  | `http://localhost:6006`      | Start separately with `docker compose up storybook`.                                 |

The frontend and remote browser services do not publish their internal ports. `POSTGRES_PORT`,
`API_PORT`, and `PROXY_PORT` in a root `.env` file can move the three corresponding published ports
for another local stack. Storybook currently always publishes `6006`.

## Commands

Run these inside `workspace` unless the table says otherwise:

| Task                                 | Command                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| Backend tests                        | `cd backend && pytest`                                    |
| One backend test                     | `cd backend && pytest tests/test_books.py::test_name`     |
| Frontend unit tests                  | `cd frontend && npm test`                                 |
| Frontend lint, types, and unit tests | `cd frontend && npm run check`                            |
| Storybook browser tests              | `cd frontend && npm run test:storybook`                   |
| End-to-end tests                     | `cd e2e && npm test`                                      |
| All pre-commit checks                | `pre-commit run --all-files`                              |
| Format the repository                | `cd frontend && npm run prettier:format`                  |
| Regenerate the API client            | `cd frontend && npm run generate:api`                     |
| Create a migration                   | `cd backend && alembic revision --autogenerate -m "…"`    |
| Apply migrations manually            | `cd backend && alembic upgrade head`                      |
| Reseed development data              | `cd backend && python -m scripts.seed_dev`                |
| Open `psql` from the host            | `docker compose exec db psql -U postgres reading_tracker` |

`prettier:check` and `prettier:format` run from `frontend/` but cover the whole repository.
`generate:api` runs Orval against the committed OpenAPI schema; a pre-commit hook regenerates both
the schema and client after backend API changes.

## Commands that replace local data

- The e2e suite truncates the development database before each test. Reseed after a run if you want
  sample data back.
- `python -m scripts.seed_dev` truncates every application table before inserting its fixtures.
- `docker compose down -v` removes the development and test databases, both `node_modules` volumes,
  and the Playwright authoring volumes.

After an e2e run or seed, log out and back in. Resetting the database replaces the user row, so an
existing signed cookie points at a user id that no longer exists. `/api/auth/me` responds with 401
for that stale session and signing in again establishes a session for the current user row.

## Configuration

The app reads `backend/.env` locally. Compose supplies the local database address, session secret,
and test-login flag, so the file only needs credentials for external services and the allowlist.

| Variable                | Local development                                                  | Deployment                                          |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | Google OAuth client id.                                            | Required.                                           |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret.                                        | Required.                                           |
| `ALLOWED_EMAILS`        | Comma-separated login allowlist.                                   | Required.                                           |
| `GOOGLE_BOOKS_API_KEY`  | Required for reliable book search.                                 | Required for book search.                           |
| `SESSION_SECRET`        | Supplied by Compose as a known local value.                        | Required; the app refuses to boot without it.       |
| `ALLOW_TEST_LOGIN`      | Supplied by Compose as `true`.                                     | Never enable; it exposes the non-Google test login. |
| `GOOGLE_REDIRECT_URI`   | Leave unset; derived as `http://localhost:8080/api/auth/callback`. | Set to `https://<domain>/api/auth/callback`.        |
| `FRONTEND_URL`          | Defaults to `http://localhost:8080`.                               | Set to the deployed frontend origin.                |
| `SESSION_COOKIE_SECURE` | Leave false for local HTTP.                                        | Set to `true`.                                      |

Deployment also requires `DATABASE_URL` and `APP_DB_PASSWORD`. The container provisions or updates
the restricted application role, applies migrations, and starts the server on every boot. Local
development derives both database roles from the Compose defaults.

Register these OAuth redirect URIs on the shared Google client:

| Environment     | URI                                       |
| --------------- | ----------------------------------------- |
| Local           | `http://localhost:8080/api/auth/callback` |
| Each deployment | `https://<domain>/api/auth/callback`      |

The authentication routes are:

| Route                       | Behavior                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /api/auth/login`       | Redirects to Google.                                                                             |
| `GET /api/auth/callback`    | Verifies the Google identity and allowlist, writes the session, and redirects to `FRONTEND_URL`. |
| `GET /api/auth/me`          | Returns the current user or 401, including when a signed session names a deleted user.           |
| `POST /api/auth/logout`     | Clears the session.                                                                              |
| `POST /api/auth/test-login` | Available only when `ALLOW_TEST_LOGIN=true`; accepts the fixed `e2e` or `dev` persona.           |

## Seeding

With the stack running, seed from `backend/`:

```bash
python -m scripts.seed_dev
```

Run the script as a module so `backend/` remains on the import path. It calls the running API and
authenticates through `POST /api/auth/test-login`. `DATABASE_URL` and `BASE_URL` default to the
local Compose services but can be overridden.

The seed creates 8 books and 6 engagements: 1 TBR, 3 reading, 1 finished, and 1 DNF. It replaces all
existing development data, including the user row.

## Tests and checks

### Backend

`pytest` uses a dedicated test database. The suite provisions the restricted role, rebuilds the
schema through migrations, and truncates between tests. Both the app and tests connect as
`app_user`, so row-level security is exercised.

Backend CI also runs Ruff, strict mypy, the test suite, and the OpenAPI drift check. The local
pre-commit suite adds two backend dependency checks:

- import-linter enforces the documented package dependency direction;
- the `no-queries-in-routers` pre-commit hook detects SQLAlchemy session queries in API routers.

Most local hooks use `language: system` and therefore run the versions installed in the development
image. The router-query hook uses pre-commit's `pygrep` language because it is a source-pattern
check. `workspace` installs the hook each time it starts.

### Frontend and Storybook

`npm test` runs the jsdom unit project with React Testing Library and MSW. `npm run test:storybook`
runs the second Vitest project, rendering stories in a real browser supplied by the `browsers`
service. A promoted component is expected to have a story, and accessibility violations fail that
browser run.

CI invokes Storybook through its Compose service so the orchestration server has a network alias:

```bash
docker compose run --rm --use-aliases storybook npm run test:storybook
```

It also runs `npm run build-storybook` to verify the static build.

### End to end

From `e2e/`, run:

```bash
npm test
```

On a normal local stack, `browsers` installs the e2e dependencies into the shared volume when they
are missing, so there is no separate first-run install step. CI deliberately runs `npm ci` in its
own e2e job before the test command on a fresh runner.

The Playwright process runs in the development image and drives browsers in the `browsers` service
over a websocket. It reaches the application through `proxy`, so local and CI runs exercise the same
containerized stack. Reports land in `e2e/playwright-report/` and `e2e/test-results/`; CI uploads
the debug artifacts on failure and publishes the HTML report on every run.

## Database and migrations

The `db` service creates the development and [test](decisions/0014-dedicated-test-database.md)
databases on the first start. The database owner creates the schema and applies migrations; the
running application uses the restricted `app_user` role so PostgreSQL row-level security is
effective. The provisioning lifecycle is recorded in
[ADR-0027](decisions/0027-database-provisioning-by-lifetime.md).

The API startup sequence is:

```text
python -m app.provision  ->  alembic upgrade head  ->  uvicorn
```

The first two steps are idempotent. Run Alembic manually only while authoring or inspecting a
migration.

There is no separate e2e database. Playwright uses and resets the development database, as recorded
in [ADR-0030](decisions/0030-e2e-runs-against-the-compose-dev-stack.md).

## Rebuilding dependencies

Source files are bind-mounted, so ordinary edits appear immediately. Installed dependencies need a
different action:

- After changing `backend/requirements.txt` or `Dockerfile.dev`, run `docker compose build`.
- After changing `frontend/package.json` or its lockfile, run `cd frontend && npm ci` inside
  `workspace`.
- After changing `e2e/package.json` or its lockfile, restart `browsers` so its install guard updates
  the shared e2e volume, or run `docker compose run --rm e2e npm ci`.

## Container layout

```text
                          Docker
  +----------------------------------------------------------+
  |                  proxy :8080 (Caddy)                     |
  |                    |                |                    |
  |              /api/*|                |everything else     |
  |                    v                v                    |
  |                api :8000       frontend :5173            |
  |                    | app_user                            |
  |                    v                                     |
  |                  db :5432                                |
  |                                                          |
  | workspace/e2e --Playwright--> browsers --HTTP--> proxy   |
  +----------------------------------------------------------+
```

The host publishes the database, API, proxy, and optional Storybook ports. Service-to-service
traffic uses Compose names.

The repository is mounted inside the container at the same absolute path it has on the host. A Git
worktree's `.git` file points to an absolute path in the main repository, so matching paths keep
worktrees valid on both sides. Frontend and e2e `node_modules` use named volumes to avoid moving
thousands of small files across the macOS bind mount.

`workspace` runs no application process; it exists for shells, editors, tests, git, and coding
tools. VS Code's **Reopen in Container** attaches to it without replacing the API command. The
Python interpreter is `/opt/venv/bin/python`, already first on `PATH`.

The `scripts/claude` and `scripts/codex` wrappers start `workspace` and launch the corresponding
tool inside it. Their Linux credentials and configuration are separate from the macOS applications,
so each CLI needs its own one-time login. GitHub CLI configuration and the 1Password SSH agent are
mounted into `workspace` for repository access.

For the request path, RLS boundary, and data model, see the
[architecture overview](architecture.md).
