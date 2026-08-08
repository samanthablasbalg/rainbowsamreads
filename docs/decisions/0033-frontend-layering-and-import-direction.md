# 0033. Frontend layering and import direction

- Status: Accepted
- Date: 2026-08-03

## Context

The React app at `frontend/` is being built from scratch rather than ported. The whole reason for
that is structural: the previous frontend accumulated duplicated and tangled code, and nothing in
its shape made that harder to do than the alternative. So the replacement gets a layer structure
from the start, with the direction of dependencies enforced by tooling rather than remembered.

The shape was chosen up front — bulletproof-react's, with two rules: dependencies flow one direction
(shared → features → app), and features never import each other. `eslint.config.js` carried a
comment saying the import plugin was not wired up yet because it "has nothing to enforce until
`features/` exists."

By the end of the nav shell work, `features/` existed and the plugin still wasn't wired. A review
found the rule already broken, at roughly 1,400 hand-written lines across forty files:

```ts
// src/components/nav/account-menu.tsx
import { useTheme } from '@/app/theme-context';
import { useAuth } from '@/features/auth/api/use-auth';
```

`components/` is the layer `app/` and `features/` are supposed to depend on. This file reached up
into both, producing a directory-level cycle: `app/layouts/authenticated-shell` →
`components/nav/account-menu` → `app/theme-context`. It fails silently — nothing errors, the shared
layer just stops being readable without knowing the whole app.

The instructive part is _why_ it happened, because nobody ignored the rule. The account menu is
chrome: it renders on every screen and it needs the session and the current theme. It had no legal
way to reach either, because `auth` had been filed under `features/` and `theme` under `app/`. Both
are ambient application state — neither is a destination, neither is routing. The structure had no
slot for "a cross-cutting concern a shared component legitimately needs," so the only way to write
the component was to break the rule.

A lint rule alone would have caught the import. It would not have said where `auth` belongs. This
decision has to answer both, or the same pressure produces the same violation somewhere else.

## Decision

### The layers

```
src
├── api          # the orval-generated client and its axios mutator
├── app          # composition root: router.tsx, provider.tsx, routes/
├── components   # shared presentational code: ui/ (shadcn primitives), layouts/, common/
├── config       # global configuration: route paths, env
├── features     # feature modules, each owning its api/, components/, hooks/, types/
├── lib          # application infrastructure: auth, theme, configured libraries
└── test         # test helpers and the MSW server
```

`hooks/`, `types/` and `utils/` get added when a step demands them, not up front.

### Import direction

1. **Dependencies flow one direction: shared → features → app.** Shared layers (`api`, `components`,
   `config`, `lib`) may not import from `features/` or `app/`. `features/` may not import from
   `app/`.
2. **Features never import each other.** Anything two features need is promoted to a shared layer.

Enforced by `eslint-plugin-import`'s `import/no-restricted-paths`, not by discipline:

```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/features', from: './src/app' },
    {
      target: ['./src/api', './src/components', './src/config', './src/lib'],
      from: ['./src/features', './src/app'],
    },
    // Added per feature as features land:
    // { target: './src/features/books', from: './src/features', except: ['./books'] },
  ],
}]
```

`src/test/` is deliberately unrestricted — test helpers compose the real provider stack, so they
import across layers by design.

### Where a thing goes

The rule above says which imports are legal. This says which layer a new thing belongs in, which is
the question that actually got answered wrong:

- **`features/`** — a slice of the product a user navigates to, owning its own data access and
  screens. If nothing routes to it, it is not a feature.
- **`lib/`** — application infrastructure. Ambient state and configured libraries that any layer may
  legitimately consume: the session, the theme, the query client. The test is whether shared chrome
  needs it. If a component in `components/` has a legitimate need for it, it belongs here, because
  the alternative is an upward import.
- **`utils/`** — pure functions that know nothing about this app. The line against `lib/` is
  self-knowledge, not size: `lib/` holds the app's _configured instance_ of something (our axios,
  our auth, our query client) and imports our own code; `utils/` holds code that could be pasted
  into an unrelated project unchanged. Roughly, `utils/` is what you could publish to npm and `lib/`
  is the wiring that makes a dependency ours.
- **`components/`** — shared presentational code. May consume `lib/`, never `features/` or `app/`.
  Three subdirectories, named by ownership or concern, and **nothing at its root**:
  - **`ui/`** — the primitive layer: domain-agnostic building blocks, added by `npx shadcn add`.
    shadcn copies source into the project, so we own these files and edit them freely. What we do
    not own is their **export structure** — the registry ships `buttonVariants` alongside `Button`,
    and every future `shadcn add` reintroduces that shape — which is why the react-refresh exemption
    in `eslint.config.js` is scoped to this directory alone. The entry test is primitive vs domain,
    not who wrote it: a component that knows what a reading streak is belongs in `common/` however
    generic it looks. Deliberately narrower than bulletproof-react's `ui/`, which is their entire
    shared UI kit; ours stops at primitives.
  - **`layouts/`** — page chrome. One directory per layout, holding that layout and its parts. A
    part with one consumer lives with its layout.
  - **`common/`** — hand-written shared components that are neither a vendored primitive nor page
    chrome. Where a component lands when it outgrows one layout or is needed by two features. Entry
    condition is a second consumer; one consumer means it stays where it is.
- **`app/`** — composition only: the router, the provider stack, and route modules. Not a home for
  logic that something else needs to reach.
- **`config/`** — values with no behaviour, including route paths.
- **`api/`** — the generated client. Regenerated, not edited; the hand-written mutator lives beside
  it.

**One deliberate exception.** `cn()` lives in `src/lib/utils.ts`, and by the test above it is a
`utils/` function — it knows nothing about this app. It stays in `lib/` because `components.json`
points shadcn's `utils` alias at `@/lib/utils`, and every `npx shadcn add` generates
`import { cn } from '@/lib/utils'`. Moving it means either rewriting that import on every future
component add or diverging from the generator. The tooling wins; this is the exception, not a
softening of the rule.

Applied to what exists, this moves five things:

| Thing                                                                                     | From                                                | To                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| `use-auth`                                                                                | `features/auth/api/`                                | `lib/`                                    |
| `theme-context`, `theme-provider`                                                         | `app/`                                              | `lib/`                                    |
| `authenticated-shell`                                                                     | `app/layouts/`                                      | `components/layouts/authenticated-shell/` |
| `rail-nav`, `mobile-nav`, `account-menu`, `wordmark`, `streak-indicator`, `search-button` | `components/nav/`                                   | `components/layouts/authenticated-shell/` |
| route paths                                                                               | `components/nav/destinations.ts` + `app/router.tsx` | `config/`                                 |

The six nav parts move because none of them is shared: every consumer is the shell or another nav
part. A top-level `components/nav/` claimed a generality that doesn't exist. `no-restricted-paths`
would never have caught this — `components/nav/` importing `components/layouts/` is shared → shared
— which is why the classification test above has to carry weight the lint rule can't.

`features/` is empty afterwards. That is the correct state: there are no features yet. Books,
editions and engagements will be the first.

## Consequences

**Makes easy:**

- The violation that motivated this can't recur silently — `npm run lint` fails on it, and lint is
  wired to fail the build on warnings.
- "Where does this go?" has an answer that doesn't depend on taste, and the answer is checkable
  against the same test each time.
- Shared code stays readable on its own. `components/` and `lib/` can be understood without knowing
  what features exist, which is what keeps them reusable rather than nominally reusable.
- Features stay deletable. Nothing outside a feature imports into it, so removing one is removing a
  directory.

**What we accept:**

- `lib/` is the layer most likely to become a junk drawer, because "infrastructure" is elastic. The
  test above is the guard, and it is judgment, not lint. A thing that only one feature uses belongs
  to that feature even if it feels infrastructural.
- The zones list needs a line per feature to block cross-feature imports. Forgetting one silently
  loses that protection for that feature.
- Moving a file between layers is a real edit — the import paths change everywhere. This is cheap
  now and gets more expensive; the moves above were made at forty files precisely for that reason.
- `import/no-restricted-paths` checks paths, not semantics. It cannot tell a legitimate `lib/`
  import from a thing that should have been a feature.

## Alternatives considered

- **Convention only, no lint rule** — this is what was already in place, in punch list § 0 and in a
  comment in `eslint.config.js`. It produced a violation in the first component that needed data. A
  layer rule that lives only in a folder name has a 100% eventual violation rate.
- **Move `components/nav/` and the shell up into `app/`**, treating them as app chrome rather than
  shared components. Rejected: it reads as a fix because it removes the illegal import, but it
  relocates the wrong file. `components/layouts/` is where layouts belong, and the actual problem
  was below it — `auth` and `theme` being unreachable from the shared layer. Moving the consumer
  would have left the next shared component that needs the session in exactly the same position.
- **Keep `auth` in `features/` and make the account menu dumb**, taking `user`, `isDark`,
  `onToggleTheme` and `onLogout` as props from the shell. Legal, and genuinely defensible for one
  component. Rejected because it scales badly: every shared component that needs ambient state
  becomes a prop-drilling chain through the shell, and the shell accumulates wiring for things it
  doesn't otherwise care about.
- **A single `src/` with no layers, organised by feature only.** Rejected as the shape the migration
  exists to get away from — it has no home for genuinely shared code, so shared code either gets
  duplicated per feature or lives in whichever feature wrote it first.

## Revisit when

The `lib/` test ("does shared chrome legitimately need it?") is the part most likely to need
sharpening once real features land — if `lib/` starts collecting things only one feature imports,
the answer is to push them down into that feature, not to loosen the test. Revisit the zones
themselves if `hooks/`, `types/` or `utils/` get added, since each needs to join the shared-layer
target list to be protected.
