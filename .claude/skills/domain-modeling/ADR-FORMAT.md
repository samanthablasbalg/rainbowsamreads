# ADR Format

ADRs live in **`docs/decisions/`**, one decision per file, named `NNNN-short-slug.md`. The directory
already exists and holds the full log — never create it, never start a parallel one elsewhere.

## Template

```markdown
# NNNN. <Title>

- Status: Accepted
- Date: YYYY-MM-DD

## Context

What forced a decision; the constraints in play.

## Decision

What we chose, stated plainly.

## Consequences

What this makes easy, what it makes hard, what we accept.

## Alternatives considered

- <Option> — why not.

## Revisit when

The concrete trigger that would reopen this (e.g. "if this goes multi-user").
```

Every section is expected. A record may instead be filed as a placeholder carrying
`> **Stub — write-up pending.**` in place of the prose; fill it at leisure.

## Status

One of exactly three values:

- `Accepted` — ratified, treat as settled.
- `Proposed` — not yet ratified, or we're not sure the decision was consciously made. **Don't treat
  a `Proposed` record as binding.**
- `Superseded by NNNN` — replaced. A decision superseded only in part stays `Accepted` and notes the
  partial supersession in the index (see 0001 and 0007 for the shape).

## Numbering

Numbering is **chronological by when the decision was made, and immutable** — once assigned, a
number is never reused or renumbered. New records append at the end, so "newest = highest number"
holds going forward. Scan `docs/decisions/` for the highest existing number and increment by one.

## Adding a record is two edits, not one

1. Write `docs/decisions/NNNN-slug.md`.
2. **Append a row to the index table at the bottom of `docs/decisions/README.md`.** A record missing
   from the index is invisible. If the new decision supersedes an older one, update that older row's
   Status in the same edit.

## When to offer an ADR

All three of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth
   did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for
   specific reasons

If a decision is easy to reverse, skip it — you'll just reverse it. If it's not surprising, nobody
will wonder why. If there was no real alternative, there's nothing to record beyond "we did the
obvious thing."

### What qualifies

- **Architectural shape.** "We're using a monorepo." "The write model is event-sourced, the read
  model is projected into Postgres."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events,
  not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, auth provider, deployment
  target. Not every library — just the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts
  reference it by ID only." The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "We're using manual SQL instead of an ORM because
  X." Anything where a reasonable reader would assume the opposite. These stop the next engineer
  from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "We can't use AWS because of compliance requirements."
  "Response times must be under 200ms because of the partner API contract."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked
  REST for subtle reasons, record it — otherwise someone will suggest GraphQL again in six months.
