# Roadmap

This is a solo project I'm actively building, so this page is less a committed schedule than a map
of where things stand and where they're headed. Order within each section is rough; scope shifts as
I learn.

The detailed backlog lives in
[GitHub Issues](https://github.com/samanthablasbalg/rainbowsamreads/issues), organized into epics.
This page is the readable overview.

---

## Shipped

The foundations are real and running in the deployed app:

- **A multi-user app, gated and isolated.** Google OAuth with an email allowlist, and per-user data
  isolation enforced in Postgres via row-level security — not just application-layer scoping. See
  [ADR-0023](decisions/0023-per-user-data-isolation-via-rls.md).
- **The data model.** The core the whole project hangs off: a book's three independent axes
  ([ADR-0003](decisions/0003-three-independent-axes.md)), reads as lifecycle _engagements_
  ([ADR-0005](decisions/0005-engagements-lifecycle-entity.md)), editions and the binding between a
  read and an edition ([ADR-0021](decisions/0021-editions-and-engagement-edition.md)), and progress
  logged as activities rather than a single position
  ([ADR-0007](decisions/0007-progress-logs-activities-not-positions.md)).
- **Add books** from Google Books, via a backend proxy
  ([ADR-0015](decisions/0015-google-books-access-via-backend-proxy.md)).
- **Track a current read.** A Currently Reading view, and progress logging for pages and audio
  minutes.
- **Finish, DNF, rate, and review** a read.
- **Fix mistakes.** Correct or delete entries made in error, and edit the dates on reads and
  progress logs after the fact.
- **Deployed**, with a production build and a logged-out landing page.
- **A React frontend**, rebuilt from Angular two months in and on a live app
  ([ADR-0032](decisions/0032-migrate-the-frontend-to-react.md)) — with a layer structure the linter
  enforces, so the tech debt that prompted it can't quietly rebuild itself
  ([ADR-0033](decisions/0033-frontend-layering-and-import-direction.md)).
- **The everyday flows, redesigned.** Progress logging in a focused sheet
  ([ADR-0019](decisions/0019-progress-logging-in-a-focused-sheet.md)), and finding a book, adding
  it, and starting a read reworked to match the new designs.
- **A book detail page** — everything the app already knows about a book, in one place.
- **A design system.** A custom color theme, typography, an adaptive navigation shell, and desktop
  layout patterns — with every promoted component rendered in its states in Storybook, where an
  accessibility violation fails the run.

## Planned

The next horizon, roughly grouped by theme. These are designed or partially designed; the data model
is mostly ready for them.

- **Fuller reading lifecycle** — paused reads, deliberate re-reads as independent engagements
  (including re-reading in a different format), and every book showing its current status and the
  obvious next thing to do with it.
- **Multi-format and non-linear progress** — one read spanning audio, print, and ebook with a single
  combined completion; anthologies and omnibuses tracked story-by-story without wrecking the
  percentage.
- **TBR and Interested pages** — adding and viewing books at the earlier lifecycle stages, including
  declaring an intended reading format before a read begins.
- **Fuzzy dates in the UI** — recording and displaying month- or year-precision dates ("I read this
  in 1994") for backfilling older reads.
- **Ownership** — tracking owned copies of a book independently of whether it's been read, with an
  acquisition and disposition lifecycle.
- **Reviews, expanded** — writing reviews alongside the journal entries from a read, and monthly
  wrap-up views.
- **Stats & insights** — pace, pages/minutes per day, yearly totals, TBR duration, author-diversity
  breakdowns, a "where did this book come from" view, and a coverage-map visualization of what parts
  of a book have been read.
- **Curation** — collections, tags, saved queries, and reading challenges.

## Someday / maybe

Genuinely further out — captured so I don't lose the idea, not scheduled:

- **An X-Men reading-order tracker** — a purpose-built companion for reading a sprawling comics
  continuity in order.
- **A blog surface** — turning monthly wrap-ups and reviews into shareable posts.
- **A browser extension** to add books to the catalog from anywhere.
- **Data import** from other book trackers or csv, and data export for backup.

---

_Something here intrigue you, or want to know why a decision went the way it did? The
[Architecture Decision Records](decisions/README.md) capture the reasoning behind the choices
above._
