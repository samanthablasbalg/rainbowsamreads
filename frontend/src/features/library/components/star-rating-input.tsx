import { cn } from '@/lib/utils';
import { STARS } from '../utils/star-fill';
import { StarRows } from './star-rows';

const STAR_SIZE = 32;

// A transparent range input laid over the rows, which is what makes a quarter star
// reachable by mouse, touch drag and arrow key. `step={0.25}` is the server's increment.
//
// The range runs 0-5, not the API's 1-5, so the scale lines up with the stars: at min={0}
// a value is exactly `value / 5` across the track, the same fraction the fill overlay
// uses. Starting at 1 would drift by most of a star. That leaves 0 reachable, which is
// how the API's `rating: null` is entered -- ReviewSheet translates it on the way out.
export function StarRatingInput({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  // An inline width, not w-fit, because it has to beat a vertical Field's `*:w-full`.
  // Both the track and the fill overlay are measured against this box, so a stretched one
  // runs the track past the last star and detunes the whole control.
  return (
    <span
      style={{ width: STARS.length * STAR_SIZE }}
      className={cn(
        'relative inline-flex rounded-lg has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        className
      )}
    >
      <StarRows value={value} size={STAR_SIZE} />

      {/* -inset-y-2 gives a taller touch target than the glyphs without widening the
          track, which has to stay exactly as wide as the five stars. aria-valuetext
          because "3.25" alone is read without its scale, and 0 is a named state rather
          than a number. */}
      <input
        id={id}
        type="range"
        min={0}
        max={5}
        step={0.25}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={value === 0 ? 'No rating' : `${value} out of 5 stars`}
        className="absolute -inset-y-2 left-0 w-full cursor-pointer appearance-none bg-transparent opacity-0 outline-none disabled:pointer-events-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:appearance-none"
      />
    </span>
  );
}
