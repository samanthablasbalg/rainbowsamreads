---
name: playwright-new-test
description:
  Author a new, verified Playwright end-to-end test from a github issue, a markdown test plan, or a
  plain-English description. Triages whether the request is really an e2e (Playwright) concern
  before writing anything. Use when the user asks to write, create, or add a Playwright or e2e test.
when_to_use:
  Auto-invoke when the user says "write a Playwright test", "add an e2e test", "create a test for
  <feature>", "test that <behavior>", or points at a issue/plan and asks for an e2e test.
allowed-tools:
  Bash(npx playwright test:*), Bash(npx playwright cli:*), Bash(npm test:*), Bash(python -m
  scripts.seed_dev)
---

# Author a new Playwright e2e test

Turn a GitHub issue, a markdown test plan, or a plain-English description into one working, verified
Playwright test for the reading tracker app.

## How this skill works (read first)

- **NEVER touch the backend with raw HTTP. No `curl`, `wget`, `fetch`, `httpie`, or any hand-rolled
  request — in ANY step, for ANY reason.** Spec data setup goes through `ApiClient` only (Step 5),
  and `ApiClient` exists _only_ inside a test's fixture context — it is NOT available while driving.
  While driving, the data you get is what the run skill's Setup step seeded and nothing else —
  `snapshot` and look at what's there. Do not add data through the app's own UI either: adding a
  book calls the live Google Books API. If the scenario genuinely needs something the seed doesn't
  have, STOP and ask the user. Reaching around the harness with `curl` is the single most forbidden
  move in this skill.
- **NEVER manipulate a database out-of-band.** No `alembic stamp` / `alembic downgrade`, no raw
  `psql`/SQL DDL (`ALTER` / `DROP` / `CREATE` / `ADD COLUMN`), no hand-editing of `alembic_version`
  or the schema — against ANY database. The schema is owned entirely by the `api` service, which
  runs `python -m app.provision && alembic upgrade head` before it reports healthy; reaching around
  it is exactly what corrupted this database once before — a `stamp`ed-but-never-applied migration
  that read as "up to date" while the column was missing, and it cost a full session to diagnose. If
  the schema looks wrong, the fix is a migration and a restart of `api` — never a manual command.
  Read-only inspection (`\d`, `SELECT`) is fine; mutation never is.
- **The user's live instructions ALWAYS override this procedure.** If they say stop / hold / wait /
  don't, you halt ALL tool use immediately — no "but this next step is fine," no carve-outs, no
  finishing the action you'd already decided on. This skill's "don't over-ask" guidance below is
  about not pestering for permission to _write the test_; it is never license to ignore a direct
  command. When in doubt, you have already taken too many actions — stop and read.
- **You run in the main conversation loop.** Do NOT spawn sub-agents — the user needs to see
  progress and step in. Work the steps yourself, in order.
- **The browser harness is the `run-reading-tracker` skill — load it, don't reconstruct it.**
  `.claude/skills/run-reading-tracker/` owns every browser command used here: seeding, attaching,
  logging in, driving, tearing down. It is the only sanctioned way to reach the app, and its gotchas
  (the mandatory `?browser=chromium`, service names not `localhost`, the first `find` after a `goto`
  lying) are the failures you will otherwise hit and misdiagnose. Do not improvise a
  `playwright cli` invocation from memory or from this file — a command with no attached session
  fails in a way that reads as a broken endpoint, and the recovery attempts from there (installing
  browsers, `curl`, driving scripts) are all forbidden.
- **The live snapshot is the source of truth for locators.** React source is a _hint_.
- **Conventions are auto-loaded** from `.claude/rules/playwright-e2e.md` (it loads whenever you
  touch `e2e/**`). This file is the _procedure_; that rule is the _standards_ — follow both, and
  don't restate the rule's contents here.
- **Always tear down when you are done driving** — the run skill's Tear down step, and confirm it
  reports `(no browsers)`. Skipping it leaves a browser running in another container.
- **Stop and ask — don't spin.** If the _environment_ is broken — the app is a blank screen or won't
  boot — STOP immediately and tell the user exactly what you saw. Do NOT re-attach, re-snapshot,
  retry, or keep driving. A broken app is the user's to fix, not yours to work around; spinning on
  it wastes their time and yours.

## Step 0 — Triage the test type

Decide whether this is actually a Playwright e2e concern before writing anything:

- **Playwright (this skill):** real-browser user journeys, navigation, auth-gated flows,
  cross-component behavior, anything needing a rendered DOM + backend.
- **Vitest** (`@testing-library/react` + `vitest`): pure logic, hooks, utils, a single component's
  behavior in isolation. Faster and closer to the code.

If the request is better served by Vitest, **say so and recommend that instead** — proceed as e2e
only once the user confirms, or when it's clearly a browser-level journey.

## Step 1 — Gather requirements

Resolve the input into a concrete scenario:

- **GitHub issue** (e.g. `#89`): obtain the ticket's summary, description, and acceptance criteria.
- **Markdown plan**: a file path (anywhere) or pasted inline.
- **Plain description**: use it directly.

Pin down — and **stop and ask** if unclear: the feature area and specific user-visible behavior;
preconditions (assume authenticated + fresh app shell); any artifacts needing cleanup. If the input
is too vague to build a scenario, clarify inline.

<!-- FUTURE: when the `playwright-plan` skill exists, offer to route there first to
     produce a plan, then come back here to generate. -->

## Step 2 — Orient (do NOT scan the whole suite)

- The conventions rule auto-loads when you read `e2e/` files; follow it.
- Read the relevant React component(s) — feature code lives at
  `frontend/src/features/<feature>/components/`, shared pieces at `frontend/src/components/common/`
  and the primitives at `frontend/src/components/ui/` — to understand the feature and draft
  **candidate** locators. Flag dynamic / Base UI (dialog, drawer, dropdown-menu) / icon-only
  elements — those need live confirmation. If a flagged element clearly has **no usable hook** in
  source (icon-only button with no `aria-label`, a detached `<label>`), do the Step 4 a11y fix
  **now, before driving** — so the snapshot already carries the hook and you derive the real locator
  in one pass instead of snapshot → find nothing → fix → re-snapshot.
- Open an existing Page Object **only if one already exists for this feature** (to extend it). Don't
  read unrelated tests/POMs.

### Vitest triage — mandatory before driving

**Read the Vitest spec for the feature** if it exists — they are colocated with the component
(`frontend/src/features/<feature>/components/<name>.spec.tsx`). Then produce a written triage — do
not skip this, do not abbreviate it:

1. List every scenario the Vitest spec already covers (one line each).
2. For each scenario you are considering as an e2e test, answer: **"What does this test that Vitest
   cannot?"** Valid answers are narrow:
   - Real cross-component navigation (a router transition that spans two mounted components)
   - Real backend contract (the frontend's request shape actually reaches and is accepted by the
     live backend, and the response is correctly rendered — not just that a mutation hook fired
     against an MSW handler)
   - Real browser behaviour JSDOM cannot replicate (file choosers, clipboard, resize observers,
     etc.)
3. **Always keep one happy-path round-trip per major user action,** even when Vitest covers the same
   scenario. A Vitest test that mocks the HTTP response proves the component wires up correctly; it
   does not prove the frontend request shape actually reaches and is accepted by the real backend,
   or that the real response renders correctly. One e2e test per action closes that gap.
4. **Drop any scenario beyond the happy path where Vitest already covers it.** A Vitest test that
   mocks a 409 and verifies the error message is displayed already covers the error path. An e2e
   test that does the same thing with a real backend adds almost nothing — the backend has its own
   pytest suite. Do not write it.

**The bar for an e2e scenario is:** something goes wrong in the integration that neither Vitest
(which mocks HTTP) nor pytest (which has no browser) would catch. Navigation flows, cross-component
data hand-offs, one happy-path round-trip per major action, and end-to-end rendering of real backend
data are the target. Duplicate error-display tests, input-validation tests, and UI state-machine
tests almost never meet the bar when a Vitest spec already exists.

> **HARD GATE — no code, no plan, no confirmation request.** After Step 2 (including the Vitest
> triage) your next action is driving the live app (Step 3). Do not write POM or spec code. Do not
> present a plan and ask the user to confirm it. The user invoking this skill is already the
> confirmation. Candidate locators from source are unconfirmed until a live
> `playwright cli snapshot` validates them — writing tests from source locators is the mistake this
> gate exists to prevent. The Vitest triage is the other mistake this gate exists to prevent.

## Step 3 — Drive the live app

**Load `.claude/skills/run-reading-tracker/` and follow it.** It is the harness — Setup (seed), Run
(attach, log in, `goto` a real route), the driving commands, Gotchas, and Tear down. Do not
reconstruct any of it from memory, and do not use a command this file quotes without the run skill's
surrounding steps.

Two things that skill leaves to the caller, because they are this skill's job:

- **Seed before you attach, and drive as the `dev` persona.** `python -m scripts.seed_dev` from
  `backend/` gives you 8 books to work against; it truncates and recreates the user with a new id,
  so it must run _before_ the login call. An unseeded app is an empty app and you will derive
  locators for a page that never renders.
- **Capture locators as you go.** Every action the CLI performs echoes Playwright TypeScript — that
  emitted code is what goes into the Page Object. `--raw generate-locator <ref>` gives the robust
  form for a single element. Confirm **every** candidate locator from Step 2 against a live
  `snapshot` before it goes anywhere near a file.

Then tear down. Leaving a browser attached is a mess in another container, and the run skill's final
`list` is how you know you actually did it.

## Step 4 — Improve a11y when a locator is weak

Timing: **fix first when the gap is already visible from source (before Step 3)** — see Step 2 — so
the snapshot has the hook; fix **reactively** if you only discover the gap while driving. Either
way: if an element can't be located robustly, **fix the React source semantically** (proper `role`,
`<label for>`, or `aria-label`) rather than shipping a brittle locator. Keep edits minimal and
matching the component's style. (The rule covers what's allowed; e.g. no `data-testid`.)

## Step 5 — Build / extend the Page Object, then write the spec

Both follow the auto-loaded conventions rule — don't restate its rules here. Skill-specific
mechanics:

- **POM** at `e2e/page-objects/<feature>.page.ts`: the role-based locators the CLI emitted become
  `readonly Locator` props; add action/verification methods. Extend an existing POM if one fits.
  (Conventions are in the auto-loaded rule; existing POMs under `e2e/page-objects/` are the model.)
- **Spec** at `e2e/tests/<feature>/<name>.spec.ts`: import `test`/`expect` from the `fixtures/` tree
  (never `@playwright/test` directly), plus the POM. Group steps by test phase — setup → exercise →
  verify, each step titled for what it does (see the rule's Structure section). All element access
  through the POM.

## Step 6 — Run & fix (bounded)

```bash
npm test -- tests/<feature>/<name>.spec.ts --reporter=dot
```

Up to **3 fix-and-rerun cycles**. **Timeouts are almost never the real problem** — if it times out,
the element probably isn't appearing at all; fix the **locator in the POM** (re-derive from a fresh
snapshot, going back through Step 3) or improve source a11y (Step 4) rather than extending timeouts.

**Going back to Step 3 after a test run means seeding again.** The suite truncates the database
before every test, so the `dev` data you drove against in Step 3 is gone once you have run a spec.

**Stop and ask the user** if: the 3 cycles are exhausted; you can't find a working locator; you're
unsure whether the behavior is a bug; or you're guessing rather than working from
snapshot/console/network evidence. State what you tried, what failed, what would unblock you.

## Step 7 — Validate

1. Green run: `npm test -- tests/<feature>/<name>.spec.ts --reporter=dot`
2. Stability: same command + `--repeat-each=10` — any failure means flaky = **not done**.
3. **Quality gate:** the test is not done if it breaks any item in the `## Quality gate` of
   `.claude/rules/playwright-e2e.md`. Check it against that list (don't rely on memory).
4. Format: `npm run format` (also enforced on commit via husky/lint-staged).

Confirm the browser is torn down — `npx playwright cli list` reports `(no browsers)` — then
summarize what you created (POM + spec) and the validation results.
