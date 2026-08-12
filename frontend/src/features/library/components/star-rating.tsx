import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';

import { STARS, starFillPercent } from '../utils/star-fill';

// Ratings are Decimal(3,2), 1.00-5.00. No glyph exists for a quarter star, so this is
// two identical rows of five stacked, the filled one clipped to the score.
//
// `rating` arrives as a string because JSON has no decimal type; converting here rather
// than at each call site keeps the precision question in one place.
//
// The wrapper carries the whole meaning as one label. Both rows are aria-hidden --
// without that a screen reader reads ten stars and no number.
export function StarRating({ rating }: { rating: string }) {
  const value = Number(rating);
  const width = starFillPercent(value);

  return (
    <span
      role="img"
      aria-label={`Rated ${value} out of 5`}
      className="relative inline-flex w-fit shrink-0"
    >
      <span aria-hidden="true" className="flex text-muted-foreground/40">
        {STARS.map((i) => (
          <HugeiconsIcon key={i} icon={StarIcon} size={16} fill="none" className="shrink-0" />
        ))}
      </span>

      {/* Clipped to the score. `overflow-hidden` on a width-constrained overlay is what
          makes a partial star possible; the row underneath shows through the rest. Both
          rows must stay geometrically identical, hence shrink-0 on each. */}
      <span
        aria-hidden="true"
        style={{ width: `${width}%` }}
        className="absolute inset-y-0 left-0 flex overflow-hidden text-amber-500"
      >
        {STARS.map((i) => (
          <HugeiconsIcon
            key={i}
            icon={StarIcon}
            size={16}
            fill="currentColor"
            className="shrink-0"
          />
        ))}
      </span>
    </span>
  );
}
