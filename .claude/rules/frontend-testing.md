---
paths:
  - 'frontend/src/**'
---

# Frontend unit test conventions

How a Vitest + Testing Library spec under `frontend/src` is written, and which files get one. Follow
this file over any external Testing Library default. Placement is
[ADR-0033](../../docs/decisions/0033-frontend-layering-and-import-direction.md)'s; the harness
(`src/test/render.tsx`, MSW, the storybook project) is CLAUDE.md's. Anything under `e2e/` is
[`playwright-e2e.md`](playwright-e2e.md)'s.

## What gets a spec

A spec is for **behaviour** — a branch, state that changes, a request that fires, a value derived
from input. Give one to any file that has some.

A file whose whole job is markup gets a **story** instead: presentational components, re-exports,
config data (`config/destinations.ts`), the route modules that only compose, and the vendored
primitives in `components/ui/`. A story runs in a real browser and fails on a11y violations, which
is the coverage those files actually need.

**Behaviour is the entry condition, not symmetry.** When one branch of a pair is tested, the other
earns a spec by being reachable and consequential — not by matching. `readStoredTheme`'s `try/catch`
(`lib/theme-provider.tsx`) is the standing example of a branch left untested on purpose.

**Coverage is a diagnostic.** Run `npx vitest run --coverage` from `frontend/` when you want to find
untouched _branches_; read it and move on. It carries no threshold deliberately, and
`src/api/generated/**` and `src/components/ui/**` are excluded because neither is logic this app
authored. Report what a run showed; leave the configuration as it is.

## Driving the UI

`userEvent` drives the interaction. Call `userEvent.setup()` once per test and `await` every action:

```ts
const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: 'Log progress' }));
```

Two narrower tools cover what `userEvent` cannot produce. Both are in use today; both carry their
reason on the line:

- **`fireEvent`** for an event `userEvent` has no API for — dragging a range slider
  (`features/library/components/review-sheet.spec.tsx`), setting a native date input
  (`components/common/progress-log-sheet.spec.tsx`), an `<img>` failing to load
  (`components/common/cover-image.spec.tsx`).
- **`act`** around a direct DOM call that flips React state, such as `field.focus()` or
  `field.blur()` (`components/common/hhmm-input.spec.tsx`). A comment on the line says which state
  it flips.

## Asserting

Assert the **semantic** attribute the component sets, so restyling can't break the test and a broken
state can:

```ts
expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
```

`toHaveClass` is right only when the class _is_ the subject — `dark` on `document.documentElement`
is the whole observable effect of the theme, and it is the only such case in the tree.

Queries go through role and accessible name. When nothing reaches an element, the fix is in the
**source**: give it a `role`, a `<label for>`, or an `aria-label`. That leaves the app more usable
and keeps the tree free of test-only hooks.

## Waiting

**Await a positive signal before asserting an absence.** A component that renders `null` while its
query is pending is already empty at t=0, so
`waitFor(() => expect(container).toBeEmptyDOMElement())` resolves on its first poll and passes
whether or not the behaviour works. This shipped once, in `account-menu.spec.tsx`, and counted as
coverage until it was deleted.

Wait for something that proves the async work finished — `await screen.findByRole(...)`, or a hook's
`isPending` going false — and assert the absence after it.

Prefer `find*` over `waitFor` wrapped around `get*`; it is the same wait with the retry built in.

## jsdom vs Playwright

Reach for Playwright when a test needs **layout** — positioning, viewport overflow, animation
timing, hover and drag. A click is not layout: Base UI menus and sheets open on plain JS state and
open, click through and assert fine in jsdom, with no polyfills. `src/test/setup.ts` holds the long
form of this next to the one stub that exists.
