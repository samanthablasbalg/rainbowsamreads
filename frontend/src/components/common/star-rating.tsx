import { StarRows } from './star-rows';

// `null` is unrated, drawn as the five empty stars, so a row holding a rating keeps its
// shape before there is one. Ratings off the API arrive as strings -- the column is
// Decimal(3,2) and JSON has no decimal type -- so callers reading one convert at that
// boundary rather than this component taking both types.
export function StarRating({ rating }: { rating: number | null }) {
  return (
    <span
      role="img"
      aria-label={rating === null ? 'Not rated' : `Rated ${rating} out of 5`}
      className="relative inline-flex w-fit shrink-0"
    >
      <StarRows value={rating ?? 0} size={16} />
    </span>
  );
}
