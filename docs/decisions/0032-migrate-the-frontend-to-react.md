# 0032. Migrate the frontend from Angular to React

- Status: Accepted
- Date: 2026-08-01

Supersedes the Angular half of [[0001-tech-stack-angular-fastapi-postgres]]. The FastAPI and
PostgreSQL halves stand unchanged, as does everything in 0002–0031 that isn't frontend-specific.

## Context

[[0001-tech-stack-angular-fastapi-postgres]] chose Angular openly as a career bet rather than a
technical one, and it named the trigger that would reopen it: _"Reconsider a layer only if it
actively stops serving that goal (e.g. the Angular learning is 'done' and its friction now outweighs
its value)."_ That is what happened. Three things, in the order they carry weight.

**1. The bet paid out, and the next one points the other way.** 0001's driver was day-job value —
the company builds all its apps in Angular. That value has been collected: enough Angular to be
effective in the current SDET role. The goal now is the _next_ role, a deliberate move from testing
into development, and there the calculus inverts. Angular is a small and shrinking share of the
market; it isn't even offered as a learning path in the places people go to pick one up. A portfolio
app gets read by a hiring manager in minutes, and one written in a framework they don't use is a
reason to stop reading rather than a differentiator. No technical argument beats this, and none is
attempted here.

**2. Angular is thin in the training data, and this app is built with an AI assistant.** This is the
reason that is easiest to leave unsaid and most worth writing down. The project's entire working
style is AI-assisted, explain-before-building — that is downstream of 0001 and is the thing that
made an unfamiliar stack tractable at all. But the assistant's Angular output was materially worse
than its output in better-represented frameworks: less idiomatic, less consistent, and less anchored
to the framework's own conventions. Reviewing that requires knowing what good Angular looks like,
which is precisely what a person learning Angular does not yet have.

The result was a very young app carrying a staggering amount of tech debt. Buttons implemented five
different ways in five different places, and no adherence to the framework's own best practices.
Keeping an assistant on the rails in a framework you are simultaneously learning takes experience
this project did not have at the start. This is a property of the toolchain, not a criticism of
Angular's design — but it is a real and recurring cost of building this way, and framework
popularity is one of the few levers over it. [[0033-frontend-layering-and-import-direction]] records
the structural half of the response.

**3. The catalyst: Angular Material and Tailwind in tension.** Building out a component library in
Storybook put the two systems in direct conflict — they fight whenever both are allowed to style the
same thing, and the app had been quietly losing that fight for months. The canonical symptom, in the
nav shell: `<button mat-icon-button class="!w-10 !h-10 !p-0 !rounded-full">`, four `!important`s to
win an argument against a component library the app was supposed to be leaning on.

This is a catalyst, not an underlying cause, and it is deliberately weighted last. On its own it
justifies a fix, not a rewrite. What it actually did was prompt the right question: not "how do I
untangle this," but "is untangling it the best use of the effort, or is rebuilding now — while the
app is still small — the thing that serves 1 and 2 as well?"

**The app was small enough that the question had an answer.** 3,186 lines of app code across 29
components and services; 4,576 lines of Vitest specs; 580 lines of component CSS, almost all of it
the landing page. The Material surface is smaller than it feels: nine components, of which `icon`
(33 rendered tags) and `button` are most of the usage, plus an overlay system (`dialog` 21 imports,
`bottom-sheet` 18). This is not a Material app; it is an app that uses icons, buttons and overlays.

## Decision

**Migrate the frontend to React, as a big-bang rebuild on a branch.** A fresh
`vite@latest --template react-ts` scaffold lands at `frontend/`; the Angular tree moves to
`angular-frontend/`, stays inert for the duration, and is deleted when the port completes.

**It is a rebuild, not a port.** The old tree is reference material opened one file at a time when a
step names it — never background reading. That rule exists because the accumulated shape in reason 2
is exactly what this migration is meant to escape, and old code read "for context" becomes old code
reproduced. Guessing wrong from the requirement costs one round of feedback; importing the old shape
costs the migration.

Four decisions follow from it:

- **Components: shadcn/ui on Base UI.** Source copied into the repo rather than a dependency, so the
  primitives are ours to own and document in Storybook without fighting a vendor's rendered DOM;
  variants expressed through `class-variance-authority`, which is the constrained vocabulary the
  design system wanted. Tailwind owns colour outright, so the two-systems conflict is gone by
  construction rather than by bridge. MUI was rejected twice over: its core is still Material Design
  2 (a step _backwards_ from Angular Material v22's M3), and it styles with runtime CSS-in-JS, which
  reproduces the Tailwind conflict on a worse engine for it.
- **Data: orval's `react-query` client plus TanStack Query.** One line of config
  (`client: 'angular'` → `'react-query'`), and nearly all of
  [[0026-generated-frontend-api-client-orval]]'s actual investment is client-agnostic and survives.
  It also deletes a cost that ADR explicitly accepted: the hand-written caching layer collapses into
  `useQuery` and `invalidateQueries`.
- **Unit tests: Testing Library + MSW, rewritten per screen.** Vitest stays.
  `provideHttpClientTesting()` works by swapping a provider in Angular's DI container, and React has
  no container to swap in — so the fake backend moves to network interception. That is also the
  option that keeps TanStack Query's retries, deduping and invalidation actually running, and it
  reuses the MSW handlers orval already generates from `openapi.json`. Specs are rewritten as each
  screen ports, so nothing is untested at any point.
- **Layering, enforced by lint.** Recorded separately in
  [[0033-frontend-layering-and-import-direction]] — it is the direct answer to reason 2, and it
  earned its own record by being violated before it was enforced.

## Consequences

**What this makes easy:**

- The portfolio argument works: the app is now written in the framework the target roles use.
- The assistant is working in a framework that is heavily represented in its training data, so its
  output should need less correction than the Angular output did.
- Tailwind is the only thing styling anything. Every `!important` in the app disappeared with its
  cause rather than being ported.
- The debt that motivated this is gone rather than refactored, which at 3,186 lines was cheaper than
  untangling it.

**What we accept:**

- **No features shipped during the port.** For a deployed app with real users, that is the whole
  cost, and it was paid deliberately.
- **The Vitest suite is discarded and rewritten** — 4,576 lines in, roughly 3,000 out. The test
  _intent_ transfers at about 90%; the test _code_ at about 20%.
- **The Playwright suite is the standout survivor** and became the acceptance criterion for the
  migration. Across ~1,570 lines: 65 `getByRole` calls, zero `getByTestId`, zero Material CSS
  selectors, and the entire framework coupling was four lines of Angular tag names in page objects.
  Port a screen, run its specs, and red-versus-green is precisely what is left to do.
- **The M3 theming machinery is discarded**, including the generated tone ramps. The hex values were
  kept; what is lost is the generator that guaranteed their contrast, which now has to be verified
  by `@storybook/addon-a11y` instead.
- **0001's honesty is inherited, not escaped.** This decision is as much a career bet as that one
  was, and it is recorded the same way so a future reader isn't misled into reading it as a purely
  technical conclusion.

## Alternatives considered

- **Angular CDK + Tailwind — drop Material, keep Angular.** Cheaper than a rewrite, and it genuinely
  fixes reason 3. Declined because reason 3 is the catalyst, not the cause: it does nothing for
  reason 1 and little for reason 2, and those are what the effort is being spent on.
- **Refactor the Angular app in place.** The tech-debt half of reason 2 is fixable without changing
  framework. Declined for the same reason, plus a sharper one — the structural discipline that
  prevents recurrence ([[0033-frontend-layering-and-import-direction]]) is far easier to impose on
  an empty directory than to retrofit across 29 components.
- **Strangler pattern — port screen by screen with both apps live.** Rejected at this size: two
  component libraries, two design systems, two test setups and Caddy splitting dev-server traffic
  cost more than the whole port does.
- **Stay on Angular and accept the costs.** The null option, and defensible for as long as the day
  job was the only career input. It stopped being defensible when the next role became the goal.

## Revisit when

- **If month two of the port gets painful, be explicit about which reason is being spent against.**
  Reason 1 is a bet on a future that hasn't happened yet; reasons 2 and 3 pay out immediately. If
  the pain outlasts the port, the honest question is whether reason 1 was doing more work in the
  argument than it could carry.
- **Reason 2 is a testable claim, and the most likely of the three to be wrong.** If AI-assisted
  React output turns out to need the same amount of correction as the Angular output did, then the
  cause was inexperience rather than training data, and the lever pulled here was the wrong one.
  Worth an honest look once a few features have been built on the new stack rather than ported to
  it.
