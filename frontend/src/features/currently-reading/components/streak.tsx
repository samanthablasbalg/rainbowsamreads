import { HugeiconsIcon } from '@hugeicons/react';
import { Fire02Icon } from '@hugeicons/core-free-icons';
import { useInsightsGetStreak } from '@/api/generated/insights/insights';
import { localIsoDate } from '@/utils/local-date';

export function Streak() {
  const date = localIsoDate();
  const { data, isPending, isError } = useInsightsGetStreak({ date });
  return (
    <>
      {isPending || isError ? null : (
        <span role="img" aria-label={`${data.count} day streak`}>
          <HugeiconsIcon icon={Fire02Icon} />
          {data.count}
        </span>
      )}
    </>
  );
}
