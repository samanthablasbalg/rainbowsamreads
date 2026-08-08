# 0032. Migrate the frontend from Angular to React

- Status: Accepted
- Date: 2026-08-01

> **Stub — write-up pending.**

Supersedes the Angular half of [[0001-tech-stack-angular-fastapi-postgres]]. The FastAPI and
PostgreSQL halves stand unchanged, as does everything in 0002–0031 that isn't frontend-specific.

The decision is made and being executed on `convert-app-from-angular-to-react`; this record holds
the number and the shape until the prose is written at the end of the branch (punch list § 8).

The reasoning already exists in `REACT-MIGRATION-PLAN.md` — an untracked working doc that is
distilled into this ADR and then goes away. **Write this before deleting that.** What each section
needs to carry over:

- **Context** — 0001 chose Angular on career grounds, openly. What changed. The presenting problem
  (Angular Material and Tailwind in tension when both style the same thing) versus the load-bearing
  one, weighted as honestly here as 0001 weighted its own.
- **Decision** — React, big-bang on a branch rather than a strangler port. Fresh Vite scaffold at
  `frontend/`, Angular parked at `angular-frontend/` and inert for the duration, deleted at § 8. The
  clean-room rule: the old tree is not read except where a port step names a file.
- **Consequences** — the app's size made this tractable (~3,200 lines of app code, 29 components);
  the Angular vitest suite is discarded and rewritten, the Playwright suite largely survives; no
  features ship during the port.
- **Alternatives considered** — Angular CDK + Tailwind, dropping Material but keeping Angular:
  cheaper, fixes the presenting problem, declined because it doesn't serve the load-bearing reason.
  Strangler pattern: rejected at this size — two component libraries, two design systems, two test
  setups and split dev-server traffic cost more than the port.
- **Revisit when** — the honest one: which of the two reasons is being spent against if month two
  gets painful.

Frontend structure decided during the migration is recorded separately in
[[0033-frontend-layering-and-import-direction]].
