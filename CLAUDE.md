# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Personal reading tracker — React frontend + FastAPI backend + PostgreSQL 18.

The frontend is mid-migration from Angular to React. Read the next section before touching anything
under `frontend/` or `angular-frontend/`.

## The React migration — read this first

The Angular app has been moved to `angular-frontend/`. The React app is being built from scratch at
`frontend/`. Treat this repo as if `frontend/` were a **fresh project in a repo that has a backend
already**.

**`angular-frontend/` is a read-only reference.** It exists so the port has something to read:
templates, styles, specs, and the behaviour being reproduced.

- Never edit it, refactor it, fix it, or add to it.
- Never lint, test, typecheck, format or build it.
- Never run its `npm` scripts or install its dependencies.
- Never import from it. Values move by being copied into `frontend/` deliberately.
- It gets deleted wholesale at the end (punch list § 8). Nothing in it needs saving beyond what a
  port step explicitly copies.

**`frontend/` is new code.** Its config comes from the `vite@latest --template react-ts` scaffold
and is then adapted per the punch list. It does **not** inherit Angular's config by default — not
`.prettierrc`, not `eslint.config.js`, not `.nvmrc`, not `angular.json`, not `tsconfig*.json`, not
`package.json`. Those files show as deleted in the Angular tree's history because they moved, and
they are not coming back.

**Do not ask which Angular config files to keep, port, restore or reuse.** That decision is made:
none of them, unless a punch list item names one. If a step needs a setting the Angular app had,
copy that single setting as part of that step and say so. The same goes for `node_modules`,
lockfiles and build output — `frontend/` gets its own, fresh.

### The punch list is the contract

`REACT-MIGRATION-PUNCHLIST.md` is the ordered plan of record. `REACT-MIGRATION-PLAN.md` holds the
reasoning behind it.

- Work the punch list **in order**. One numbered item at a time.
- Items marked **[decide]** are the only open questions. Everything else is settled.
- **§ 0 "Decisions — settled" is closed.** Router, folder boundaries, primitive layer and palette
  are decided, with reasons recorded. Do not reopen, re-argue, or re-present alternatives for them.
  If you believe one is actually wrong, say so once, in a sentence, with the specific thing that
  broke — then keep going.
- The gates at the end of each section are real. Do not start the next section until the current
  gate passes.
- The **stop rule** in the punch list's standing rules governs primitives, and it outranks finishing
  a screen.

**Working Style still applies**, but at punch-list granularity: explain and confirm the _item_, not
each config key inside it. "I'm scaffolding Vite into `frontend/`, here's what the template ships
and what I'm stripping" is one confirmation, not fifteen.

### Known breakage during the migration

The `regenerate-api-client` pre-commit hook and the "Check committed API client is up to date" step
in `frontend.yml` both shell out to `npm run generate:api`. That script does not exist until punch
list § 2 flips orval to `react-query`, so:

- Any commit touching `backend/app/**.py` fails the hook. Use
  `SKIP=regenerate-api-client git commit …`, and only after confirming the change cannot alter the
  schema — a route or model change must not be skipped.
- The frontend CI job fails on that step for the same reason.

Both resolve when § 2 lands. Do not "fix" them by inventing a placeholder script.

## Working Style

The owner of this project is an SDET with over a decade of software experience from the testing
side, not the building side. Python is completely new to them. This context should calibrate how you
explain things: assume solid engineering intuition and familiarity with software concepts, but
explain Python-specific syntax, idioms, and library patterns as if they are new.

React and its ecosystem are also new to them. Explain React idioms — hooks, the render model,
TanStack Query's cache, React Router's data APIs — on the same terms: the concepts are not new, the
specific vocabulary and patterns are.

**Do not jump ahead and implement things without explaining them first.**

Before writing any code, explain:

- What you are about to build and why it is structured that way
- Any non-obvious decisions (naming, types, file layout, patterns)
- How the new code connects to what already exists

Only write code after the owner has confirmed. If a task is multi-step, explain and confirm one step
at a time.

The goal is for the owner to be able to read every file in this project and understand it fully.
Optimise for understanding, not for speed.

When presenting options, list them neutrally and let the owner reason. Only offer a recommendation
if explicitly asked.

## Scope and Forward Momentum

Governs _how much_ to design/build in a stretch of work. Subordinate to **Working Style**:
explaining before building and never letting the owner rubber-stamp is invariant. Momentum comes
from **narrowing scope, not lowering comprehension** — build less, still explain every step.

The owner is a recovering perfectionist with an SDET completeness instinct, training the skill of
scoping. Build that instinct; don't substitute for it.

- **Door check.** When a _net-new capability_ decision appears ("should we also support X later?"),
  pause and have the owner classify it _first_: is adding X later **additive** (new
  column/table/endpoint — cheap) or **destructive** (rewrite, migrate data, break a contract)?
  Confirm or correct. Design effort goes to destructive decisions; additive ones get parked in a
  sentence. Most are additive, especially now (no data, no app).
- **Parking is for net-new capability ONLY — never a cover for shirking.** Never license to abandon
  required work ("tests won't pass, leave it"), disclaim a branch bug because "I didn't introduce it
  this session" (**branch responsibility is total** — own what's broken regardless of who broke it),
  or defer something just because it's hard. Defects, regressions, failing tests, and finishing
  what's started are never scope. If genuinely blocked, say so loudly and escalate — never silently
  punt.
- **Scope-drift detector.** Get a loose intent at the start ("a book in a browser today"). The owner
  can't feel when a design discussion balloons past it — they're enjoying the dive. Be the outside
  signal: name the drift, let them choose. Chosen depth, not no depth.
- **Calibration.** Fire only at genuine decision points, not every micro-choice. Taper over time
  (walk-through → "you call it, I'll check" → flag only miscalls); if it isn't getting lighter, say
  so. The same triage applies to test design — draw the parallel so the instinct generalizes.
- **Capture, don't design, future work.** Backlog items get a problem statement + a few acceptance
  bullets — not schema, enums, or full edge-case analysis. _Gray-area exception:_ DO note a
  constraint or gotcha you've **already discovered** — a known one-way-door implication, or a
  non-obvious landmine the future implementer would hit — as a short, flagged caveat ("note, verify
  when pulled: …"). The line is _facts you found_ (capture) vs _solutions you're inventing ahead_
  (don't): note the landmines, not the blueprints. If a note grows into a schema or real edge-case
  analysis, stop and mark it "design when pulled" — most backlog is reprioritized or cut before it
  ships, so upfront design has a high waste rate.
- **Prefer vertical slices.** Favor outcome-shaped milestones that run end-to-end ("add a book, see
  it in a browser") over layer-shaped ones ("build all the models"); layer milestones have no
  natural stopping point and hide a working app until the end.

## Branching and Commits

This is a personal project but uses branches and PRs deliberately, as a learning and documentation
tool. PR descriptions serve as breadcrumbs the owner can return to later to understand why decisions
were made.

- Features should be chunked into reasonably scoped branches.
- Within a branch, work should be committed in small, logical units — one coherent change per
  commit, not one giant commit per branch.
- PR descriptions should be written to explain the _why_ behind decisions, not just the _what_,
  since the owner may return to them months later.
- Do not push branches or open PRs without explicit instruction.

## Running Tests

- **Backend:** `pytest` from the `backend/` directory.
- **Frontend:** `npm test` from the `frontend/` directory, once § 1 has created it. The React app
  runs vitest directly (no Angular build step in front of it), so `npx vitest run` is fine here —
  the warning that used to live in this section was about `ng test` and no longer applies.
- **E2E:** Playwright, run in containers. See `docs/development.md`.
- **Never run tests, linters or builds in `angular-frontend/`.**

## Working from GitHub Issues

Branches follow the pattern `<issue#>-<slug>` — for example `29-add-engagement-statuses` (GitHub's
built-in "Create a branch" format). The issue number is always the **first** hyphen-separated
segment of the branch name.

When the owner refers to "this issue" / "the issue", or asks to continue or finish the current work
without naming a number:

1. Get the current branch: `git branch --show-current`.
2. Extract the issue number — everything before the first hyphen (e.g. `29-add-engagement-statuses`
   → `29`). If the branch does not match this pattern, say so and ask for the number rather than
   guessing.
3. Pull the issue: `gh issue view <#>`. This is a solo repo with no comment threads — do NOT use
   `--comments` (it shows only comments, hides the body, and is empty here, which agents misread as
   failure and retry-spiral).
4. Compare the issue's requirements against what already exists — review `git diff main...HEAD` and
   the working tree — before deciding what remains.
5. Summarize what's done vs. outstanding, then continue per **Working Style** (explain before
   building; confirm one step at a time).

Use `gh` for all issue/PR context (`gh issue view`, `gh pr view`). It is already authenticated. Run
these bare — no `--comments`, no pipes/redirects/`echo`.

**Exception during the migration:** the current branch is `convert-app-from-angular-to-react`, which
has no issue number. Do not try to resolve one. `REACT-MIGRATION-PUNCHLIST.md` is the source of
truth for what's next.
