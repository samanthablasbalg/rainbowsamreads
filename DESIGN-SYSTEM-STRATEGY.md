# Design System Strategy

Working doc for the Storybook design-system effort. Not a checklist, not a progress tracker.
Where we currently are in the phases is communicated by the owner at the start of a session —
do not look for a status marker here and do not propose updating this doc when a phase
completes.

**Update this doc only when a foundational decision changes.** Example of a change that
warrants an edit: "we decided Material will no longer own colour tokens, Tailwind will."
Example of a change that does not: "we finished the button atom."

---

## What this branch is

A **foundation**, not a migration. The deliverable is at least three atoms that exist, are
well built, and are documented in Storybook — living *alongside* the current app, not
replacing anything in it. The running app keeps behaving exactly as it does today. Nothing
built here gets wired into a real page on this branch.

Refactoring the existing app to use these atoms is later work, in later PRs.

## The clean-room rule

**Do not cite the existing frontend implementation, or the existing "design system"
document, as justification for any design decision.** This effort exists because those
things accumulated problems; they are not evidence about what is correct.

Justification comes from Material's own guidance, Tailwind's own guidance, and general
atomic-design practice.

Permitted: reporting neutral inventory as *data about what the app will eventually need to
absorb* — "a text input appears in N places, in these three variants." Not permitted: "the
design system doc says X, therefore the atom must be X." If the urge arises to reach for the
old code to defend a choice, that is the signal that there is no actual reason for the
choice.

## The problem underneath

Material and Tailwind are not inherently in tension. They are in tension when both are
allowed to style the same thing. `!important` is the symptom of two systems arguing over the
same CSS property.

Previous attempts at this work rabbitholed because they started from "make this one Material
component match the mockup," which is unwinnable one component at a time. So the first thing
produced is not a component — it is a written rule about which tool owns what. Everything
after is downstream of that rule.

## Why the component APIs are the real product

A design agent cannot read intent, but it can read a component's public API. If a mockup has
to be expressible as `<rt-button variant="…" size="…">` plus Tailwind layout utilities, the
mockup cannot invent spaghetti — the available vocabulary constrains it.

That makes the atoms' props more important than their pixels.

---

## Phases

### Phase 0 — Read-only reconnaissance

Mechanical facts only, no opinions collected:

- Tailwind major version (v3's JS config vs v4's CSS-first config changes everything
  downstream)
- Angular Material version, and whether it is on M3 theming
- How Storybook was wired up
- Whether all of the above are on current releases

### Phase 1 — The contract, written before any code

The proposed rule, subject to the owner's approval, amendment, or rejection:

- **Tailwind owns the space *between* components** — layout, grid/flex, gaps, page
  structure, responsive rearrangement.
- **Material owns the space *inside* components** — colour, typography, elevation, states,
  focus rings, accessibility semantics.
- **A Tailwind utility never targets a node Material rendered.** If a Material component
  looks wrong, it is changed through Material's token overrides, not by out-specificity-ing
  the rendered CSS.
- **One palette, not two.** Material's theme defines colour once; Tailwind's theme points at
  those same CSS custom properties, so `bg-surface` in a template and Material's internal
  surface colour are the same value by construction and cannot drift.

The one-palette point is the centrepiece. The token bridge must be verified to be purely
additive — zero rendered change in the running app — rather than assumed to be.

### Phase 2 — Responsiveness infrastructure, before atoms

Tailwind's **default breakpoints, unmodified.** There is no reason to invent custom ones and
every reason not to.

Wired into Storybook one way: **viewport presets named for the breakpoints**, alongside the real
devices being designed for, via `parameters.viewport.options`. Viewports are Storybook's own
mechanism for responsive work, and replacing its stock set is the documented way to customise
them.

**A resizable-container decorator was considered and deliberately not built.** The argument for
one was that it lets a component be exercised at 320px *wide* while the browser window stays
large — the only way to reason about a component's responsiveness independent of the screen it
happens to sit on, with container queries making that first-class rather than simulated. That
argument still stands on its merits.

It was declined on cost. Storybook has no first-party support for it — nothing built in, and the
community addons that do it have negligible adoption and declare no version support. Building
one means a custom decorator that wraps every story in markup which Chromatic then snapshots and
axe then inspects: a permanent fixture inside every test, maintained here, for cases the viewport
presets mostly already reach. Wrapper decorators are a documented, ordinary use of decorators, so
this is a judgement about cost rather than a rule against the technique.

Revisit if an atom turns out to respond to its container rather than the viewport in a way the
presets cannot express.

### Phase 3 — Atoms, one at a time

For each atom: describe the API and variants and why → owner approves → build → stories.
Each atom is its own gate.

### Phase 4 — Molecule / organism, only if one earns it

A molecule that does not stress the responsiveness question is not worth building on this
branch.

---

## Explicitly out of scope

Say "that is out of scope" out loud if the work drifts toward any of these. Each is a
rabbithole with no floor:

- Retheming the app
- Touching existing components
- Chasing pixel-parity with any current screen
- Density / typography-scale bikeshedding
- Building an atom "so it can drop into page X"

## Working conventions for this effort

- Several throwaway `.md` capture docs are expected at the repo root during this work. They
  can be ignored once real code starts landing; some may become real documentation at the
  end. Suggest capturing a decision in one when a decision is worth not re-litigating.
- Subtle visual changes to the app's eventual look are acceptable. Simplification and
  removing tech debt outrank preserving the current appearance.
- Material stays. Components are not home-rolled.
