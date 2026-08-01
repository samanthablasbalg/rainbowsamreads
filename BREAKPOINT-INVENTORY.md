# Breakpoint inventory

Capture doc. Records what responsive boundaries exist in the app today and a proposal for
stopping new ones from appearing. **Nothing here is work for the Storybook design-system
branch** — touching existing components is out of scope there. This exists so the problem is
written down instead of remembered.

Companion to [DESIGN-SYSTEM-STRATEGY.md](./DESIGN-SYSTEM-STRATEGY.md).

Line numbers are accurate as of 2026-07-31 and will drift. The file names won't.

---

## The short version

Tailwind's breakpoints are unmodified and almost entirely unused. Responsiveness in this app
is instead spread across three unrelated mechanisms, using four different numbers to mean
"mobile".

## Tailwind is stock

There is no `tailwind.config.*` anywhere — Tailwind is v4 (CSS-first config), configured in
`frontend/src/styles.css`. That file's `@theme static` block defines colours, fonts, and a
type scale. It contains **no `--breakpoint-*` entries** — neither overrides nor
`--breakpoint-*: initial` removals.

So the breakpoints in effect are Tailwind's defaults, from
`node_modules/tailwindcss/theme.css`:

| name  | value  | px   |
| ----- | ------ | ---- |
| `sm`  | 40rem  | 640  |
| `md`  | 48rem  | 768  |
| `lg`  | 64rem  | 1024 |
| `xl`  | 80rem  | 1280 |
| `2xl` | 96rem  | 1536 |

They are barely used. Across the entire app there is **one** Tailwind responsive variant — a
single `md:`. No `max-*:` variants, no arbitrary `min-[…]:` / `max-[…]:`, no container-query
variants.

This is why "no breakpoints are overridden" is a misleading way to describe the situation. The
system isn't under control; it's idle, while the work happens elsewhere.

## Where the actual breakpoints are

All paths relative to `frontend/`.

| where                             | value                                                                                                                    | mechanism                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `src/app/currently-reading/currently-reading.ts:68` | `(max-width: 599px)`                                                                                    | CDK `BreakpointObserver`, inline string |
| `src/app/read/read.ts:139`        | `(max-width: 599px)`                                                                                                       | same                                  |
| `src/app/book-list/book-list.ts:89` | `(max-width: 599px)`                                                                                                     | same                                  |
| `src/app/search-panel/search-panel.ts:20` | `(max-width: 599px)`, as `MOBILE_BREAKPOINT` (used at `:261`)                                                      | same                                  |
| `src/app/nav-shell/nav-shell.ts:36` | `(max-width: 599.98px), (min-width: 600px) and (max-width: 959.98px) and (orientation: landscape) and (pointer: coarse)`, as `TOUCH_HANDSET` | same |
| `src/app/landing/landing.css:128` | `@media (max-width: 720px)`                                                                                                | raw CSS                               |
| `src/app/landing/features/features.css:65` | `@media (max-width: 720px)`                                                                                       | raw CSS                               |
| `src/app/landing/hero/hero.css:142` | `@media (max-width: 720px)`                                                                                              | raw CSS                               |
| `src/app/landing/differentiators/differentiators.css:60` | `@media (max-width: 720px)`                                                                         | raw CSS                               |
| `src/app/landing/insights-band/insights-band.css:55` | `@media (max-width: 720px)`                                                                             | raw CSS                               |

Ten sites, three mechanisms.

### Notes on specific entries

- **599 vs 599.98.** These are the same intended boundary written two ways. `599.98` is the
  correct form when pairing with a `min-width: 600px` query; the bare `599` leaves a 1px gap
  where neither side matches. Both forms exist in the app.
- **599.98 is Material's M2 `XSmall` edge**, and CDK exports it as `Breakpoints.XSmall`. It is
  hand-written as a string in all five TypeScript sites rather than imported.
- **`TOUCH_HANDSET`** is a hand-rolled superset of CDK's `Breakpoints.Handset` (XSmall portrait
  plus Small landscape) with an extra `pointer: coarse` clause. Whatever its merits, it is a
  bespoke definition of "phone" that exists in exactly one file and is not reused by the four
  screens that also branch on phone-ness.
- **720 matches nothing** — not Tailwind, not Material, not CDK. It appears only in the landing
  page's five CSS files.

### The count that matters

Four numbers currently mean "mobile" in this codebase:

- **599** — four screens
- **599.98** — nav shell
- **720** — landing page
- **640** — Tailwind's `sm`, available and unused

## Proposal: how to lock this down

The rule is one line: **no new breakpoints. Tailwind's five defaults, unmodified, are the
only ones.**

Enforcing it is the part worth thinking about, because of one detail: **five of the ten sites
are media-query strings inside TypeScript.** Stylelint cannot see them. ESLint's CSS tooling
cannot see them. Tailwind cannot see them. Any control built on a CSS linter covers the last
five rows of the table and silently ignores the first five — which is worse than no control,
because it reports green.

So the proposal is deliberately blunt:

1. **A CI grep** over `frontend/src/` for `(max-width:` and `(min-width:`, failing the build on
   any hit. It is not clever, but it is the only mechanism that sees TypeScript strings,
   component CSS, and templates with one rule.
2. **An allowlist file** holding today's ten sites. New violations fail; existing ones don't.
   The allowlist is a debt list that can only shrink — every migration PR deletes lines from
   it, and it's obvious when someone tries to add one.
3. **The written rule** alongside it, so the grep has a stated reason and isn't cargo-culted.

The allowlist matters more than it looks. Grandfathering the existing ten by excluding whole
files would make them invisible; enumerating them keeps the debt countable.

### Splitting templates out doesn't change the count

Migrating the remaining components from inline `template:` to `templateUrl` leaves all ten sites
exactly where they are. `currently-reading.ts` and `search-panel.ts` are already on `templateUrl`
and still hold their query strings — one inside a method, one as a module-level `const` above the
`@Component` decorator. `BreakpointObserver` is imperative, so the string is an argument in
component logic, never markup. The landing page's `@media` blocks are already in `styleUrl` files.

It does help a category that doesn't exist yet. Arbitrary Tailwind variants in markup
(`min-[900px]:flex`) currently sit inside TypeScript backticks in 17 components, where only a raw
grep can see them. Once templates are `.html`, `@angular-eslint`'s template processor can lint
them properly. That's a reason to finish the split, but not one that shrinks this table.

### Not covered by this

Adding a `--breakpoint-*` entry to `styles.css`, or overriding one, wouldn't be caught by a
grep for media-query syntax. That's a second, much smaller check — the `@theme` block should
contain no `--breakpoint-` string at all.

## Testing at the edges

`frontend/.storybook/preview.ts` now carries a viewport dropdown of seven entries: the five
Tailwind breakpoints plus the two real devices. Storybook's stock `MINIMAL_VIEWPORTS` were
replaced rather than merged, and the 44-device `INITIAL_VIEWPORTS` set was left out.

**Deferred, worth doing:** a second entry one pixel *below* each breakpoint — 639, 767, 1023,
1279, 1535.

A `min-width` breakpoint changes behaviour between N-1 and N, so a preset sitting exactly on the
boundary only ever shows the at-or-above side. The layout that actually breaks is almost always
the one immediately below it, and nothing in the dropdown currently renders that. A pair — the
boundary and one below — brackets the change and makes the transition visible in two clicks.

The cost is a twelve-entry dropdown instead of seven. That is the only reason it was deferred.

### Where the real devices fall

Measured CSS pixels, not spec-sheet resolution — the two differ by device pixel ratio.

| device                | CSS width | lands                        |
| --------------------- | --------- | ---------------------------- |
| Pixel 8 Pro           | 448       | below `sm` — base styles     |
| Tab S9 FE, portrait   | 744       | between `sm` and `md`        |
| Tab S9 FE, landscape  | 1190      | between `lg` and `xl`        |

The tablet is the surprise. At 744 in portrait it sits **below `md` (768)**, so under Tailwind's
defaults it gets the small-screen layout rather than the tablet layout you would assume it gets.
It clears `sm` and nothing else.

## What this doesn't decide

Where each of the ten sites should land once Tailwind's scale is the only vocabulary. `599px`
and `640px` are not the same boundary, so the migration is a behaviour change per screen, not a
find-and-replace. That's design work for whenever this is picked up — explicitly not done here.
