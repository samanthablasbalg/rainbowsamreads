# Palette contract

Settled at the end of Phase 1. Records decisions so they are not re-litigated. Only edited if a
decision is deliberately reversed.

Companion to [DESIGN-SYSTEM-STRATEGY.md](./DESIGN-SYSTEM-STRATEGY.md).

## The four rules

1. **Material owns the M3 role set.** Every role M3 defines is generated. No hex is authored by hand
   for any role M3 already has.
2. **Tailwind aliases those roles** into utility namespaces, and defines only what M3 has no opinion
   about — brand colours, chart series, pastel tints, font families.
3. **Tailwind owns the space between components** — layout, grid, flex, gaps, responsive
   rearrangement.
4. **A Tailwind utility never targets a node Material rendered.** Material components change through
   token overrides, never by out-specificity-ing rendered CSS.

---

# Where this stands

**Done and committed.** The two generated palettes live at `src/themes/_light.scss` and
`src/themes/_dark.scss`. Nothing consumes them yet — they are inputs sitting in the repo. Their
header comments record the seeds they came from.

**Not done.** Everything that would make the app use them: rewriting `src/material-theme.scss`,
repointing `src/styles.css`, and turning the a11y check from reporting to failing. All three are
described under [What remains](#what-remains).

**Deliberately deferred.** Switching the app over changes its colours everywhere at once. That is a
migration, and this branch is not the migration branch — the atoms should be the first thing to
consume the new tokens.

---

# What remains

## `src/material-theme.scss`

Replace the current contents with this. It has been compiled with the `sass` package against the
committed palettes and verified to emit the values shown below — it is not a sketch.

```scss
@use '@angular/material' as mat;
@use 'sass:map';
@use './themes/light' as light;
@use './themes/dark' as dark;

$font-serif: ('Lora', serif);
$font-sans: ('Plus Jakarta Sans', sans-serif);

:root {
  @include mat.theme(
    (
      color: (
        primary: light.$primary-palette,
        theme-type: light,
      ),
      typography: (
        plain-family: $font-sans,
        brand-family: $font-serif,
        medium-weight: 600,
        bold-weight: 700,
      ),
      density: 0,
    )
  );
  @include mat.theme-overrides(
    (
      primary: map.get(light.$primary-palette, 60),
      on-primary: map.get(light.$primary-palette, 10),
    )
  );
}

@media (prefers-color-scheme: dark) {
  :root {
    @include mat.theme(
      (
        color: (
          primary: dark.$primary-palette,
          theme-type: dark,
        ),
      )
    );
    @include mat.theme-overrides(
      (
        primary: map.get(dark.$primary-palette, 60),
        on-primary: map.get(dark.$primary-palette, 10),
      )
    );
  }
}
```

`mat.theme()` is invoked twice because one neutral ramp cannot be warm cream at tone 98 and plum at
tone 10. Material's colour config accepts a `theme-type` of `light | dark | color-scheme` — see
`node_modules/@angular/material/core/tokens/_system.scss`.

**What it emits.** Plain hex in two blocks, no `light-dark()` anywhere:

```css
:root {
  --mat-sys-primary: #b8006a; /* M3's tone 40 … */
  --mat-sys-on-primary: #ffffff;
  --mat-sys-surface: #fef9f1;
  --mat-sys-outline-variant: #cfc5b9;
  --mat-sys-primary: #ff469e; /* … re-declared by the override */
  --mat-sys-on-primary: #3e0020;
}
@media (prefers-color-scheme: dark) {
  :root {
    --mat-sys-primary: #ffb0cb;
    --mat-sys-surface: #161219;
    --mat-sys-primary: #ff469e;
    --mat-sys-on-primary: #3e0020;
  }
}
```

The overrides work by cascade order, so the raw M3 value is still present above each one. Harmless,
but expect to see both when reading compiled CSS.

## `src/styles.css`

Tailwind stops holding colour values. `@theme` becomes aliases onto the M3 roles, plus the tokens M3
has no role for.

```css
@import 'tailwindcss';

@theme static {
  --color-surface: var(--mat-sys-surface);
  --color-on-surface: var(--mat-sys-on-surface);
  --color-primary: var(--mat-sys-primary);
  --color-on-primary: var(--mat-sys-on-primary);
  --color-outline: var(--mat-sys-outline-variant);
  /* …one alias per role actually used in templates */

  /* Brand and data — M3 has no role for these, so they are authored. */
  --color-brand-pink: #e11584;
  --color-brand-orange: #ff7a2f;
  /* chart series and pastel tints keep their existing values */
}
```

Keeping the existing token *names* and only repointing them means **no template changes** —
`text-muted` keeps working, it just resolves to `on-surface-variant` instead of a literal. The visual
effect is wide; the edit is one file.

Tokens with no M3 role that stay authored: `muted-strong`, `hover`, `success`, `track`, and the
orange. `muted-strong` may stop being needed entirely — it exists only because `muted` measured
3.8–4.1:1, and `on-surface-variant` is contrast-guaranteed by construction.

`static` stays. Tailwind v4 tree-shakes `@theme` entries no template references yet, which would
silently drop tokens registered for later use.

This is the one piece not yet compiled and checked.

## The a11y setting

`.storybook/preview.ts` has `a11y: { test: 'todo' }`, which reports violations without failing. It
needs `'error'` once the atoms land.

---

# The decisions

## Seeds

| seed            | light palette     | dark palette                        |
| --------------- | ----------------- | ----------------------------------- |
| primary         | `#e11584`         | `#e11584`                           |
| neutral         | `#fbf6ee` (cream) | `#18131b` (the app's existing plum) |
| neutral-variant | `#efe4d8`         | `#efe4d8`                           |
| tertiary        | unseeded          | unseeded                            |

Resulting grounds: light `#fef9f1`, dark `#161219`.

## The two overridden roles

`primary` → tone 60 and `on-primary` → tone 10, in both schemes. Chosen by looking at rendered cards
in Lora and Plus Jakarta Sans at the real 16px/700 button size — not from the numbers.

|       | fill      | label     | label contrast | edge vs its ground |
| ----- | --------- | --------- | -------------- | ------------------ |
| light | `#ff469e` | `#3e0020` | 5.40:1         | 3.03:1             |
| dark  | `#ff469e` | `#3e0020` | 5.40:1         | 5.85:1             |

Both are `map.get` lookups into the generated ramp — **no hex is written**. Reseed and they follow.

This pairing is not one M3 blessed; M3 assigns 40/100 in light and 80/20 in dark. It is therefore the
one contrast relationship this project owns rather than inherits — one pair, versus roughly thirty if
colour values were authored by hand, which is the entire reason for rule 1. Axe's `color-contrast`
rule guards it on any rendered story containing a primary button.

## The brand bucket

Authored by hand, deliberately outside the role set, **decorative only — no small text ever sits on
these**, so they carry no contrast obligation.

| token        | value                          |
| ------------ | ------------------------------ |
| brand pink   | `#e11584` light / `#ff5fab` dark |
| brand orange | `#ff7a2f`                      |
| chart series | the existing eight             |
| pastel tints | the existing six               |

The orange lives here because that is what it already is. All five of its uses today are the logo
gradient, the avatar gradient, an ambient glow, one categorical card accent, and one eyebrow label —
and in `features.ts` it is used interchangeably with `--color-chart-3`. It is never a UI role, so it
does not become `tertiary`.

---

# Constraints found along the way

Recorded so they are not rediscovered the hard way.

- **Tone is lightness.** HCT tone is CIE L\*, so tone 40 is L\*40 no matter what is seeded. Five
  different bright pink seeds all produced effectively the same `primary` (`#b8006a`–`#b90068`).
  Reseeding cannot make a role brighter.
- **The pink tones are gamut-limited.** `#b8006a` has green at 0; `#ffb0cb` has red clipped at 255.
  Both sit on the sRGB boundary — there is no more saturated pink at those lightnesses.
- **Tone 50 is unusable.** 4.48:1 with a white label, 3.82:1 with a dark one. It falls exactly where
  neither direction clears, which is why M3 skips from 40 to 80.
- **Light mode has a ceiling.** WCAG 1.4.11 wants 3:1 between a control and its background. Tone 60
  on the cream ground is 3.03:1 — anything lighter fails, so tone 60 is the brightest fill the light
  scheme can hold.
- **Contrast thresholds depend on size and weight, never typeface.** Under 24px, or under 18.66px
  bold, the bar is 4.5:1. The app's primary button is 16px/700, so 4.5:1 applies.
- **Unseeding tertiary changes only the tertiary ramp.** Confirmed by diffing: the primary, neutral
  and neutral-variant ramps are byte-identical to the palettes the visual decisions were made
  against.

---

# If the palettes ever need regenerating

Not needed unless a seed changes. Run from `frontend/`, one at a time:

```bash
ng generate @angular/material:theme-color \
  --primary-color='#e11584' \
  --neutral-color='#fbf6ee' \
  --neutral-variant-color='#efe4d8' \
  --include-high-contrast=false --is-scss=true
```

Repeat with `--neutral-color='#18131b'` for the dark palette. Then move the output over
`src/themes/_light.scss` and `src/themes/_dark.scss`.

- **`--directory` is ignored.** Output lands as `_theme-colors.scss` at the Angular workspace root
  and must be moved. Move the first before running the second or it fails on a name collision.
- **`--neutral-variant-color` must be given.** Left blank it derives from the _primary_, which
  produces pink outlines and a visibly pink `surface-variant`.
- **`tertiary` is left unseeded deliberately** — the orange is not an M3 role.

# Explicitly not settled here

Typography, density, breakpoints, the Storybook viewport setup, and the atoms themselves.
