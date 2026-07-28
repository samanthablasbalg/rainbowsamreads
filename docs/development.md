# Development guide

Development happens in containers. `docker compose up` starts the database, the API and the
frontend; the tools you develop _with_ — pytest, ruff, mypy, npm, git, `gh`, Claude Code — live in a
dev image (`Dockerfile.dev`) rather than on the Mac. A clean machine needs Docker and nothing else.

Two consequences are worth knowing before anything below makes sense:

- **Commands run inside the container.** `pytest`, `npm test`, `alembic`, `pre-commit` — all of them
  resolve to the image's toolchain. There is no virtualenv to activate: `/opt/venv` is first on
  `PATH`, so `python`, `pytest`, `ruff`, `mypy` and `pre-commit` are simply there.
- **The repo is bind-mounted at its own host path**, not the conventional `/workspaces/<name>`. A
  git worktree's `.git` is a file holding an absolute host path back into the main repo, so mounting
  anywhere else would leave that pointer dangling inside the container. Identical paths mean it
  resolves untouched, and worktrees keep working from both sides.

The other non-obvious part is the database: the app uses **two Postgres roles** so that row-level
security actually constrains it (see [ADR-0023](decisions/0023-per-user-data-isolation-via-rls.md))
— an owner role that owns the schema and runs migrations, and a restricted `app_user` role the
running app connects as. How each gets provisioned is
[ADR-0027](decisions/0027-database-provisioning-by-lifetime.md).

## Prerequisites

- **Docker Desktop**
- **VS Code** — optional, but it can attach into the container (see below)

You do not need Python, Node, or Postgres installed. If you already run Postgres natively, stop it
or set `POSTGRES_PORT` — both want port 5432.

---

## Start the stack

```bash
docker compose up
```

| Service     | Port   | What it runs                                                       |
| ----------- | ------ | ------------------------------------------------------------------ |
| `db`        | `5432` | PostgreSQL 18                                                      |
| `api`       | `8000` | `uvicorn --reload` — restarts on backend edits                     |
| `frontend`  | `4200` | `ng serve --host 0.0.0.0` — rebuilds on frontend edits             |
| `workspace` | —      | Nothing. It exists to be attached to and `exec`'d into (see below) |

The app is at **http://localhost:4200** and the API docs at **http://localhost:8000/docs**.

On the very first `up`, expect a few minutes: Docker builds the dev image, the database container
creates its three databases, and the frontend runs `npm ci`. After that, starting is quick.

`api` starts with the same three steps as the production image's `CMD`, for the same reasons:

```
python -m app.provision  →  alembic upgrade head  →  uvicorn
```

Both leading steps are idempotent, so they re-run harmlessly on every restart — which means
**migrations apply themselves when you start the stack**, and you only run `alembic` by hand when
you're writing one.

`docker compose up db -d` on its own is enough if you only want a database — that's what CI does.

### Ports

Compose reads these from a `.env` file at the repo root, so a second stack can be moved out of the
way (per-worktree stacks are #184):

| Variable        | Default |
| --------------- | ------- |
| `POSTGRES_PORT` | `5432`  |
| `API_PORT`      | `8000`  |
| `FRONTEND_PORT` | `4200`  |

---

## Working inside the container

Everything below happens in the `workspace` service. It runs `pre-commit install` and then
`sleep infinity` — deliberately nothing else. VS Code replaces an attached service's command, so
attaching to `api` would kill uvicorn; a service that runs nothing has nothing to lose.

### With a shell

```bash
docker compose exec workspace zsh
```

You land at the repo root, with the same paths you see on the Mac.

### With VS Code

**Reopen in Container** (from `.devcontainer/devcontainer.json`) moves the language servers,
extensions, terminal and debugger inside `workspace`, while the UI stays native. Notes:

- Extensions do not carry in from the Mac — they install into the container, from the list in
  `devcontainer.json`.
- The Python interpreter is `/opt/venv/bin/python`. `.vscode/settings.json` deliberately no longer
  pins one, because workspace settings outrank the devcontainer's and would break resolution inside.
- Closing the window leaves the stack running. Taking it down is a deliberate `docker compose down`.

### Common commands

All from inside the container:

| Task               | Command                                                      |
| ------------------ | ------------------------------------------------------------ |
| Backend tests      | `cd backend && pytest`                                       |
| Frontend tests     | `cd frontend && npm test`                                    |
| Apply migrations   | `cd backend && alembic upgrade head`                         |
| Write a migration  | `cd backend && alembic revision --autogenerate -m "…"`       |
| All static checks  | `pre-commit run --all-files`                                 |
| Reinstall npm deps | `cd frontend && npm ci`                                      |
| psql               | `docker compose exec db psql -U postgres reading_tracker` \* |

\* that one is from the Mac, since it's aimed at the `db` container.

### Why the checks have to run in here

Every hook in `.pre-commit-config.yaml` is now `language: system` — it runs a tool already installed
in the dev image rather than a private copy pre-commit built for itself. The usual reason to let
pre-commit manage hook environments is that it can't assume the tool is present; in the container it
is, and a managed copy would mean a second version of ruff and mypy to keep in step with
`backend/requirements.txt` by hand. The trade is that the hooks only work where the toolchain
exists, which is the container.

`pre-commit install` runs on every boot of `workspace` rather than being something to remember: git
never clones `.git/hooks/`, so without it a fresh clone commits with no checks at all, silently
(#164).

---

## Claude Code in the container

```bash
scripts/claude          # from the Mac; starts `workspace` if needed and drops you in
```

Claude runs inside rather than on the Mac because the two halves have to match: the permission rules
in `.claude/settings.json` match bare commands (`python -m pytest`), and the Stop hook resolves
`pre-commit` from `PATH`. Wrapping either in `docker compose exec` from the host breaks both.

Settings, skills, memory and session history come from the Mac through bind mounts of `~/.claude`
and `~/.claude.json`, so sessions carry over. Git identity (`~/.gitconfig`), global ignore rules
(`~/.config/git`) and `gh`'s config are mounted for the same reason.

### Credentials are files in here, and separate from the Mac's

`claude` and `gh` both need **one login inside the container**, after which they persist through the
bind mount. On macOS both store credentials in the Keychain, which a Linux container cannot read, so
in here they fall back to files: `~/.claude/.credentials.json` and `~/.config/gh/hosts.yml`. Two
things follow, both deliberate and both worth knowing:

- **There are now two independent credential stores for the same accounts.** Logging out on the Mac
  does not log the container out, and vice versa.
- **The tokens sit in plain files in the home directory** rather than encrypted at rest.

### Pushing from inside

`origin` is an SSH remote and the keys live in 1Password rather than on disk — reachable only
through its agent socket, which runs on the Mac. `compose.yaml` forwards that socket into
`workspace` and points `SSH_AUTH_SOCK` at it, so `git push` from inside uses the same key and the
same approval prompt as on the host. No key material is copied.

Only `known_hosts` is mounted from `~/.ssh`, not the whole directory: that directory's config sets
`IdentityAgent` to the socket's _macOS_ path, which doesn't exist here and would override the
forwarded socket.

---

## Rebuilding

The image carries the toolchain; the source arrives as a bind mount. So edits are live, but anything
_installed_ needs a rebuild:

```bash
docker compose build          # after changing backend/requirements.txt or Dockerfile.dev
```

**A `requirements.txt` change requires `docker compose build`.** Python dependencies are installed
into `/opt/venv` at image build time — outside the repo, so nothing shadows them — which means a new
or bumped package does not exist until the image is rebuilt. `requirements.txt` is the last thing
copied in the Dockerfile, so this invalidates only that layer, not the whole toolchain.

Frontend dependencies work differently: `node_modules` lives in a named volume (a bind mount of tens
of thousands of tiny files across the macOS filesystem boundary is unusably slow), populated by
`npm ci` on first boot only. After a `package.json` change, run `cd frontend && npm ci` inside the
container.

`docker compose down -v` throws away **both** named volumes — the databases as well as
`node_modules`. The next `up` rebuilds all three databases, empty, and reinstalls.

---

## Database

The `db` container creates all three databases (dev, test, and
[e2e](decisions/0018-e2e-testing-database-strategy.md)) on first start and keeps them in a named
volume, so they survive `docker compose down`. Only creation happens there: init scripts run once,
when the data directory is empty, and never again — which suits creating a database and nothing that
has to be reconciled on every boot.

Nothing database-related needs configuring. `DATABASE_URL` defaults to the compose database, and the
`app_user` connection is _derived_ from it by swapping the credentials (`backend/app/db_url.py`), so
a fresh clone runs migrations and the full test suite with no `.env` file at all.

---

## Environment variables

Grouped by where the value comes from, because almost nothing is set in two places.

### In `backend/.env`, per machine

Only what nobody can derive for you. Copy `backend/.env.example` as a starting point.

| Variable               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth client.                                                       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret.                                                |
| `ALLOWED_EMAILS`       | Allowlist of emails permitted to log in (the app is invite-only).          |
| `GOOGLE_BOOKS_API_KEY` | Book search. Unkeyed requests share one global quota, so they always fail. |
| `ALLOW_TEST_LOGIN`     | Enables `POST /auth/test-login`, which `seed_dev.py` needs. Never in prod. |

Nothing database-related belongs here, and neither does `SESSION_SECRET` — `compose.yaml` gives
every dev service the known value `local-dev-only`, and CI inherits it by running its checks through
those same services. Keeping it out of `secrets.*` is also what makes Dependabot PRs pass: GitHub
withholds repository secrets from Dependabot-triggered runs, so a workflow reading one got an empty
string and every job that imports the app died on the start-up check.

### In the deployment platform only

Never set these locally — the local default is already correct, and a stale value here is how you
get a container that can't reach its own database.

| Variable                | Required | If it's missing                                                                  |
| ----------------------- | -------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`          | yes      | Falls back to the compose address and fails to connect.                          |
| `APP_DB_PASSWORD`       | yes      | `RuntimeError` at boot, deliberately — never a default off-laptop.               |
| `SESSION_SECRET`        | yes      | `ValueError` at boot.                                                            |
| `GOOGLE_REDIRECT_URI`   | yes      | The derived URI comes out `http://` behind the TLS proxy, and Google rejects it. |
| `FRONTEND_URL`          | yes      | **Silently** redirects users to `localhost:4200` after login.                    |
| `SESSION_COOKIE_SECURE` | yes      | **Silently** allows the session cookie over plain http.                          |

The bottom three fail quietly, which is the reason they're worth listing rather than leaving to be
discovered.

### Overrides that exist but nothing sets

`APP_DATABASE_URL` and `APP_TEST_DATABASE_URL` are honoured if set, but only so the e2e suite can
point its backend at the owner connection until #181 lands. Don't set them anywhere else.

### Deploying somewhere new

Point `DATABASE_URL` at the database and set `APP_DB_PASSWORD` to something random. There is no
setup script to run: the container's start command provisions the role, migrates, and starts the
app, in that order, on every boot. Rotating the password is a matter of changing the variable and
redeploying.

---

## Google OAuth setup

Google OAuth (Authlib, scope `openid email profile`) plus an email allowlist. Every environment uses
the same OAuth client, in the Google Cloud console under **APIs & Services → Credentials**.

### Authorized redirect URIs on the client

| Environment | URI                                       |
| ----------- | ----------------------------------------- |
| Local       | `http://localhost:4200/api/auth/callback` |
| Each deploy | `https://<domain>/api/auth/callback`      |

Google only permits plain `http` for `localhost` / `127.0.0.1`; anything else must be `https`. An
unregistered URI fails with `Error 400: invalid_request` before the sign-in prompt.

The backend derives the redirect URI from the request's `Host` header
(`request.url_for("callback")`) unless `GOOGLE_REDIRECT_URI` is set. That's why
`frontend/proxy.conf.json` keeps `"changeOrigin": false` — with it `true`, the dev server rewrites
`Host` to `api:8000`, which Google refuses.

### Environment variables

| Variable                | Effect                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | The OAuth client.                                                                                 |
| `GOOGLE_CLIENT_SECRET`  | Its secret.                                                                                       |
| `SESSION_SECRET`        | Signs the session cookie. Supplied by `compose.yaml` locally; the app refuses to boot without it. |
| `ALLOWED_EMAILS`        | Comma-separated, compared case-insensitively. An address not on it gets a 403 after sign-in.      |
| `FRONTEND_URL`          | Where `/callback` redirects on success (default `http://localhost:4200`).                         |
| `SESSION_COOKIE_SECURE` | `true` makes the session cookie https-only. Production.                                           |
| `GOOGLE_REDIRECT_URI`   | Pins the redirect URI instead of deriving it. Unset locally; required in deployment.              |
| `ALLOW_TEST_LOGIN`      | `true` enables `POST /api/auth/test-login`, which skips Google. Never in production.              |

### Endpoints

| Route                       | Behaviour                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/login`       | Redirects to Google.                                                                                                                                      |
| `GET /api/auth/callback`    | Requires a Google-verified email, checks the allowlist, gets-or-creates the user, writes the session, redirects to `FRONTEND_URL`.                        |
| `GET /api/auth/me`          | Session identity, or 401.                                                                                                                                 |
| `POST /api/auth/logout`     | Clears the session.                                                                                                                                       |
| `POST /api/auth/test-login` | 404 unless `ALLOW_TEST_LOGIN=true`. Takes a fixed persona — `e2e` (`test-user@example.com`) or `dev` (the owner's address) — never a caller-supplied one. |

The session cookie carries `user_id`, and every RLS-scoped query is filtered by it — so a session
minted before the user row was replaced (as `seed_dev.py` does) returns empty results rather than
failing.

---

## Seeding development data

`backend/scripts/seed_dev.py` populates the dev database by calling the running backend's API. From
`backend/`, with the stack up:

```bash
python -m scripts.seed_dev
```

Run as a module, not as a file: executing it directly puts `scripts/` on `sys.path` instead of
`backend/`, and the import of `db_url` fails.

`DATABASE_URL` and `BASE_URL` both default correctly inside the stack — the database through
`db_url.py`, so it matches what the app and migrations use — and either can still be set to point
the seed somewhere else. It authenticates through `POST /auth/test-login`, so the API needs
`ALLOW_TEST_LOGIN=true`.

That leaves 8 books and 5 engagements — 3 reading, 1 finished, 1 DNF.

> **Log out and back in afterwards.** The script truncates every table, `users` included, then
> re-inserts the account with a **new** id. A browser session opened before the seed still carries
> the old one, and since the app scopes every query by the session's user id under RLS, the result
> is a confusing half-empty app: books still appear (they're user-agnostic, ADR-0002) but nothing is
> in any status. Logging in again rebinds the session to the current row.

---

## Tests

Run these inside the container ([why](#why-the-checks-have-to-run-in-here)):

- **Backend** — from `backend/`:

  ```bash
  pytest
  ```

  Needs the `db` service running, and nothing else configured. The suite provisions the role, resets
  the schema, runs migrations, and truncates between tests against a
  [dedicated test database](decisions/0014-dedicated-test-database.md). It connects as `app_user`,
  so the RLS policies are actually exercised.

- **Frontend** — from `frontend/`:

  ```bash
  npm test
  ```

  This runs `ng test --watch=false` through Angular's build (which sets up the Vitest environment).
  Don't run `vitest` directly — it bypasses that setup.

- **Static checks** — Ruff, mypy (strict), ESLint and Prettier, all through pre-commit:

  ```bash
  pre-commit run --all-files
  ```

- **End-to-end** — not yet runnable in this setup. Moving Playwright into containers is #181; until
  then the e2e suite is CI's.

---

## CI runs the same image

The backend and frontend workflows install nothing on the runner. They `docker compose build` the
dev image and run every check through it — `docker compose run --rm api ruff check .`,
`docker compose run --rm frontend npm test`, and so on — against the same `db` service used locally.
A green run therefore means the toolchain you develop with agreed, not a similar one.

They use the `api` and `frontend` services rather than `workspace`, because `workspace` mounts
personal config from `$HOME`, and a bind mount pointing at a path that doesn't exist silently
creates an empty directory rather than failing.

The e2e workflow is the exception: it still installs Python, Node and browsers on the runner, and
uses the containerized database only. That's #181.

---

## How it fits together locally

```
                    Docker
   ┌──────────────────────────────────────────────────────┐
   │  frontend :4200 ──/api proxy──▶ api :8000            │
   │       (ng serve)                 (uvicorn)           │
   │                                     │ app_user       │
   │                                     ▼                │
   │                                  db :5432            │
   │                                                      │
   │  workspace — tests, git, pre-commit, Claude Code     │
   └──────────────────────────────────────────────────────┘
        │                    ▲
   localhost:4200      repo bind-mounted at its host path
```

The frontend proxy targets `http://api:8000` — the compose service name — so it resolves on the
compose network and nowhere else.

For the bigger picture — the request path, the RLS boundary, the data model — see the
[architecture overview](architecture.md).
