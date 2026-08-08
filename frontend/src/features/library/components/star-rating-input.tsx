import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';

import { cn } from '@/lib/utils';
import { STARS, starFillPercent } from '../utils/star-fill';

const STAR_SIZE = 32;

// The editable counterpart to StarRating. Same two stacked rows, same fill maths -- what
// this adds is a native range input laid over the whole row, which is what makes a
// quarter star reachable by mouse, by touch drag and by arrow key without any of that
// being written here. `step={0.25}` is the server's own increment, so the control cannot
// produce a value the API would reject.
//
// The range runs 0-5 rather than the API's 1-5 because the scale has to line up with the
// stars: at min={0} a value is exactly `value / 5` of the way across the track, which is
// the same fraction the fill overlay uses, so the rating lands where you clicked. Started
// at 1 the two would drift by most of a star. That leaves 0 reachable, which is the state
// the API spells `rating: null` -- dragging back to the far left clears the rating, and
// ReviewSheet translates it on the way out.
//
// The thumb is sized to nothing rather than hidden: a thumb with width insets the usable
// track by half of itself at each end, and that inset would bend the mapping above. The
// input is fully transparent, so the fill row underneath is the only thing you see move.
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
  // The width is an inline style rather than w-fit because it is load-bearing and has to
  // beat whatever the widget is dropped into: a vertical Field puts `*:w-full` on its
  // direct children, which stretches this box to the field's width while the stars stay
  // 160px. Both the range's track and the fill overlay are measured against this box, so
  // a stretched one detunes the whole control -- the track runs past the last star, and
  // the rating you can reach at the right-hand star is a fraction of 5.
  return (
    <span
      style={{ width: STARS.length * STAR_SIZE }}
      className={cn(
        'relative inline-flex rounded-lg has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        className
      )}
    >
      <span aria-hidden="true" className="flex text-muted-foreground/40">
        {STARS.map((i) => (
          <HugeiconsIcon
            key={i}
            icon={StarIcon}
            size={STAR_SIZE}
            fill="none"
            className="shrink-0"
          />
        ))}
      </span>

      {/* pointer-events-none so a click passes through to the range beneath it. */}
      <span
        aria-hidden="true"
        style={{ width: `${starFillPercent(value)}%` }}
        className="pointer-events-none absolute inset-y-0 left-0 flex overflow-hidden text-amber-500"
      >
        {STARS.map((i) => (
          <HugeiconsIcon
            key={i}
            icon={StarIcon}
            size={STAR_SIZE}
            fill="currentColor"
            className="shrink-0"
          />
        ))}
      </span>

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
