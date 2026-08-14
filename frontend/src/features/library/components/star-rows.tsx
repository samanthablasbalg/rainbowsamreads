import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';

import { STARS, starFillPercent } from '../utils/star-fill';

// `overflow-hidden` on a width-constrained overlay is what makes a partial star possible,
// and `shrink-0` is what stops flex compressing the glyphs and detuning the fill maths.
//
// Both rows are aria-hidden -- ten stars and no number is worse than nothing -- so the
// caller's wrapper carries the label. That wrapper also has to be `relative`, since the
// fill row is absolute.
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
