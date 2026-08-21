# CLAUDE.md

## Project overview

Reading tracker — React frontend + FastAPI backend + PostgreSQL 18.

**Deployed, multi-user, holding real people's personal data.** Google OAuth gated by an email
allowlist; per-user isolation enforced in Postgres via row-level security
([ADR-0023](docs/decisions/0023-per-user-data-isolation-via-rls.md)). "Solo project" here means
**one developer**. It says nothing about the running app — never infer a threat model, a user count,
or the stakes of an auth failure. If an argument rests on stakes, cite the doc or don't make it.

## Working style

The owner is an SDET with over a decade of experience from the testing side, not the building side.
Assume solid engineering intuition and familiarity with software concepts; explain **Python and
React specifics** — syntax, idioms, library patterns, hooks, the render model, TanStack Query's
cache, React Router's data APIs — as new vocabulary for concepts she already has.

**Explain before you build.** Before writing code, say what you are about to build and why it is
structured that way, any non-obvious decisions (naming, types, file layout, patterns), and how it
connects to what exists. Write code only after she confirms. Multi-step work gets explained and
confirmed one step at a time, at the granularity of the _item_ — not every key inside it. The goal
is that she can read every file here and understand it: optimise for understanding, not speed.

**That is about explanations, not design.** It is not a licence to write non-standard code, and it
is the sentence agents most often misuse to justify exactly that.

**Take the smaller option.** When two approaches differ only in how explicit, verbose or ceremonious
they are — more imports, more boilerplate, a bespoke variant of a documented pattern, a longer
commit message — take the smaller one. Every time.

**Audit your own justification before you give it.** If the reason is about the reader — "readable",
"traceable", "greppable", "explicit", "so it's obvious" — it is invalid. Discard it and decide on
technical grounds alone. If none survives, use the default: the library's documented pattern, or the
convention already in this repo. Deviating from a documented pattern is not your call — raise it as
a question, naming the specific breakage, and write the standard version unless told otherwise.

**Answer the question that was asked.** A factual question gets the fact, not the set of things you
considered. Never surface a candidate you rejected — that is your process, and it costs her a
decision she didn't ask to make. Present options only when the decision is genuinely hers and more
than one is defensible; list them neutrally, and recommend only if asked.

## Scope

Momentum comes from **narrowing scope, not lowering comprehension** — build less, still explain
every step. She is deliberately training the scoping instinct; build it, don't substitute for it.

- **Door check.** When a net-new capability question appears ("should we also support X later?"),
  have her classify it first: is adding X later **additive** (new column/table/endpoint — cheap) or
  **destructive** (rewrite, migrate data, break a contract)? Design effort goes to the destructive
  ones; additive ones get parked in a sentence.
- **Parking is for net-new capability only, never cover for shirking.** Defects, regressions,
  failing tests and finishing what's started are never scope. **Branch responsibility is total** —
  own what's broken on the branch regardless of who broke it. If genuinely blocked, say so loudly;
  never silently punt.
- **Name scope drift, don't police it.** When a design discussion balloons past the loose intent
  agreed at the start, say so and let her choose. Chosen depth, not no depth.
- **Capture, don't design, future work.** A backlog item gets a problem statement and a few
  acceptance bullets. Note a landmine you actually hit ("verify when pulled: …"); never invent the
  blueprint — most backlog is cut or reprioritised before it ships.
- **Prefer vertical slices** — "add a book, see it in a browser" over "build all the models".
- **Taper.** Flag at genuine decision points, not micro-choices, and get lighter over time
  (walk-through → "you call it, I'll check" → flag only miscalls). If it isn't getting lighter, say
  so.

## Where you are running

Development happens **inside the dev container** (ADR-0028), and so does this session.

- **There is no `docker` CLI in here** — a hook blocks any command containing one. Reach services
  over the compose network by name: `proxy:8080`, `api:8000`, `db:5432`, `browsers:5000`.
- **No virtualenv to activate.** `/opt/venv` is first on `PATH`, so `python`, `pytest`, `ruff`,
  `mypy`, `alembic` and `pre-commit` are simply there. Never `source` anything.
- **Never write a shell script and run it** — another hook blocks that. Run the command directly.

## Commands

| Task                           | Command                                                   |
| ------------------------------ | --------------------------------------------------------- |
| Backend tests                  | `cd backend && pytest`                                    |
| One backend test               | `cd backend && pytest tests/test_books.py::test_name`     |
| Frontend unit tests            | `cd frontend && npm test`                                 |
| One frontend spec              | `cd frontend && npm test -- src/path/to/file.spec.tsx`    |
| Storybook tests (real browser) | `cd frontend && npm run test:storybook`                   |
| Lint + typecheck + unit tests  | `cd frontend && npm run check`                            |
| E2E                            | `cd e2e && npm test -- --project=chromium --reporter=dot` |
| All static checks              | `pre-commit run --all-files`                              |
| Format the whole repo          | `cd frontend && npm run prettier:format`                  |
| Regenerate the API client      | `cd frontend && npm run generate:api`                     |
| Write a migration              | `cd backend && alembic revision --autogenerate -m "…"`    |
| Apply migrations               | `cd backend && alembic upgrade head`                      |
| Reseed the dev database        | `cd backend && python -m scripts.seed_dev`                |

- **A hook rewrites every test command** to log to `/tmp/test.log`. A bare **`exit=0` means the
  suite PASSED** — it is not "no output". On failure read that file; don't re-run to see it.
- `prettier:*` runs from `frontend/` but covers the **whole repo** (the scripts pass `..`).
- Migrations apply themselves when the stack starts; run `alembic` by hand only when authoring one.
- **An e2e run truncates the dev database.** Reseed afterwards, then log out and in — the seed
  replaces the user row with a new id.
- `playwright: command not found` means `e2e/node_modules` is an empty volume: `cd e2e && npm ci`.

## Architecture

Full picture in `docs/architecture.md`; the **why** for everything below lives in `docs/decisions/`,
which is where significant decisions get recorded (index in its README) rather than restated in
other docs or PR summaries.

Three pieces, one deploy: React SPA → FastAPI (JSON API under `/api`, also serving the built SPA) →
PostgreSQL 18. Locally a Caddy proxy puts them on one origin at `localhost:8080`, the shape
production has (ADR-0029) — never assume separate origins.

**Per-user isolation is the load-bearing invariant**, in two layers (ADR-0023). `get_db` sets
`app.current_user_id` on the connection and RLS policies filter every personal row; shared reference
data (`books`/`authors`/`editions`) and the auth path use `get_unscoped_db`, because those joins
must stay unrestricted — picking the wrong dependency silently gets you empty results or a leak.
Personal child tables also FK to the composite `(engagements.id, engagements.user_id)`. The app and
the test suite both connect as the restricted `app_user` role, so RLS is exercised, not bypassed.

**Backend layering** (ADR-0025): `app/api/` routers parse, call a service, commit, shape the
response → `app/services/` holds business rules as plain functions → `app/crud/` is one generic
`CRUDBase[Model]`, instantiated once per model in `crud/__init__.py` and imported from there. Domain
errors are plain-Python exceptions in `app/exceptions.py`, mapped to HTTP status once in `main.py` —
services and crud never import FastAPI. mypy strict, Ruff, 88 columns.

**Frontend layering** (ADR-0033 — read it before placing a new file): dependencies flow shared →
features → app, features never import each other, enforced by `import-x/no-restricted-paths`.
`src/api/generated/` is orval output — **never edit it**; a pre-commit hook regenerates it from the
backend schema and CI fails on a diff. TanStack Query is the state layer (no store; the session is
itself a query in `src/lib/auth.ts`). Specs and stories sit beside their component; unit specs
render through `src/test/render.tsx` against MSW, and a promoted component is expected to have a
story, which the storybook project runs in a real browser, failing on a11y violations.

`.claude/rules/playwright-e2e.md` is the standard for anything under `e2e/` and outranks Playwright
docs defaults — read it before writing or editing a spec.

## Branching, commits, and issues

Branches are `<issue#>-<slug>` (GitHub's "Create a branch" format); the issue number is everything
before the first hyphen. When she says "this issue" without naming one, read it off
`git branch --show-current`, then `gh issue view <#>` — bare, no `--comments` (it hides the body,
and this repo has no comment threads, which agents misread as failure and retry-spiral). Compare the
issue against `git diff main...HEAD` and the working tree before deciding what's left.

- Commit in small, logical units — one coherent change per commit, not one per branch.
- PR descriptions explain the _why_, not the _what_. She returns to them months later.
- **Never push a branch or open a PR without explicit instruction.**

## Agent skills

### Issue tracker

GitHub issues on `samanthablasbalg/rainbowsamreads`. Creating one goes through the `make-ticket`
skill, never bare `gh issue create`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles verbatim — all already exist as repo labels, so apply them, don't create
them. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. ADRs live in `docs/decisions/`, not `docs/adr/`, and
`.claude/skills/domain-modeling/ADR-FORMAT.md` is the format standard. See `docs/agents/domain.md`.
