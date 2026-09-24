# 0034. One engagement write: create, transition and bind in a single POST

- Status: Accepted
- Date: 2026-09-24

## Context

ADR-0016 split engagement writes by verb: `POST /engagements` created a read, and
`PATCH /engagements/{id}` changed its status, with a body carrying status and nothing else. Binding
another format lived on its own route (`POST /engagements/{id}/editions`), and correcting a read's
length on another (`PATCH /engagements/{id}/length`).

TBR (#77) broke that. Starting a read from the catalog used to always mean creating one. Once a book
can sit on the TBR shelf, the same "start reading" sheet has to start an engagement that may already
exist, may or may not have the chosen format bound, and may have that format bound without a length.
Under the split, the frontend had to inspect the engagement to pick a verb, then bind or fix the
length through a second route, then change the status through a third. A failure between those
requests left the read half-prepared.

PR #256 moved the status change onto `POST`, accepting either a create body or a status body. That
fixed the verb, but the two bodies still meant two request types in the generated client, an
`isinstance` branch in the route, and binding and length still on routes of their own.

## Decision

Every engagement write is one `POST /api/engagements` with one body, `EngagementWrite`:

- **Exactly one of `book_id` and `id`.** `book_id` creates a read (201); `id` writes an existing one
  (200). `status` is required on every write.
- **A supplied `edition_format` or `edition_id` means "make sure this is bound."** An existing
  binding is reused and a missing one is created. Other bindings are left alone, so adding a format
  never removes one. Leaving both out leaves bindings unchanged, and the binding step runs even when
  the status isn't changing.
- **`edition_length` fills in an edition whose shared length is unknown. `length_override` corrects
  this read's length.** Either one needs a format or edition to land on.
- **The binding and the status change happen in one transaction**, committed once by the route after
  both succeed. A write that fails partway leaves nothing behind.

The server still owns transition rules and date bookkeeping, as ADR-0016 set out. Correcting dates a
read already has stays on `PATCH /engagements/{id}/dates`. What goes is 0016's status-only PATCH,
along with the separate binding POST and length PATCH, all folded into the one write.

## Consequences

- The client states the result it wants (this book or engagement, this status, this format and
  length) and doesn't need to know what the engagement already has. Starting from TBR is the same
  request whether the format is unbound, bound, or bound without a length.
- The generated client exposes one request type and one mutation hook for every engagement write.
- The per-path rules the two old bodies enforced by shape, such as creation-only dates, `unit` only
  on an existing read, and the statuses a read can be created in, are now validators on one model.
  OpenAPI can't express "exactly one of", so the generated type marks both identifiers optional, and
  only the server enforces the rule.
- Binding no longer has its own endpoint, so there is no way to bind without also stating a status.
  Adding a format to a read without changing it means sending its current status.

## Alternatives considered

- **Keep #256's two-body union.** Rejected: binding and length corrections didn't fit either body,
  so the multi-request TBR start stayed.
- **Keep binding and length on their own routes, sequenced by the client.** Rejected: that sequence
  and its half-finished failure states are the problem this decision exists to remove.
- **Named action endpoints (`/start`, `/finish`).** Already rejected in ADR-0016, and it would
  multiply the same bind-then-transition sequence across every action.

## Revisit when

The one body collects enough fields that only apply to one identifier that its validators outweigh
the model. That is the point where separate create and update bodies would earn their place back.
