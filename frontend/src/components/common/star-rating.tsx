import { StarRows } from './star-rows';

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
