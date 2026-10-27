---
name: run-reading-tracker
description:
  Run, drive and screenshot the reading tracker app. Use when asked to start the app, open it, look
  at it, screenshot a page, or confirm a change works in the real app rather than in tests.
---

The agent runs inside the `workspace` container. The app is served at `http://proxy:8080` when the
Compose app services are running, but the agent cannot start those services from inside the
container. Drive it with `npx playwright cli`, which attaches to the browser in the `browsers`
service.

Every `playwright cli` command runs from `e2e/`. That is where `npx playwright` resolves — repo root
has no `node_modules`, so running it there would fetch a package. Seeding, when authorized, runs
from `backend/`.

## Prerequisites

**None. Install nothing.** No `playwright install`, no `install-deps`, no `apt-get`, no `npm i -g`.
Browser binaries live in the `browsers` service and nowhere else, deliberately, so they stay out of
`Dockerfile.dev` (see the comment on `browsers` in `compose.yaml`). A missing browser means you are
in the wrong container, never that a package is missing.

The workspace container being available does not prove the app services or Storybook are running.
Try the requested attach or navigation once. If a service is unavailable, report the failing command
and error; do not install packages or retry through another harness.

## Optional seeded fixtures

Use the development data already present for inspection and screenshots. Those requests do not
authorize replacing it.

When the user explicitly requests seeded fixtures, or an authorized calling workflow requires the
canonical fixture set, run this from `backend/`:

```bash
python -m scripts.seed_dev
```

It truncates every application table and recreates the development user with a **new id**, so seed
before logging in. Do not run it speculatively.

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

`persona: "dev"` owns the data `seed_dev.py` creates. `persona: "e2e"` owns test-worker personal
data. E2E runs reset that data and remove E2E-owned catalog records without removing the development
user's data.

`/` is the **guest** landing — an authenticated user sees nothing there. Go straight to a real
route: `/home`, `/library/catalog`, `/library/tbr`, `/library/finished`, `/library/dnf`,
`/books/:bookId`, `/reads/:engagementId`, `/insights`, `/challenges`.

### Storybook

Storybook is a separately started Compose service, not part of the standing stack. When available at
`http://storybook:6006`, it uses the same harness and is often the faster way to investigate a
component. → `references/storybook.md`

## Run (human path)

`http://localhost:8080` in a browser on the Mac. `localhost` works there and only there. When its
separate service is running, Storybook is at `http://localhost:6006`.

## Verification

Browser inspection verifies the behavior the user asked to see. Run automated checks only when the
task calls for them, using `docs/agents/commands.md`; the working tree does not establish that any
suite passes.

Chromium is the focused E2E default. Use another configured project when the behavior is browser- or
viewport-specific, or when the user requests broader coverage.

Codex receives the commands' normal output. **Claude only:** its `PreToolUse` guardrail rewrites
test commands and reports results differently; follow `.claude/hooks/test-command.md`.

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
- **Writing e2e tests is a different job** with harder rules: `.agents/skills/playwright-new-test/`.

## Troubleshooting

Symptom → fix, every entry an error actually hit → `references/troubleshooting.md`
