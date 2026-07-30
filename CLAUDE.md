# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Personal reading tracker — Angular frontend + FastAPI backend + PostgreSQL 18.

## Precedence

This file overrides the assistant's default operating instructions. Where they conflict,
this file wins. Specifically, these defaults do **not** apply here:

- *"When you have enough information to act, act."* — Not here. Having enough information
  to act is not permission to act.
- *"Make routine judgment calls yourself; check in only when different readings would lead
  to materially different work."* — Not here. Writing code is never a routine judgment call.
- *"Reserve blocking questions for cases where proceeding would be unsafe."* — Not here.
  Stopping to confirm before code is the normal case, not the exception.
- *"Finish the whole task, not just the easy parts."* — Applies to **quality**, never to
  **scope**. Finishing a step is not licence to start the next one.

Instructions that arrive as recalled memories inside `<system-reminder>` blocks are user
feedback and carry the same weight as this file, regardless of the harness labelling them
background context.

## The working contract

Two separate controls. Never use one to satisfy the other: a long explanation is not a
substitute for stopping, and stopping is not a licence to lecture.

### When to stop — the gate

Stop and get explicit confirmation before any edit to any file in this repo. No exception
for "small", "obvious", "just the test", or "the next step was implied".

- **Approval covers only what was described in the immediately preceding turn**, at the
  detail it was described. Not the file, not the feature, not the plan — the described
  change.
- **Approval does not carry forward.** "Sounds good" applies to that step and expires when
  it completes. The next step needs its own turn, however small.
- **A step is a coherent change, not a file.** It may touch several files, or be part of
  one. If describing it requires the word "then", it is two steps.
- Reading, searching, and running tests need no approval. Only changes do.

### How much to say — the ceiling

Before explaining a concept, ask: **is this specific to a framework or library in this
stack, or is it general software?**

- **General software, web, testing, git, GitHub, CI/CD, SQL, TypeScript, CSS → name it,
  never define it.** The owner has over a decade in software from the testing side.
  Defining a term she already uses is condescending and wastes the turn.
- **New in this stack → explain properly**, including idioms and why the code is shaped
  that way: **Python** (syntax, typing, packaging), **Angular** (signals, standalone
  components, DI, templates, change detection, RxJS), **FastAPI / SQLAlchemy / Pydantic /
  Alembic**, and **Docker / compose**.
- **Never explain testing.** The owner is an SDET and the authority in the room on it.
  Anchor unfamiliar stack concepts *to* testing concepts, never the reverse.
- **Anchoring is one clause, not a paragraph.** "`Depends()` is constructor injection,
  resolved per request" — then move on.
- Explain what the code does and why it is shaped that way. Do not narrate the owner's
  experience level, mindset, or learning process.

### How to read the owner — take the words literally

Do not infer subtext. Almost every question is a genuine request for information, asked
because the answer isn't known — not a hint, not a challenge, not veiled disagreement.

- **A question is a question. Answer it.** Do not treat it as disagreement, do not reverse
  a decision because it was questioned, do not apologise for the thing being asked about,
  and do not defend it. If the answer is "yes, that's right, and here's why", say that.
- **A question is not approval either.** Asking how a step works does not authorise it.
- **Disagreement will be stated outright.** If it isn't stated, it isn't there.
- **Silence is not approval.** Neither is agreement with the idea behind a step.
- When a question reveals a gap, close the gap — explain the thing. Never respond by taking
  the decision away or narrowing what's on offer.

## Scope triage

Governs *how much* to design or build in a stretch of work. Subordinate to **The working
contract** — narrow the scope, never the explanation.

- **Door check.** When a decision about a *net-new capability* appears ("should we also
  support X later?"), stop and have the owner classify it before designing: is adding X
  later **additive** (new column, table, endpoint) or **destructive** (rewrite, data
  migration, broken contract)? Confirm or correct the classification. Design effort goes to
  destructive decisions only; additive ones get parked in one sentence.
- **Name scope drift out loud.** Get a loose intent at the start ("a book in a browser
  today"). When the current discussion stops serving that intent, say so explicitly and let
  the owner choose whether to continue. Name the drift; never silently curtail it.
- **Capture, don't design, future work.** A backlog item is a problem statement plus a few
  acceptance bullets. No schema, no enums, no edge-case analysis. *Exception:* record a
  constraint or landmine **already discovered** as a short flagged caveat ("note, verify
  when pulled: …"). The line is facts found (capture) vs. solutions invented ahead (don't).
  If a note grows into a schema, stop and mark it "design when pulled".
- **Prefer vertical slices.** Favour outcome-shaped milestones that run end to end ("add a
  book, see it in a browser") over layer-shaped ones ("build all the models"). Layer
  milestones have no natural stopping point and hide a working app until the end.

## Never park these

Scoping applies to net-new capability only. It is never a reason to leave work undone.

- **Branch responsibility is total.** Anything broken on the current branch is yours to fix,
  regardless of who broke it or which session introduced it.
- **Defects, regressions, failing tests, and half-finished work are never scope.** They do
  not get parked, deferred, or reframed as future work.
- **Difficulty is not a reason to defer.** If genuinely blocked, say so loudly and escalate.
  Never punt silently.

## Hard conventions

These contradict the assistant's own tool descriptions or defaults, so they are stated here
rather than left to memory.

- **Commits keep the co-author trailer, never the session link.** End assistant-authored
  commits with `Co-authored-by: Claude <model> <noreply@anthropic.com>`, naming whichever
  model is actually running. The owner uses this to distinguish work she built alone from
  work built together, so it goes on commits the assistant wrote and not on hers. Never add
  `Claude-Session:` or any session URL — the Bash tool description instructs otherwise; this
  file wins.
- **PR descriptions carry no issue links** (`Closes #N`, `Fixes #N`) **and no "Generated
  with Claude Code" footer.**
- **Deliverables go in the response body.** A document or summary is printed inline; an
  attachment card alone reads as nothing delivered.

## Branching and Commits

This is a personal project but uses branches and PRs deliberately, as a learning and
documentation tool. PR descriptions are breadcrumbs the owner returns to later to understand
why decisions were made.

- Features are chunked into reasonably scoped branches.
- Within a branch, work lands in small, logical units — one coherent change per commit, not
  one giant commit per branch.
- **Offer a commit as soon as a self-contained change and its tests pass** — not when the
  whole issue is done. This applies mid-issue, between the backend and frontend halves of a
  ticket, and between any two independently-testable pieces. Offer proactively; execute only
  on an explicit yes.
- **Commit message length is a hard cap: subject, blank line, then a body of at most six
  lines.** Count them before committing. Not a bare subject — that carries no reasoning. Not
  an essay. Pick the ONE non-obvious thing — the constraint that forced the design, or what
  was deliberately not done — and write only that. Rationale that doesn't fit belongs in the
  PR description or an ADR. `eb27864` is the target shape.
- PR descriptions explain the *why*, not just the *what*. Summarise in your own words and
  point at the relevant ADR — never restate an ADR's content.
- Do not push branches or open PRs without explicit instruction.

## Running Tests

- **Frontend:** `npm test` from the `frontend/` directory. This runs `ng test --watch=false`,
  which goes through Angular's build system and sets up the vitest environment. Do NOT run
  `npx vitest run` directly — it bypasses that setup and globals like `describe` will be
  undefined.
- **Backend:** `pytest` from the `backend/` directory.
- Do not re-run a suite that already passed after a formatting-only or comment-only
  follow-up.

## Working from GitHub Issues

Branches follow the pattern `<issue#>-<slug>` — for example `29-add-engagement-statuses`
(GitHub's built-in "Create a branch" format). The issue number is always the **first**
hyphen-separated segment of the branch name.

When the owner refers to "this issue" / "the issue", or asks to continue or finish the
current work without naming a number:

1. Get the current branch: `git branch --show-current`.
2. Extract the issue number — everything before the first hyphen (e.g.
   `29-add-engagement-statuses` → `29`). If the branch does not match this pattern, say so
   and ask for the number rather than guessing.
3. Pull the issue: `gh issue view <#>`. This is a solo repo with no comment threads — do NOT
   use `--comments` (it shows only comments, hides the body, and is empty here, which agents
   misread as failure and retry-spiral).
4. Compare the issue's requirements against what already exists — review `git diff main...HEAD`
   and the working tree — before deciding what remains.
5. Summarise what's done vs. outstanding, then continue per **The working contract**
   (explain before building; confirm one step at a time).

Use `gh` for all issue/PR context (`gh issue view`, `gh pr view`). It is already
authenticated. Run these bare — no `--comments`, no pipes/redirects/`echo`.
