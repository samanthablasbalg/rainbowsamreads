import { StarRows } from './star-rows';

// `rating` arrives as a string because JSON has no decimal type -- the column is
// Decimal(3,2), 1.00-5.00.
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
