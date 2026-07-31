import { booleanAttribute, Component, computed, input, numberAttribute } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * - `inherit` — tracks the font size of the text the icon sits in, including when a
 *   reader has enlarged their browser's text.
 * - `standard` — 24px, `.mat-icon`'s default in Material's stylesheet and M3's standard
 *   icon size. For icons with no text to track: an icon-only button, a nav rail, a glyph
 *   in a grid cell.
 */
export type IconSize = 'inherit' | 'standard';

const SIZES: Record<IconSize, string> = {
  inherit: '1em',
  standard: '1.5rem',
};

/**
 * A single icon, drawn from Material Symbols.
 *
 * `name` is the icon's identity, not the mechanism that draws it, so the loading strategy
 * can change here without touching call sites.
 *
 * Not interactive. An icon that responds to a click is an icon button.
 */
@Component({
  selector: 'app-icon',
  imports: [MatIconModule],
  // TEMPORARY — delete `fontSet` below at the app-wide icon-font changeover.
  //
  // MatIcon's built-in default fontSet is ['material-icons', 'mat-ligature-font']
  // (MatIconRegistry, _icon-registry-chunk.mjs:43). That default is why no <mat-icon> in
  // this app has ever named a fontSet: it silently points every one of them at the legacy
  // Material Icons family. Naming fontSet here moves only this component to Material
  // Symbols, which is the sole reason the attribute exists — it buys "the running app is
  // untouched on this branch" and nothing else.
  //
  // At the changeover, in one commit:
  //   1. Call setDefaultFontSetClass('material-symbols-outlined', 'mat-ligature-font') on
  //      MatIconRegistry once at app startup.
  //   2. Delete the fontSet attribute below. The default then names the family, and
  //      leaving it means two places define it.
  //   3. Remove the Material Icons <link> from src/index.html and
  //      .storybook/preview-head.html, and their comments about the two families.
  //   4. Verify the app's existing icon names still resolve — Symbols renamed some glyphs,
  //      so this is a per-name check, not a find-and-replace.
  // The name is projected as content rather than passed to `fontIcon`, because the font
  // forms the glyph from the text itself. `fontIcon` would need the `mat-ligature-font`
  // class alongside the family class, and `fontSet` cannot carry two: its setter is
  // `value.trim().split(' ')[0]` (icon.mjs:179), so everything after the first token is
  // dropped. Reaching that path needs a registered font alias; content needs nothing.
  template: `<mat-icon inline fontSet="material-symbols-outlined" aria-hidden="true">{{
    name()
  }}</mat-icon>`,
  styles: `
    :host {
      display: inline-block;
      /* font-size is bound; width and height follow it via em, so the box stays square.
         mat-icon is in inline mode, which makes it inherit all four values from here,
         so no declaration in this component lands on a Material-rendered node. */
      width: 1em;
      height: 1em;
      line-height: 1;
      /* Drops the box below the baseline by roughly a descender, so size="inherit"
         sits level with the text it is beside. Ignored in flex and grid contexts. */
      vertical-align: -0.125em;
      flex-shrink: 0;
    }
  `,
  host: {
    '[style.font-size]': 'fontSize()',
    '[style.font-variation-settings]': 'variationSettings()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() ?? null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
})
export class IconComponent {
  /** Material Symbols ligature name, e.g. `menu_book`. */
  readonly name = input.required<string>();

  readonly size = input<IconSize>('inherit');

  /**
   * Unset: decorative, `aria-hidden`, absent from the accessibility tree.
   * Set: the host becomes `role="img"` with this as its accessible name.
   */
  readonly label = input<string>();

  /**
   * Renders the filled cut of the glyph instead of the outlined one. M3 uses fill to mark
   * an active or selected state — a filled nav icon for the current destination.
   */
  readonly fill = input(false, { transform: booleanAttribute });

  /** Stroke weight. The font's axis runs 100–700; its default is 400. */
  readonly weight = input(400, { transform: numberAttribute });

  /**
   * Grade — a finer adjustment than weight, which changes stroke thickness without
   * changing the glyph's width. The axis runs -50–200; -25 is the usual value for light
   * text on a dark ground, where strokes otherwise read too heavy.
   */
  readonly grade = input(0, { transform: numberAttribute });

  protected readonly fontSize = computed(() => SIZES[this.size()]);

  /**
   * All three axes are emitted together. `font-variation-settings` is all-or-nothing:
   * naming one axis resets every axis it does not mention to the font's default.
   *
   * `opsz` is omitted so `font-optical-sizing: auto` keeps deriving it from `font-size`.
   */
  protected readonly variationSettings = computed(
    () => `'FILL' ${this.fill() ? 1 : 0}, 'wght' ${this.weight()}, 'GRAD' ${this.grade()}`,
  );
}
