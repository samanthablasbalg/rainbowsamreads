# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on `samanthablasbalg/rainbowsamreads`. Use the
`gh` CLI for reads; use the `make-ticket` skill for anything that creates an issue.

## Creating an issue

**Never run `gh issue create` directly.** Invoke the `make-ticket` skill instead. This project
requires every issue to be drafted and approved in chat first, parented to an epic, and on project
\#1 in the right column. A bare issue — title and body only, off the board, unparented — is wrong,
and `make-ticket` exists because that kept happening.

This applies to every skill step phrased as "publish to the issue tracker", "file a ticket", or
"create an issue", including batch steps in `/to-tickets`. Each ticket in a batch gets its own
draft-and-approve pass.

## Reading and updating

- **Read an issue**: `gh issue view <number>` — **bare, no `--comments`.** This repo has no comment
  threads; `--comments` hides the body, which agents misread as a failed fetch and retry-spiral.
- **List issues**:
  `gh issue list --state open --json number,title,body,labels --jq '[.[] | {number, title, body, labels: [.labels[].name]}]'`
  with `--label` / `--state` filters as needed.
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

`gh` infers the repo from the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`,
  `gh pr close`.

## When a skill says "publish to the issue tracker"

Invoke the `make-ticket` skill.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number>` (bare). When no number is given, read it off the branch name — branches
are `<issue#>-<slug>`, so the number is everything before the first hyphen.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue, with **child** issues as tickets.

- **Map**: an issue labelled `wayfinder:map` holding the Notes / Decisions-so-far / Fog body.
  Created through `make-ticket`; make sure to add `--label wayfinder:map`.
- **Child ticket**: a GitHub sub-issue of the map, created through `make-ticket` with the map as
  parent. Labels: `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`).
- **Blocking**: GitHub's native issue dependencies —
  `gh api --method POST repos/samanthablasbalg/rainbowsamreads/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`,
  where `<blocker-db-id>` is the blocker's numeric **database id**
  (`gh api repos/samanthablasbalg/rainbowsamreads/issues/<n> --jq .id` — not the `#number`, not the
  `node_id`). A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the
  map's sub-issues / task list), drop any with an open blocker
  (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an
  assignee; first in map order wins.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a
  context pointer to the map's Decisions-so-far.
