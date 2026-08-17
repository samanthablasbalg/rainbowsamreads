import { StarRows } from './star-rows';

// `rating` arrives as a string because JSON has no decimal type -- the column is
// Decimal(3,2), 1.00-5.00. `null` is unrated, drawn as the five empty stars, so a row
// holding a rating keeps its shape before there is one.
export function StarRating({ rating }: { rating: string | null }) {
  const value = rating === null ? 0 : Number(rating);

  return (
    <span
      role="img"
      aria-label={rating === null ? 'Not rated' : `Rated ${value} out of 5`}
      className="relative inline-flex w-fit shrink-0"
    >
      <StarRows value={value} size={16} />
    </span>
  );
}
