---
name: run-reading-tracker
description:
  Run, drive and screenshot the reading tracker app. Use when asked to start the app, open it, look
  at it, screenshot a page, or confirm a change works in the real app rather than in tests.
---

The app already runs — `docker compose up` serves it at `http://proxy:8080`. There is nothing to
build, install or start. You drive it with `npx playwright cli`, which attaches to the browser in
the `browsers` service; that is the harness, and the commands below are the whole of it.

Every `playwright cli` command runs from `e2e/`. That is where `npx playwright` resolves — repo root
has no `node_modules`, so running it there would fetch a package. (Setup and Test run from
`backend/` and `frontend/`; they say so.)

## Prerequisites

**None. Install nothing.** No `playwright install`, no `install-deps`, no `apt-get`, no `npm i -g`.
Browser binaries live in the `browsers` service and nowhere else, deliberately, so they stay out of
`Dockerfile.dev` (see the comment on `browsers` in `compose.yaml`). A missing browser means you are
in the wrong container, never that a package is missing.

**Assume the stack is up.** It is kept running for interactive work, and Claude Code itself runs
inside it. Do not probe it first; just attach.

## Setup

An empty app tells you nothing. From `backend/`:

```bash
python -m scripts.seed_dev
```

Prints `Done. 8 books seeded.` It truncates every table and recreates the user with a **new id**, so
seed _first_ and log in _after_. The dev database is disposable.

## Run (agent path)

```bash
npx playwright cli attach --endpoint "ws://browsers:5000/?browser=chromium"
npx playwright cli --s=default goto http://proxy:8080/
npx playwright cli --s=default eval "async () => (await fetch('/api/auth/test-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persona:'dev'})})).status"
npx playwright cli --s=default goto http://proxy:8080/home
```

Then drive it. `find` is the fastest way to a ref; `snapshot` dumps the whole accessibility tree:

```bash
npx playwright cli --s=default find "Mark Infinite Jest as reading"
npx playwright cli --s=default click f1e124
npx playwright cli --s=default eval "() => document.body.innerText.slice(0,300)"
npx playwright cli --s=default console error
npx playwright cli --s=default screenshot
```

Refs (`f1e124`) are only valid for the snapshot that produced them — re-`find` after the page
changes. Full command list: `npx playwright cli --help`.

Tear down, or you leave a browser running in another container:

```bash
npx playwright cli --s=default close
npx playwright cli list
```

Expect `(no browsers)`.

### Personas and routes

`persona: "dev"` owns the data `seed_dev.py` creates. `persona: "e2e"` owns the suite's data, which
every e2e run truncates.

`/` is the **guest** landing — an authenticated user sees nothing there. Go straight to a real
route: `/home`, `/library/catalog`, `/library/tbr`, `/library/finished`, `/library/dnf`,
`/books/:bookId`, `/reads/:engagementId`, `/insights`, `/challenges`.

### Storybook

Up at `http://storybook:6006`, same harness, and often the faster way to investigate a component —
no login, no seeding, no route to reach. → `references/storybook.md`

## Run (human path)

`http://localhost:8080` in a browser on the Mac. `localhost` works there and only there. Storybook
is at `http://localhost:6006`.

## Test

```bash
cd backend && pytest
cd frontend && npm test
cd frontend && npm run test:storybook
cd e2e && npm test -- --project=chromium --reporter=dot
```

All four pass on a clean tree. **Only ever run e2e on chromium** — a bare `npm test` also runs
`firefox` and `mobile`, for no information an agent can act on.

**`exit=0` means the suite PASSED.** On failure you get
`FAILED. The full output is in /tmp/test.log. Read that file. Do NOT re-run the suite.` — read the
log, do not re-run. Both come from a hook that rewrites every test command. →
`references/testing.md`

**An e2e run truncates the dev database before every test.** Reseed afterwards.

## Gotchas

- **`?browser=chromium` is mandatory on the endpoint.** `playwright run-server` has no default
  browser type; without it the attach dies with
  `Cannot read properties of undefined (reading 'launch')`, which looks like a broken endpoint and
  is not one.
- **Never use `localhost` from in here.** You are in a container; `localhost` is you. Everything is
  a compose service name: `proxy:8080`, `api:8000`, `browsers:5000`, `storybook:6006`.
- **The first `find`/`snapshot` after a `goto` lies.** The app renders `Loading…` while data is in
  flight, so you get `No matches found` for something plainly on the page. Run it again. Never add a
  sleep.
- **A click can navigate.** Marking a book as reading opens a format dialog, and choosing a format
  redirects to `/home`. Check the reported Page URL after acting.
- **`docker` is blocked by a hook, not merely absent.** Do not look for a way around it.
- **Do not write a script to drive the app.** A hook blocks creating and executing shell scripts,
  and the harness above is the whole interface. A one-off script that launches its own browser is
  how this goes wrong — it ends in `chromium.launch()` failing, and then in installing system
  packages, which is forbidden.
- **Writing e2e tests is a different job** with harder rules: `.claude/skills/playwright-new-test/`.

## Troubleshooting

Symptom → fix, every entry an error actually hit → `references/troubleshooting.md`
