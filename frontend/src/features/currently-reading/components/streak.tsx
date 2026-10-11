import { HugeiconsIcon } from '@hugeicons/react';
import { Fire02Icon } from '@hugeicons/core-free-icons';
import { useInsightsGetStreak } from '@/api/generated/insights/insights';
import { localIsoDate } from '@/utils/local-date';

export function Streak() {
  const date = localIsoDate();
  const { data, isPending, isError } = useInsightsGetStreak({ date });
  const flameColor = data?.logged_today ? 'text-orange-500' : '';
  return (
    <>
      {isPending || isError ? null : (
        <span
          className="inline-flex items-center justify-between gap-1"
          role="img"
          aria-label={`${data.count} day streak`}
        >
          <HugeiconsIcon className={flameColor} icon={Fire02Icon} />
          <span>{data.count}</span>
        </span>
      )}
    </>
  );
}
