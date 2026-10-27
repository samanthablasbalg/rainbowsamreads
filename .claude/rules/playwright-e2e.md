---
paths:
  - 'e2e/**'
---

# Playwright e2e conventions

The standards for writing and editing Playwright e2e tests in `e2e/`. Follow this file over any
external Playwright-docs default.

## Layout

- `e2e/tests/<feature>/<name>.spec.ts` — the tests ("specs"), grouped in a folder per feature.
- `e2e/page-objects/<feature>.page.ts` — Page Objects, kept in one tree (POMs are reused across
  features, so they're not buried inside feature folders).
- `e2e/fixtures/<purpose>.ts` — fixtures, one file per purpose, named for what it sets up. They
  compose into the single `test`/`expect` that specs import: **chain to compose** (each file
  `.extend`s the previous test, not `@playwright/test`), **depend to order** (a fixture runs after
  another by destructuring it).
- `e2e/api/api-client.ts` — `ApiClient` for creating personal test state.
- `e2e/catalog/e2e-catalog.ts` — the immutable shared catalog installed for each Playwright run.

## Where the suite runs

The suite owns no processes. `compose.yaml` runs the app, and the test process joins the network
([ADR-0030](../../docs/decisions/0030-e2e-runs-against-the-compose-dev-stack.md)). Three
consequences shape how specs are written:

- **One origin, by service name.** `baseURL` is `http://proxy:8080`, and `ApiClient` uses relative
  `/api/...` paths against it. Never write `localhost` — the test process and the browser are
  different containers, so it would mean two different machines.
- **Browsers are remote.** They run in the `browsers` service, reached over `connectOptions`. `page`
  and `page.request` execute there; `request` and `ApiClient` execute in the test process.
- **One database, and the app connects as `app_user`.** RLS is live under the suite, the same as
  production. The schema is already provisioned and migrated by the `api` service before it reports
  healthy, so nothing in `e2e/` sets a database up.

## Auth & isolation

Every route is login-gated (Google OAuth). Each Playwright worker logs in once through the env-gated
`POST /api/auth/test-login` bypass (`ALLOW_TEST_LOGIN=true`, set on the `api` service). The
worker-scoped fixture passes `parallelIndex` in the bounded `0..15` range and supplies the returned
storage state to its tests. A restarted worker therefore keeps the same identity. The route derives
the worker's fixed email internally; it never accepts a caller-supplied address.

Specs import `test`/`expect` from the `fixtures/` chain — never `@playwright/test` directly. Setup
and teardown project files are the exception because they run outside the ordinary fixture chain.

- **Personal state:** an automatic fixture deletes only the current worker user's rows before each
  test, in one transaction. It leaves every other worker and the development user untouched.
- **Shared catalog:** the `catalog setup` project installs deterministic E2E books, authors, and
  editions once. Ordinary specs read records from `E2E_CATALOG` and create only engagements, logs,
  reviews, and other personal state. The teardown project removes only the E2E-owned catalog rows
  and test-user state; a local run leaves development data intact.
- **Shared catalog writes:** a test whose behavior is creating or deleting catalog data uses the
  `catalogWriter` fixture. It supplies a unique title/author/external ID and performs targeted
  cleanup after the test. Ordinary specs do not call `ApiClient.createBook()`.
- **Personal setup:** use `ApiClient`, built from the `request` fixture. Name `test.step()` phases
  for the state they create, such as `Start Piranesi` or `Log progress`.

## Running

Run these from `e2e/`.

- Run a focused spec with the dot reporter:
  `npm test -- tests/<feature>/<name>.spec.ts --project=chromium --reporter=dot`. The repo's default
  reporter is `html`; always pass `--reporter=dot` for a readable run.
- **Pass `--project=chromium` for the focused development loop.** Run another configured project
  when the task is browser- or viewport-specific, or when the user requests broader coverage.
- Local runs default to four workers and CI runs to two. Set `E2E_WORKERS=1..16` only when a task
  specifically needs a different concurrency level.
- **`exit=0` means the suite PASSED.** A hook rewrites every test command, so a bare exit code is
  the whole result — it is not "no output". On failure the hook prints the unique log path for that
  run; read that file instead of re-running the suite.
- Flakiness check: `--repeat-each=10`. Any failure = flaky = not done.
- If `playwright` isn't found, `e2e/node_modules` is an empty volume — run `npm ci`.

## Quality gate

Every item below is a hard requirement. A spec or POM that breaks any of them is **not done** — it
is exactly what a review should catch (with `file:line`).

### Test code is NOT source code

Think like a test author, not an app developer. A test produces one clear pass/fail signal; every
line is setup, action, or assertion. Production-code habits are anti-patterns:

- **No control flow _inside_ a test body** — no loops, `if`/branches, `switch`, or flow-control
  ternaries within the `test()` callback. A single test exercises ONE concrete path. (A `for` loop
  _around_ `test()` to generate parameterized/data-driven tests is fine — that's Playwright's
  pattern; the rule is about control flow _within_ a test.)
- **No `try/catch` or `try/finally` in a test** — let failures throw. Cleanup lives in `afterEach`
  (which _may_ use try/catch so a cleanup failure doesn't mask the result — the one place it's
  allowed).
- **No defensive parsing or graceful recovery** — don't guard against malformed responses, missing
  tokens, or bad state. Fail loudly so the signal is real.
- **No redundant guards** — don't re-check a schema the `api` service already migrated; don't
  `waitFor` before a click (Playwright auto-waits).
- **No wrapper indirection or `unknown`-type juggling** — no one-off helper abstractions, no
  branching on response shape.
- If you're adding a safety net, you're solving the wrong problem. Trust the framework (auto-waits,
  fixture cleanup, timeouts) and the setup (provisioned schema, isolated worker state).

### Locators

- All element access in a spec goes through a Page Object — never `page.getByX()` or
  `page.locator()` in a spec.
- Use user-facing locators, in order: `getByRole(name)` → `getByLabel` → `getByPlaceholder` →
  `getByText` → scoped CSS (last resort only).
- No `data-testid`.
- No `.first()` / `.nth()` / `.last()` — scope the locator to be unique instead.
- No `.or()` chains. Target the interactive element itself, not a nested icon/SVG.
- No `xpath=`, and don't chain `locator()` by DOM-structure depth (parent hops, `..`) — scope to a
  unique, stable container instead.
- When no good locator exists, fix the **source** semantically (`role`, `<label for>`, `aria-label`)
  rather than shipping a brittle locator.

### Page objects

- No assertions (`expect`) inside a Page Object — POMs expose locators/values; specs assert.
- Reuse existing navigation; don't duplicate a `goto()` a POM already provides.
- Parameterless element accessors are `readonly Locator` properties built in the constructor, not
  methods; parameterized ones are methods.
- **Every POM method begins with a verb** — actions (`sendMessage`) and locator-returning getters
  alike (`getRowFor(name)`, never `rowFor(name)`).
- No private members — a POM is a simple public-API class.

### Structure & waiting

- **~5–8 tests per spec file (10 absolute max).** When a file reaches ~8, find a sensible seam (a
  sub-feature) and **propose a split** to the user rather than piling on; a spec over 10 tests is
  too big.
- No `describe` block unless the file genuinely needs more than one setup.
- **Every action lives in a `test.step()`** — setup included (personal state via `ApiClient`, route
  stubs, navigation). Loose actions at the top of the test body don't appear in the report; a reader
  should see the test's phases — setup → exercise → verify — from the step list alone.
- **Verification is its own step**, titled for what it checks, so the verify phase is visible. The
  one exception: an assertion that _gates a precondition_ (confirming a setup action took effect
  before the test proceeds) rides inside that setup/exercise step instead of standing alone.
- No `page.waitForTimeout()` and no `networkidle` — use `toBeVisible` / `toHaveURL` /
  `waitForResponse` / `domcontentloaded`.
- **Wait for a modal to be gone before asserting anything about the page behind it.** While a Base
  UI dialog or drawer is open, the rest of the page is `aria-hidden`, so a role-based absence
  assertion (`toHaveCount(0)`, `not.toBeVisible`) passes **whether or not the action ran** — and the
  test then races past the request that action fires. Gate on the sheet's root locator inside the
  step that dismisses it: `await expect(sheet.sheet).toHaveCount(0);`. Every sheet POM exposes that
  root (`ConfirmSheetPage.sheet`, `ProgressLogSheetPage.sheet`). This is not hypothetical: it once
  made a finish-from-the-menu test pass while no PATCH was ever sent.
- Don't hardcode timeouts; rely on Playwright's auto-waiting and 30s default. Only set an explicit
  timeout when it genuinely differs from the default. (No shared `TIMEOUTS` constant yet — add one
  if real values start to accumulate.)
- Personal-row cleanup belongs to the automatic reset fixture. Shared catalog writes use
  `catalogWriter`'s targeted cleanup. Cleanup that genuinely outlives the database, such as files,
  goes in `afterEach`.
- Tests are independent: no reliance on execution order, no shared mutable state — each must pass
  alone and under `--repeat-each`.
- Ordinary specs use the fixed records in `E2E_CATALOG`. Tests that intentionally write shared
  catalog data get every unique identifier from `catalogWriter`.

### Code quality

- No comments in **test code** — specs self-document via `test.step()` titles; only
  `// eslint-disable-*` is allowed. (POMs, fixtures, and helpers may keep concise _why_-comments.)
- No `test.only`, no `console.log`, no hardcoded credentials.
- File uploads use `setInputFiles()` or a `page.waitForEvent('filechooser')` listener — never click
  a chooser button without it.

### API data setup (`ApiClient`)

Tests create personal backend state through `ApiClient` (`e2e/api/api-client.ts`), built from the
`request` fixture — never inline HTTP in the spec:

- **Setup only — never assertions.** `ApiClient` creates data; tests assert. No `expect` inside it.
- **Type the responses — no `unknown`, no defensive parsing.** Extract directly
  (`(await res.json()).id`); a malformed response should fail loudly, not be handled gracefully.
- **Methods are verbs** (`markAsReading`, `logProgress`) and earn their place by reuse — don't add a
  one-off wrapper for a single caller.
- Personal teardown is the automatic reset fixture's job, not `ApiClient`'s. Shared catalog writers
  are isolated behind `catalogWriter`.

## Naming

- **Name the spec file for the feature/surface under test, matching its Page Object** —
  `e2e/tests/navigation/sidebar.spec.ts` ↔ `e2e/page-objects/sidebar.page.ts`. **Not** the scenario:
  never `sidebar-collapse.spec.ts`. The file is the home for every test of that surface; the
  specific scenario is the `test()` title, and more scenarios go in the same file.
- **Test titles: present tense, first letter capitalized** — e.g.
  `'Collapsing the sidebar persists across reload'` (not `'collapses…'`, not `'should…'`).
- kebab-case filenames; camelCase identifiers.

---

Authoring workflow → `.claude/skills/playwright-new-test/`
