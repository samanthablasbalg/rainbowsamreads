# 0030. E2E runs against the compose dev stack

- Status: Accepted
- Date: 2026-07-28

Supersedes [[0018-e2e-testing-database-strategy]].

## Context

[[0018-e2e-testing-database-strategy]] gave Playwright its own everything: a dedicated
`reading_tracker_e2e` database addressed by `E2E_DATABASE_URL`, a `db setup` project that created
and migrated it, `webServer` entries that started a bare `uvicorn` on `:8001` and an `ng serve` on
`:4201`, and per-test truncation. Two forces shaped it — protecting the dev database from a repeat
of [[0014-dedicated-test-database]]'s teardown bug, and coexisting with a dev stack already on
`:8000`/`:4200`.

Both forces have since expired, and one of them was quietly doing harm.

- **[[0028-development-happens-in-a-container]] made e2e the last holdout.** Backend and frontend CI
  build the dev image and run every check through `docker compose run --rm`. The e2e workflow was
  the only one still installing Python, Node and `--with-deps` browsers onto the GitHub runner.
- **Dev data stopped being precious.** [[0027-database-provisioning-by-lifetime]] made databases
  disposable and `scripts/seed_dev.py` restores a working dev database in seconds. Protecting it was
  0018's load-bearing justification, and it is not wanted.
- **The suite was the one place RLS did not apply.** `configured_app_database_url()` carried an
  `APP_DATABASE_URL` override whose entire purpose was letting the e2e backend connect as the owner
  role. Meanwhile the compose `api` service sets neither variable and so already derives the
  restricted `app_user` connection. RLS was live in dev, live in pytest, and off in the browser
  suite that [[0023-per-user-data-isolation-via-rls]] most wanted it exercised by.
- **`webServer` made Playwright a process supervisor**, and that bare `uvicorn` skipped the
  container start command — which is why `db.setup.ts` reimplemented provisioning in TypeScript
  through `execSync`.

## Decision

**The suite runs against the compose dev stack, in containers, and owns no processes of its own.**

1. **One database.** `reading_tracker_e2e` and `E2E_DATABASE_URL` are gone; the suite runs against
   `reading_tracker`. The truncate fixture keeps its own owner connection, hardcoded rather than
   configured — that string is correct from inside any container on the compose network, and it
   connects as `postgres` rather than `app_user` because truncating is exactly what RLS exists to
   stop.

2. **Compose supervises; `webServer` is deleted.** The `api` service already runs
   `provision → alembic upgrade head → uvicorn` before it reports healthy, so `db.setup.ts` had
   nothing left to do and is gone with it. The suite waits through `depends_on` and healthchecks
   instead of polling a URL.

3. **RLS is live.** The `APP_DATABASE_URL` override is deleted from both `playwright.config.ts` and
   `db_url.py`. The app the browser drives connects as the restricted `app_user`, the same way
   production does.

4. **Browsers live in their own service and are driven over the wire.** `browsers` runs
   `playwright run-server` from `mcr.microsoft.com/playwright:v1.62.0-noble`, and
   `playwright.config.ts` sets `connectOptions: { wsEndpoint: 'ws://browsers:5000/' }`. Nothing else
   in the repo carries a browser binary. This is the load-bearing split: `Dockerfile.dev` is built
   by the api and frontend CI jobs on every run, and it is also what lets a test process inside
   `workspace` reach the full browser matrix with no Docker socket.

5. **`baseURL` is the proxy** ([[0029-single-origin-via-a-reverse-proxy]]), so the suite addresses
   the app exactly the way a person does, with the same string in every environment.

6. **CI is `docker compose build` + `docker compose run --rm e2e`**, matching `backend.yml` and
   `frontend.yml`. Nothing installs on the runner.

## Consequences

**Makes easy:**

- **e2e stops being the exception.** Every workflow now runs the same image against the same
  services, so a green e2e run means what a green backend run already meant.
- **RLS is exercised by the suite rather than dodged by it**, which was an acceptance criterion of
  the work and turned out to cost nothing once `webServer` was gone.
- **No ports and no `localhost` anywhere in the suite.** Every address is a compose service name,
  which resolves identically from `workspace`, from `e2e`, and on a runner.
- **The dev image stays free of browsers**, so the jobs that rebuild it constantly do not pay for
  them.

**What we accept:**

- **An e2e run wipes the dev database.** Per-test truncation now points at `reading_tracker`.
  Deliberate, and `python -m scripts.seed_dev` puts it back — but it is a real behaviour change and
  it happens silently.
- **`e2e/node_modules` needs one manual `npm ci`.** It is a named volume that starts empty, and
  `docker compose run` replaces a service's `command:`, so the first-boot install guard the
  `frontend` service uses cannot work here. `workspace` mounts the same volume, so locally it is
  `cd e2e && npm ci` like any other install; CI does it as its own `run` step. Skipping it presents
  as a broken container (`playwright: command not found`) rather than as an empty volume.
- **The test process and the browser are on different machines.** `request` and `ApiClient` are HTTP
  clients in the test process; `page` and `page.request` run in the remote browser and resolve
  `baseURL` from there. Anything written as `localhost` would mean two different things. Nothing
  currently is — but this is the trap a future edit falls into.
- **Two versions must stay in lockstep**: `@playwright/test` in `e2e/package.json` and the
  `browsers` image tag. Playwright refuses to connect across a mismatch. The npm version is an exact
  pin rather than a caret range for this reason, but nothing mechanically enforces the pair, so a
  Dependabot bump of one will break CI in a way that looks unrelated to the PR that triggered it.
- **The authoring bridge leans on an internal escape hatch.** `PWTEST_SOCKETS_DIR` relocates the
  Unix socket `playwright cli attach` connects to, so a named volume can carry it between
  containers. The `PWTEST_` prefix is upstream's marker for "may move without notice". Accepted
  because nothing in the suite or CI reads it: the worst a version bump can do is break test
  authoring until the paths are found again.
- **Still `workers: 1`.** The truncate fixture is unchanged and remains unsafe in parallel. #65.
- **Test authoring is currently broken.** The seed spec the `--debug=cli` loop pauses in was deleted
  here and not rebuilt. #190.

## Alternatives considered

- **Keep the dedicated e2e database.** 0018's core, justified by protecting dev data. Rejected
  because that protection is not wanted, and it costs a third database to migrate and reason about
  plus every variable and setup project that addressed it.
- **Run the suite against the production image.** Genuinely attractive — a real AOT build and the
  real boot entrypoint. Its strongest argument was RLS, and that turned out to be available from the
  dev stack for free (decision 3), which left a much weaker case against a full Angular production
  build on every local run. Parked: adding it later is a compose override file and one variable, not
  a rewrite.
- **Put browsers in `Dockerfile.dev`.** The simplest option, and what the ticket originally assumed.
  Rejected because the api and frontend CI jobs build that image on every run, so roughly a gigabyte
  of browsers and system libraries would be paid by jobs that never launch one.
- **Mount `/var/run/docker.sock` into `workspace`** so an agent could `docker compose exec` into a
  browser container. Rejected: the socket is root-equivalent on the host by design, and prefix
  permission rules match literal command strings — a UX guardrail, not a sandbox. Network-only
  options existed.
- **Playwright's MCP server** instead of the CLI for browser driving. Rejected on cost: MCP returns
  a page snapshot per tool call, so context grows with every step. Recorded so it is not
  rediscovered.

## Revisit when

- **#65 makes the suite parallel.** The truncate fixture and the `workers: 1` pin both go, and RLS
  stops being merely exercised and becomes load-bearing for test correctness — a broken policy would
  then surface as cross-worker bleed into assertions rather than passing silently. (This closes
  0018's own "revisit when #65 enables parallel execution".)
- **The immutable-catalog trade starts hurting.** #65 chose a fixed, read-only catalog over
  start-clean-and-create because at 25 tests the maintenance is cheap. That is a deliberate trade at
  the current suite size, and create-and-delete is the expected successor.
- **#190 rebuilds the authoring seed**, which is what makes the `PWTEST_SOCKETS_DIR` bridge above
  worth keeping.
- **A Dependabot bump breaks CI on a browser version mismatch.** That is the signal the npm/image
  lockstep needs a mechanical guard rather than a convention.
