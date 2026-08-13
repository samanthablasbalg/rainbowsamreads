import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';

import { STARS, starFillPercent } from '../utils/star-fill';

// The two stacked rows both star widgets are built from: five muted stars, and five amber
// ones over them clipped to the score. `overflow-hidden` on a width-constrained overlay is
// what makes a partial star possible; the row underneath shows through the rest.
//
// Shared because the two rows have to stay geometrically identical -- hence `shrink-0` on
// every glyph -- and a second copy at a second size is exactly how that stops being true.
// Taking `value` rather than a percentage keeps the fill maths here too, so a caller
// cannot clip to a scale the other one is not using.
//
// Both rows are aria-hidden: ten stars and no number is worse than nothing. The meaning
// belongs to the caller's wrapper, which is also what has to be positioned -- the fill row
// is absolute, and the callers' wrappers are `relative` for their own reasons anyway.
export function StarRows({ value, size }: { value: number; size: number }) {
  return (
    <>
      <span aria-hidden="true" className="flex text-muted-foreground/40">
        {STARS.map((i) => (
          <HugeiconsIcon key={i} icon={StarIcon} size={size} fill="none" className="shrink-0" />
        ))}
      </span>

      {/* pointer-events-none so a click reaches whatever the caller puts underneath -- the
          editable widget lays a range input across the whole row. */}
      <span
        aria-hidden="true"
        style={{ width: `${starFillPercent(value)}%` }}
        className="pointer-events-none absolute inset-y-0 left-0 flex overflow-hidden text-amber-500"
      >
        {STARS.map((i) => (
          <HugeiconsIcon
            key={i}
            icon={StarIcon}
            size={size}
            fill="currentColor"
            className="shrink-0"
          />
        ))}
      </span>
    </>
  );
}
