import { StarRows } from './star-rows';

// Ratings are Decimal(3,2), 1.00-5.00. No glyph exists for a quarter star, so this is
// two identical rows of five stacked, the filled one clipped to the score -- StarRows.
//
// `rating` arrives as a string because JSON has no decimal type; converting here rather
// than at each call site keeps the precision question in one place.
//
// The wrapper carries the whole meaning as one label, which is why the rows themselves
// are aria-hidden -- without that a screen reader reads ten stars and no number.
export function StarRating({ rating }: { rating: string }) {
  const value = Number(rating);

  return (
    <span
      role="img"
      aria-label={`Rated ${value} out of 5`}
      className="relative inline-flex w-fit shrink-0"
    >
      <StarRows value={value} size={16} />
    </span>
  );
}
