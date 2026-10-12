import { HugeiconsIcon } from '@hugeicons/react';
import { Fire02Icon } from '@hugeicons/core-free-icons';
import type { StreakRead } from '@/api/generated/readingTracker.schemas';

export function Streak({ data }: { data: StreakRead }) {
  const flameColor = data.logged_today ? 'text-orange-500' : '';
  return (
    <span
      className="inline-flex items-center justify-between gap-1"
      role="img"
      aria-label={`${data.count} day streak`}
    >
      <HugeiconsIcon className={flameColor} icon={Fire02Icon} />
      <span>{data.count}</span>
    </span>
  );
}
