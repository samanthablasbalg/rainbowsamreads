import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';

const STARS = [0, 1, 2, 3, 4];

// How much of a star's box to reveal for a quarter, a half and three quarters of that
// star -- indexed by quarter, so [0] is an untouched star.
//
// Not 0/0.25/0.5/0.75. Clipping by width does not fill by area: a star's mass sits in
// the middle and both sides taper to points, so a linear cut shows far less than a
// quarter at 25% and far more than three quarters at 75%. These are the x offsets where
// the glyph's *area* actually reaches each fraction, measured off the StarIcon path
// (which spans x=2 to x=22 of its 24-unit viewBox) by flattening its curves and
// integrating. Two properties fall out that confirm the numbers: a half lands on 12/24,
// the star's own axis of symmetry, and the quarter and three-quarter offsets sum to 1.
//
// Ratings are validated server-side to 0.25 increments, so these three are the only
// partial states that exist -- there is nothing to interpolate.
const QUARTER_FILL = [0, 0.3556, 0.5, 0.6444];

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

  // Counting in quarters rather than subtracting a remainder keeps the index in range
  // whatever arrives, and every quarter is exactly representable in binary.
  const quarters = Math.round(value * 4);
  const width = ((Math.floor(quarters / 4) + QUARTER_FILL[quarters % 4]) / STARS.length) * 100;

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
